// alerts.controller.js
import { sendAlertEmail } from "../utils/emailSender.js";
import { Log } from "../models/Log.js";
import { getMemoryAlerts } from "../utils/memoryLogStore.js";

export const getAlerts = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";
    const alerts = await Log.find({ tenantId, decision: { $ne: "allow" } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(alerts);
  } catch (error) {
    res.json(getMemoryAlerts(100, req.tenantId));
  }
};

export const triggerTestAlert = async (req, res) => {
  try {
    await sendAlertEmail(
      "Test Alert",
      "This is a test security alert from AI-WAF backend."
    );
    res.json({ message: "Test alert sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Alert failed to send" });
  }
};
