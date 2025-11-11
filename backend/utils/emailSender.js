// emailSender.js
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

export const sendAlertEmail = async (subject, message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: ENV.EMAIL_USER,
        pass: ENV.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: ENV.EMAIL_USER,
      to: ENV.EMAIL_USER,
      subject,
      text: message,
    });

    console.log("📧 Alert email sent successfully");
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
  }
};
