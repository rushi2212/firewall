// emailSender.js
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";
import dotenv from "dotenv";
dotenv.config();

export const sendAlertEmail = async (subject, message) => {
  try {
    if (!ENV.EMAIL_USER || !ENV.EMAIL_PASS || !ENV.ALERT_EMAIL_RECIPIENT) {
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: ENV.EMAIL_USER,
        pass: ENV.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: ENV.EMAIL_USER,
      to: ENV.ALERT_EMAIL_RECIPIENT,
      subject,
      text: message,
    });

    console.log("📧 Alert email sent successfully");
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
  }
};
