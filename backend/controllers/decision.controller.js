// decision.controller.js
import axios from "axios";
import { calculateThreatScore } from "../utils/scoreCalculator.js";
import { applyPolicy } from "../utils/policyManager.js";
import { Log } from "../models/Log.js";
import { sendAlertEmail } from "../utils/emailSender.js";

export const analyzeRequest = async (req, res) => {
  try {
    const { payload, ip, ua } = req.body;
    console.log(req.body);

    // Step 1: extract features (tokens, entropy, geo, reputation)
    const featureRes = await axios.post(
      "http://localhost:8000/feature/extract_features",
      { payload, ip, ua }
    );

    // Step 2: call the models that accept the raw payload in parallel
    const calls = [
      // BILSTM payload detector
      axios.post("http://localhost:8000/bilstm/predict", { text: payload }),
      // XSS detector
      axios.post("http://localhost:8000/xss/predict", { payload }),
    ];

    // If the incoming request provided a TrafficFlow-like `flow` object, use it
    // to call the bot prediction endpoints. Otherwise skip bot calls (can't
    // invent network features from a payload string).
    let hasFlow = false;
    const flow = req.body.flow;
    if (flow && typeof flow === "object") {
      hasFlow = true;
      // supervised and unsupervised bot endpoints expect the same TrafficFlow schema
      calls.push(
        axios.post("http://localhost:8000/bot/predict/supervised", flow)
      );
      calls.push(
        axios.post("http://localhost:8000/bot/predict/unsupervised", flow)
      );
    }

    // If behaviour sessions are provided, call behaviour endpoint
    let hasSessions = false;
    if (req.body.sessions && Array.isArray(req.body.sessions)) {
      hasSessions = true;
      calls.push(
        axios.post("http://localhost:8000/behaviour/predict", {
          sessions: req.body.sessions,
        })
      );
    }

    const settled = await Promise.allSettled(calls);

    // Map responses to numeric scores (0..1). Be defensive with response shapes.
    // settled[0] -> bilstm, settled[1] -> xss, next -> optional bot supervised, bot unsupervised, behaviour
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
      bilRes && bilRes.status === "fulfilled" && bilRes.value?.data?.results
        ? bilRes.value.data.results[0].confidence ?? 0
        : 0;

    const xssScore =
      xssRes &&
      xssRes.status === "fulfilled" &&
      xssRes.value?.data?.prob_malicious
        ? xssRes.value.data.prob_malicious
        : 0;

    const botScore =
      botSuperRes && botSuperRes.status === "fulfilled"
        ? botSuperRes.value?.data?.confidence ?? 0
        : botIsoRes && botIsoRes.status === "fulfilled"
        ? botIsoRes.value?.data?.confidence ?? 0
        : 0;

    const behaviorScore =
      behRes && behRes.status === "fulfilled" && behRes.value?.data?.predictions
        ? behRes.value.data.predictions[0].probability ?? 0
        : 0;

    const results = {
      payload: Number(payloadScore) || 0,
      bot: Number(botScore) || 0,
      ddos: Number(botScore) || 0,
      behavior: Number(behaviorScore) || 0,
      xss: Number(xssScore) || 0,
      features: featureRes.data || {},
    };

    const threatScore = calculateThreatScore(results);
    let decision = applyPolicy(threatScore);

    // Override policy: if any single model reports a very high confidence,
    // block immediately. This prevents a single critical signal from being
    // averaged out by other low scores. Threshold chosen conservatively.
    const OVERRIDE_THRESHOLD = 0.9;
    const modelScores = {
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
    let overrideReason = null;
    if (topScore >= OVERRIDE_THRESHOLD) {
      decision = "block";
      overrideReason = { model: topModel, score: topScore };
    }

    // Log to DB
    const log = await Log.create({
      ip,
      payload,
      prediction: results,
      threatScore,
      decision,
      override: overrideReason,
    });

    // If alert/block, notify admin
    if (decision !== "allow") {
      let subject = `Threat Alert: ${decision.toUpperCase()}`;
      let body = `Suspicious activity detected from ${ip} with score ${threatScore}`;
      if (overrideReason) {
        body += ` -- immediate block due to ${overrideReason.model} (score=${overrideReason.score})`;
      }
      await sendAlertEmail(subject, body);
    }

    res.json({ log, decision });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
