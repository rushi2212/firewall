// policyManager.js
import fs from "fs";
import { ENV } from "../config/env.js";

export const applyPolicy = (score) => {
  try {
    const policy = JSON.parse(fs.readFileSync(ENV.POLICY_PATH));
    if (score >= policy.block_threshold) return "block";
    if (score >= policy.alert_threshold) return "alert";
    return "allow";
  } catch (err) {
    console.error("Policy load failed:", err);
    return "allow";
  }
};

// Example policy.json content:
/*
{
  "block_threshold": 0.75,
  "alert_threshold": 0.5
}
*/
