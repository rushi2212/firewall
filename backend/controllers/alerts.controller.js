// alerts.controller.js
import { sendAlertEmail } from "../utils/emailSender.js";

export const triggerTestAlert = async (req, res) => {
  try {
    await sendAlertEmail("Test Alert", "This is a test security alert from AI-WAF backend.");
    res.json({ message: "Test alert sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Alert failed to send" });
  }
};
