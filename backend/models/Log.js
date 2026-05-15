// Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: "default", index: true },
    ip: String,
    method: String,
    path: String,
    ua: String,
    referer: String,
    payload: String,
    payloadHash: String,
    prediction: Object,
    detectorErrors: [Object],
    threatScore: Number,
    decision: { type: String, enum: ["allow", "block", "alert"], default: "allow" },
    effectiveDecision: { type: String, enum: ["allow", "block", "alert"], default: "allow" },
    override: Object,
    // DDoS tracking fields
    isDdos: { type: Boolean, default: false },
    ddosDetails: {
      rps: Number,
      isWhitelisted: Boolean,
      isCurrentlyBlocked: Boolean,
      ddosTriggeredAt: Date,
      totalRequests: Number,
      firstSeenAt: Date,
      threshold: Number,
    },
    // Additional request details for DDoS logging
    requestDetails: {
      timestamp: Date,
      headers: Object,
      cookies: Object,
      contentLength: Number,
      contentType: String,
    },
  },
  { timestamps: true }
);

logSchema.index({ tenantId: 1, createdAt: -1 });
logSchema.index({ tenantId: 1, decision: 1, createdAt: -1 });
logSchema.index({ tenantId: 1, ip: 1, createdAt: -1 });
logSchema.index({ tenantId: 1, isDdos: 1, createdAt: -1 });
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Log = mongoose.model("Log", logSchema);
