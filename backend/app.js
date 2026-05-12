// app.js
import express from "express";
import cors from "cors";
import decisionRoutes from "./routes/decision.routes.js";
import logsRoutes from "./routes/logs.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import proxyRoutes from "./routes/proxy.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { corsOptions, securityHeaders } from "./middleware/security.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import { ENV } from "./config/env.js";
import path from "path"; // Import path module
import { fileURLToPath } from "url"; // Needed for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: ENV.BODY_LIMIT || "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ai-waf-backend" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "ai-waf-backend" });
});

app.use(
  "/api/auth",
  createRateLimiter({
    keyPrefix: "auth",
    max: Number(ENV.AUTH_RATE_LIMIT_MAX || 10),
    keyGenerator: (req) => `${req.ip || "unknown"}:${req.body?.username || "unknown"}`,
  }),
  authRoutes
);

app.use("/api", createRateLimiter());
app.use("/api", authMiddleware);

app.use("/api/decision", decisionRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/reports", reportsRoutes);

app.use(express.static(path.join(__dirname, "../frontend", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
});
export default app;
