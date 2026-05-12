// decision.controller.js
import axios from "axios";
import { calculateThreatScore } from "../utils/scoreCalculator.js";
import { getPolicyForTenant } from "../utils/policyStore.js";
import { Log } from "../models/Log.js";
import { sendAlertEmail } from "../utils/emailSender.js";
import { publishLogEvent } from "../utils/logStream.js";
import { computeDdosScore, recordRequest } from "../utils/trafficMonitor.js";
import { addMemoryLog } from "../utils/memoryLogStore.js";
import { ENV } from "../config/env.js";
import { redactPayload } from "../utils/redactPayload.js";
import { evaluateWafRules } from "../utils/wafRules.js";

const fastApiBaseUrl = String(ENV.FASTAPI_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);
const fastApi = axios.create({
  baseURL: fastApiBaseUrl,
  timeout: Number(ENV.FASTAPI_TIMEOUT_MS || 750),
  headers: ENV.FASTAPI_INTERNAL_TOKEN
    ? { "x-internal-token": ENV.FASTAPI_INTERNAL_TOKEN }
    : {},
});
const failClosedOnDetectorError =
  String(ENV.FAIL_CLOSED_ON_DETECTOR_ERROR || "").toLowerCase() === "true";

const toStringPayload = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const detectorCall = async (name, request) => {
  const startedAt = Date.now();
  try {
    const response = await request();
    return {
      name,
      ok: true,
      data: response.data,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      data: null,
      latencyMs: Date.now() - startedAt,
      error: error.code || error.message || "detector_failed",
    };
  }
};

const isBotAttack = (data, modelType) => {
  const label = String(data?.prediction_label || "").toLowerCase();
  if (label.includes("bot") || label.includes("attack")) return true;
  if (modelType === "iso") return data?.prediction === -1;
  return data?.prediction === 1;
};

const botThreatScore = (data, modelType) => {
  if (!data || !isBotAttack(data, modelType)) return 0;
  const confidence = Number(data.confidence || 0);
  if (modelType === "iso") return Math.max(0, Math.min(1, confidence));
  return Math.max(0, Math.min(1, confidence));
};

export const analyzePayload = async ({
  payload,
  ua,
  method,
  path,
  referer,
  ip,
  flow,
  sessions,
  tenantId = "default",
}) => {
  const rawPayload = toStringPayload(payload);
  const { redacted, hash } = redactPayload(rawPayload);
  const rules = evaluateWafRules(rawPayload);

  const traffic = recordRequest(ip);
  const ddosScore = computeDdosScore(traffic.rps);

  let featureData = {};
  const detectorStatus = [];
  const featureRes = await detectorCall("features", () =>
    fastApi.post("/feature/extract_features", { payload: rawPayload, ip, ua })
  );
  detectorStatus.push(featureRes);
  if (featureRes.ok) {
    featureData = featureRes.data || {};
  }

  const calls = [
    detectorCall("bilstm", () => fastApi.post("/bilstm/predict", { text: rawPayload })),
    detectorCall("xss", () => fastApi.post("/xss/predict", { payload: rawPayload })),
  ];

  let hasFlow = false;
  if (flow && typeof flow === "object") {
    hasFlow = true;
    calls.push(detectorCall("bot_supervised", () => fastApi.post("/bot/predict/supervised", flow)));
    calls.push(detectorCall("bot_unsupervised", () => fastApi.post("/bot/predict/unsupervised", flow)));
  }

  let hasSessions = false;
  if (sessions && Array.isArray(sessions)) {
    hasSessions = true;
    calls.push(
      detectorCall("behaviour", () => fastApi.post("/behaviour/predict", { sessions }))
    );
  }

  const settled = await Promise.all(calls);
  detectorStatus.push(...settled);

  const bilIdx = 0;
  const xssIdx = 1;
  const botSuperIdx = hasFlow ? 2 : null;
  const botIsoIdx = hasFlow ? 3 : null;
  const behIdx = hasFlow ? (hasSessions ? 4 : 3) : hasSessions ? 2 : null;

  const bilRes = settled[bilIdx];
  const xssRes = settled[xssIdx];
  const botSuperRes = botSuperIdx !== null ? settled[botSuperIdx] : null;
  const botIsoRes = botIsoIdx !== null ? settled[botIsoIdx] : null;
  const behRes = behIdx !== null ? settled[behIdx] : null;

  const payloadScore =
    bilRes && bilRes.ok && bilRes.data?.results
      ? bilRes.data.results[0].confidence ?? 0
      : 0;

  const xssScore =
    xssRes &&
    xssRes.ok &&
    xssRes.data?.prob_malicious !== undefined
      ? xssRes.data.prob_malicious
      : 0;

  const botSuperScore =
    botSuperRes && botSuperRes.ok ? botThreatScore(botSuperRes.data, "rf") : 0;
  const botIsoScore =
    botIsoRes && botIsoRes.ok ? botThreatScore(botIsoRes.data, "iso") : 0;
  const botScore = Math.max(botSuperScore, botIsoScore);

  const behaviorScore =
    behRes && behRes.ok && behRes.data?.predictions
      ? behRes.data.predictions[0].probability ?? 0
      : 0;

  const detectorErrors = detectorStatus
    .filter((item) => !item.ok)
    .map(({ name, error, latencyMs }) => ({ name, error, latencyMs }));

  const results = {
    rules: Number(rules.score) || 0,
    payload: Number(payloadScore) || 0,
    bot: Number(botScore) || 0,
    ddos: Number(ddosScore) || 0,
    behavior: Number(behaviorScore) || 0,
    xss: Number(xssScore) || 0,
    features: featureData || {},
    ruleMatches: rules.matches,
    detectorStatus: detectorStatus.map(({ name, ok, latencyMs, error }) => ({
      name,
      ok,
      latencyMs,
      ...(error ? { error } : {}),
    })),
    traffic,
  };

  const threatScore = calculateThreatScore(results);
  const policy = await getPolicyForTenant(tenantId);

  let decision = "allow";
  if (threatScore >= policy.blockThreshold) decision = "block";
  else if (threatScore >= policy.alertThreshold) decision = "alert";

  let overrideReason = null;
  if (rules.score >= policy.overrideThreshold) {
    decision = "block";
    overrideReason = { model: "rules", score: rules.score, matches: rules.matches };
  }

  if (detectorErrors.length > 0 && failClosedOnDetectorError) {
    decision = "block";
    overrideReason = {
      model: "detector_health",
      score: 1,
      errors: detectorErrors,
    };
  }

  const modelScores = {
    rules: results.rules,
    payload: results.payload,
    bot: results.bot,
    ddos: results.ddos,
    behavior: results.behavior,
    xss: results.xss,
  };
  const topModel = Object.keys(modelScores).reduce((a, b) =>
    modelScores[a] >= modelScores[b] ? a : b
  );
  const topScore = Number(modelScores[topModel] || 0);
  if (!overrideReason && topScore >= policy.overrideThreshold) {
    decision = "block";
    overrideReason = { model: topModel, score: topScore };
  }

  const shadowMode = policy.shadowMode;
  const effectiveDecision = shadowMode && decision === "block" ? "alert" : decision;

  let log;
  try {
    log = await Log.create({
      tenantId,
      ip,
      method,
      path,
      ua,
      referer,
      payload: redacted,
      payloadHash: hash,
      prediction: results,
      threatScore,
      decision,
      effectiveDecision,
      override: overrideReason,
      detectorErrors,
    });
  } catch (e) {
    log = addMemoryLog({
      tenantId,
      ip,
      method,
      path,
      ua,
      referer,
      payload: redacted,
      payloadHash: hash,
      prediction: results,
      threatScore,
      decision,
      effectiveDecision,
      override: overrideReason,
      detectorErrors,
    });
  }

  publishLogEvent(log);

  if (decision !== "allow") {
    let subject = `Threat Alert: ${decision.toUpperCase()}`;
    let body = `Suspicious activity detected from ${ip} with score ${threatScore}`;
    if (overrideReason) {
      body += ` -- immediate block due to ${overrideReason.model} (score=${overrideReason.score})`;
    }
    setImmediate(() => {
      sendAlertEmail(subject, body);
    });
  }

  return { log, decision, effectiveDecision, shadowMode, traffic };
};

export const analyzeRequest = async (req, res) => {
  try {
    const payload = req.body?.payload;
    const ua =
      req.body?.ua ||
      req.headers["user-agent"] ||
      req.headers["User-Agent"] ||
      "";

    const method = req.body?.method || req.method;
    const path = req.body?.path || req.originalUrl || req.path;
    const referer = req.body?.referer || req.headers?.referer || req.headers?.referrer || "";

    const forwardedFor = req.headers["x-forwarded-for"];
    const headerIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]
      : null;

    const ip = req.body?.ip || headerIp || req.ip || "unknown";
    const tenantId = req.tenantId || "default";

    const { log, decision, effectiveDecision, traffic } = await analyzePayload({
      payload,
      ua,
      method,
      path,
      referer,
      ip,
      flow: req.body?.flow,
      sessions: req.body?.sessions,
      tenantId,
    });

    // Update log with DDoS and request details
    if (log && traffic) {
      log.isDdos = traffic.isDdos;
      log.ddosDetails = {
        rps: traffic.rps,
        isWhitelisted: traffic.isWhitelisted,
        isCurrentlyBlocked: traffic.isCurrentlyBlocked,
        ddosTriggeredAt: traffic.ddosTriggeredAt ? new Date(traffic.ddosTriggeredAt) : null,
        totalRequests: traffic.totalRequests,
        firstSeenAt: traffic.firstSeenAt ? new Date(traffic.firstSeenAt) : null,
        threshold: traffic.threshold,
      };
      log.requestDetails = {
        timestamp: new Date(),
        headers: {
          userAgent: ua,
          referer: referer,
          contentType: req.headers["content-type"],
        },
        contentLength: req.headers["content-length"],
      };
      await log.save();
    }

    // Check if this is a DDoS attack and we should block immediately
    const isDdosBlocked = traffic?.isDdos && traffic?.isCurrentlyBlocked && !traffic?.isWhitelisted;
    const finalDecision = isDdosBlocked ? "block" : decision;
    const finalEffectiveDecision = isDdosBlocked ? "block" : effectiveDecision;

    res.json({ 
      log, 
      decision: finalDecision, 
      effectiveDecision: finalEffectiveDecision,
      ddosDetected: traffic?.isDdos,
      ddosStatus: traffic ? {
        rps: traffic.rps,
        threshold: traffic.threshold,
        isWhitelisted: traffic.isWhitelisted,
        isCurrentlyBlocked: traffic.isCurrentlyBlocked,
      } : null,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
