import axios from "axios";
import { ENV } from "../config/env.js";

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const allowedDecisions = new Set(["allow", "alert", "block"]);
const groqModel = ENV.GROQ_MODEL || "llama-3.1-8b-instant";
const groqTimeoutMs = Number(ENV.GROQ_TIMEOUT_MS || 2500);

const trimPayload = (payload = "") => {
  const value = String(payload || "");
  const maxChars = Number(ENV.GROQ_PAYLOAD_MAX_CHARS || 6000);
  return value.length > maxChars
    ? `${value.slice(0, maxChars)}\n[truncated ${value.length - maxChars} chars]`
    : value;
};

const extractJson = (text = "") => {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Groq response did not contain JSON");
    return JSON.parse(match[0]);
  }
};

const normalizeDecision = (value = {}) => {
  const decision = String(value.decision || "").toLowerCase();
  if (!allowedDecisions.has(decision)) {
    throw new Error(`Groq returned invalid decision: ${value.decision}`);
  }

  const reasons = Array.isArray(value.reasons)
    ? value.reasons.map((reason) => String(reason)).filter(Boolean).slice(0, 5)
    : [String(value.reason || "Groq reviewed the request context.")];
  const analysis = value.analysis && typeof value.analysis === "object" ? value.analysis : {};
  const toStringList = (items) =>
    Array.isArray(items) ? items.map((item) => String(item)).filter(Boolean).slice(0, 6) : [];

  return {
    decision,
    confidence: Math.round(clamp01(value.confidence) * 100) / 100,
    primarySignal: String(value.primarySignal || value.primary_signal || "groq"),
    reasons,
    analysis: {
      summary: String(analysis.summary || value.summary || reasons[0] || ""),
      evidence: toStringList(analysis.evidence),
      riskFactors: toStringList(analysis.riskFactors || analysis.risk_factors),
      benignFactors: toStringList(analysis.benignFactors || analysis.benign_factors),
      scoreInterpretation: String(
        analysis.scoreInterpretation || analysis.score_interpretation || ""
      ),
      payloadInterpretation: String(
        analysis.payloadInterpretation || analysis.payload_interpretation || ""
      ),
      recommendedAction: String(
        analysis.recommendedAction || analysis.recommended_action || ""
      ),
    },
    override: value.override && typeof value.override === "object" ? value.override : null,
    source: "groq",
  };
};

const buildGroqPrompt = ({
  payload = "",
  ip = "unknown",
  scores = {},
  threatScore = 0,
  ruleMatches = [],
  detectorErrors = [],
  detectorStatus = [],
  traffic = null,
  policy = {},
  policyOverride = null,
  failClosedOnDetectorError = false,
  request = {},
}) => {
  const context = {
    ip,
    request,
    payload: trimPayload(payload),
    scores,
    threatScore,
    ruleMatches,
    detectorErrors,
    detectorStatus,
    traffic,
    policy: {
      blockThreshold: policy.blockThreshold,
      alertThreshold: policy.alertThreshold,
      overrideThreshold: policy.overrideThreshold,
      shadowMode: policy.shadowMode,
      allowIps: policy.allowIps,
      blockIps: policy.blockIps,
    },
    policyOverride,
    failClosedOnDetectorError,
  };

  return [
    "You are the decision engine for an AI web application firewall.",
    "Decide whether this HTTP request should be allowed, alerted, or blocked.",
    "Use the IP, payload, all model/rule/DDOS scores, detector health, traffic information, and policy context.",
    "Do not simply copy the highest rule severity as confidence. Confidence must represent how certain you are in the final decision after comparing every signal.",
    "Give a detailed security analysis that explains the payload semantics, concrete evidence, risk factors, possible benign interpretation, score meaning, and recommended action.",
    "Return ONLY valid JSON with this exact shape:",
    '{"decision":"allow|alert|block","confidence":0.0,"primarySignal":"short_signal","reasons":["short reason"],"analysis":{"summary":"2-3 sentence decision rationale","evidence":["specific payload or score evidence"],"riskFactors":["why this may be malicious"],"benignFactors":["why it could be legitimate or low risk"],"scoreInterpretation":"how the supplied scores affected the decision","payloadInterpretation":"what the payload appears to be doing","recommendedAction":"what the WAF/operator should do next"},"override":null}',
    "Do not include markdown. Keep every explanation specific to the supplied request.",
    `Request context:\n${JSON.stringify(context, null, 2)}`,
  ].join("\n\n");
};

const strongestScore = (scores = {}) =>
  Object.entries(scores).reduce(
    (best, [name, value]) => {
      const score = Number(value) || 0;
      return score > best.score ? { name, score } : best;
    },
    { name: "none", score: 0 }
  );

const buildLocalFallbackDecision = ({
  payload = "",
  threatScore = 0,
  policy = {},
  scores = {},
  ruleMatches = [],
  detectorErrors = [],
}) => {
  const blockThreshold = Number(policy.blockThreshold ?? 0.75);
  const alertThreshold = Number(policy.alertThreshold ?? 0.5);
  const score = Number(threatScore || scores.rules || scores.payload || 0);
  const topSignal = strongestScore(scores);
  const matchedRules = ruleMatches.map((match) => `${match.category}:${match.id}`);
  const payloadPreview = String(payload || "").slice(0, 160);

  if (score >= blockThreshold) {
    return {
      decision: "block",
      primarySignal: "local_fallback_high_threat",
      reasons: ["Local fallback blocked the request based on the threat score."],
      analysis: {
        summary:
          "Groq was unavailable, so the local fallback used the supplied detector scores. The request exceeded the block threshold and should be treated as malicious until reviewed.",
        evidence: [
          `Threat score ${Math.round(score * 100)}% met block threshold ${Math.round(
            blockThreshold * 100
          )}%.`,
          `Strongest signal was ${topSignal.name} at ${Math.round(topSignal.score * 100)}%.`,
          ...matchedRules.slice(0, 3),
        ],
        riskFactors: matchedRules.length
          ? matchedRules
          : ["High combined detector score without a successful AI review."],
        benignFactors: ["Groq did not review the request, so context may be incomplete."],
        scoreInterpretation:
          "The fallback compares the combined threat score against configured policy thresholds.",
        payloadInterpretation: payloadPreview || "No payload text was available.",
        recommendedAction: "Block the request and review the matched signals in the log.",
      },
    };
  }

  if (score >= alertThreshold) {
    return {
      decision: "alert",
      primarySignal: "local_fallback_medium_threat",
      reasons: ["Local fallback flagged the request for review based on the threat score."],
      analysis: {
        summary:
          "Groq was unavailable, so the local fallback used the supplied detector scores. The request crossed the alert threshold but did not reach the block threshold.",
        evidence: [
          `Threat score ${Math.round(score * 100)}% met alert threshold ${Math.round(
            alertThreshold * 100
          )}%.`,
          `Strongest signal was ${topSignal.name} at ${Math.round(topSignal.score * 100)}%.`,
          ...matchedRules.slice(0, 3),
        ],
        riskFactors: matchedRules.length
          ? matchedRules
          : ["Medium combined detector score without a successful AI review."],
        benignFactors: ["The score did not reach the configured block threshold."],
        scoreInterpretation:
          "The fallback compares the combined threat score against configured policy thresholds.",
        payloadInterpretation: payloadPreview || "No payload text was available.",
        recommendedAction: "Allow in shadow mode or alert an operator for review.",
      },
    };
  }

  return {
    decision: "allow",
    primarySignal: "local_fallback_low_threat",
    reasons: ["Local fallback allowed the request because the threat score stayed low."],
    analysis: {
      summary:
        "Groq was unavailable, so the local fallback used the supplied detector scores. The request stayed below the alert threshold.",
      evidence: [
        `Threat score ${Math.round(score * 100)}% stayed below alert threshold ${Math.round(
          alertThreshold * 100
        )}%.`,
        `Strongest signal was ${topSignal.name} at ${Math.round(topSignal.score * 100)}%.`,
      ],
      riskFactors: detectorErrors.length
        ? [`${detectorErrors.length} detector error(s) were present.`]
        : [],
      benignFactors: ["No score crossed the configured alert threshold."],
      scoreInterpretation:
        "The fallback compares the combined threat score against configured policy thresholds.",
      payloadInterpretation: payloadPreview || "No payload text was available.",
      recommendedAction: "Allow the request and keep the log for audit history.",
    },
  };
};

const callGroq = async (prompt) => {
  if (!ENV.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: groqModel,
      messages: [
        {
          role: "system",
          content: "You are a strict JSON API for web application firewall decisions.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    },
    {
      timeout: groqTimeoutMs,
      headers: {
        Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response");
  return extractJson(text);
};

export const makeAiDecision = async ({
  payload = "",
  ip = "unknown",
  scores = {},
  threatScore = 0,
  ruleMatches = [],
  detectorErrors = [],
  detectorStatus = [],
  traffic = null,
  policy = {},
  policyOverride = null,
  failClosedOnDetectorError = false,
  request = {},
  groqDecision = null,
}) => {
  const prompt = buildGroqPrompt({
    payload,
    ip,
    scores,
    threatScore,
    ruleMatches,
    detectorErrors,
    detectorStatus,
    traffic,
    policy,
    policyOverride,
    failClosedOnDetectorError,
    request,
  });

  try {
    const rawDecision = groqDecision ? await groqDecision(prompt) : await callGroq(prompt);
    return {
      ...normalizeDecision(rawDecision),
      promptContext: {
        model: groqModel,
        ip,
        scores,
        threatScore,
      },
    };
  } catch {
    const fallback = buildLocalFallbackDecision({
      payload,
      threatScore,
      policy,
      scores,
      ruleMatches,
      detectorErrors,
    });
    return {
      decision: fallback.decision,
      confidence: 0.5,
      primarySignal: fallback.primarySignal,
      reasons: fallback.reasons,
      analysis: fallback.analysis,
      override: null,
      source: "local_fallback",
      promptContext: {
        model: groqModel,
        ip,
        scores,
        threatScore,
      },
    };
  }
};
