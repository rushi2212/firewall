// Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    ip: String,
    method: String,
    path: String,
    ua: String,
    referer: String,
    payload: String,
    prediction: Object,
    threatScore: Number,
    decision: { type: String, enum: ["allow", "block", "alert"], default: "allow" },
    override: Object,
  },
  { timestamps: true }
);

export const Log = mongoose.model("Log", logSchema);
