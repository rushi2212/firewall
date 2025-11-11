// Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    ip: String,
    payload: String,
    prediction: Object,
    threatScore: Number,
    decision: { type: String, enum: ["allow", "block", "alert"], default: "allow" },
  },
  { timestamps: true }
);

export const Log = mongoose.model("Log", logSchema);
