import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    blockThreshold: { type: Number, default: 0.75 },
    alertThreshold: { type: Number, default: 0.5 },
    overrideThreshold: { type: Number, default: 0.9 },
    shadowMode: { type: Boolean, default: false },
    allowIps: { type: [String], default: [] },
    blockIps: { type: [String], default: [] },
  },
  { timestamps: true }
);

policySchema.index({ tenantId: 1 }, { unique: true });

export const Policy = mongoose.model("Policy", policySchema);
