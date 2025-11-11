// decision.controller.js
import axios from "axios";
import { calculateThreatScore } from "../utils/scoreCalculator.js";
import { applyPolicy } from "../utils/policyManager.js";
import { Log } from "../models/Log.js";
import { sendAlertEmail } from "../utils/emailSender.js";

export const analyzeRequest = async (req, res) => {
  try {
    const { payload, ip, ua } = req.body;

    // Send payload to the combined FastAPI service (see FastApi/app.py and ENDPOINTS.md)
    // Note: request body shapes expected by each FastAPI endpoint may differ from
    // the original microservices. We keep the original variables here but you
    // should harmonize payloads (see comments below) if requests fail with 422.
    const [payloadRes, botRes, ddosRes, behaviorRes] = await Promise.allSettled(
      [
        // BILSTM payload detector: expects { text: string } or { text: [str] }
        axios.post("http://localhost:8000/bilstm/predict", { text: payload }),

        // Bot detection (unsupervised): original service accepted { ip },
        // but FastAPI expects a TrafficFlow object. We're forwarding ip for now;
        // consider calling /feature/extract_features first and building a
        // TrafficFlow from its output before calling /bot endpoints.
        axios.post("http://localhost:8000/bot/predict/unsupervised", { ip }),

        // DDoS detector proxy: map to supervised bot endpoint for now.
        axios.post("http://localhost:8000/bot/predict/supervised", { ip }),

        // Behaviour/profile: use the feature-extractor which accepts { payload, ip, ua }
        axios.post("http://localhost:8000/feature/extract_features", {
          payload,
          ip,
          ua,
        }),
      ]
    );

    const results = {
      payload: payloadRes.value?.data?.score || 0,
      bot: botRes.value?.data?.score || 0,
      ddos: ddosRes.value?.data?.score || 0,
      behavior: behaviorRes.value?.data?.score || 0,
    };

    const threatScore = calculateThreatScore(results);
    const decision = applyPolicy(threatScore);

    // Log to DB
    const log = await Log.create({
      ip,
      payload,
      prediction: results,
      threatScore,
      decision,
    });

    // If alert/block, notify admin
    if (decision !== "allow") {
      await sendAlertEmail(
        `Threat Alert: ${decision.toUpperCase()}`,
        `Suspicious activity detected from ${ip} with score ${threatScore}`
      );
    }

    res.json({ log, decision });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
