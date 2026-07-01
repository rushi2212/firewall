// app.js
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import decisionRoutes from "./routes/decision.routes.js";
import logsRoutes from "./routes/logs.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import proxyRoutes from "./routes/proxy.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { Log } from "./models/Log.js";
import { authMiddleware } from "./middleware/auth.js";
import { corsOptions, securityHeaders } from "./middleware/security.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import { ENV } from "./config/env.js";
import { publishLogEvent } from "./utils/logStream.js";
import { addMemoryLog } from "./utils/memoryLogStore.js";
import { computeDdosScore, recordRequest } from "./utils/trafficMonitor.js";
import path from "path"; // Import path module
import { fileURLToPath } from "url"; // Needed for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: ENV.BODY_LIMIT || "1mb" }));
let presentationSimulationRunning = false;

const getRequestIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const createPresentationLog = (req, decision, traffic) => {
  const tenantId = req.tenantId || req.headers["x-tenant-id"] || "default";
  const ddosScore = computeDdosScore(traffic?.rps || 0);
  const logDoc = {
    tenantId,
    ip: getRequestIp(req),
    method: req.method,
    path: req.originalUrl || req.path || "/presentation",
    ua: req.headers["user-agent"] || "",
    referer: req.headers["referer"] || req.headers["referrer"] || "",
    payload: "",
    payloadHash: "",
    prediction: {
      ddos: ddosScore,
      traffic: {
        rps: traffic?.rps || 0,
        windowMs: traffic?.windowMs || 0,
        totalRequests: traffic?.totalRequests || 0,
        threshold: traffic?.threshold || 0,
        graceRequests: traffic?.graceRequests || 0,
      },
    },
    threatScore: ddosScore,
    decision,
    effectiveDecision: decision,
    isDdos: !!traffic?.isDdos,
    ddosDetails: {
      rps: traffic?.rps || 0,
      isWhitelisted: !!traffic?.isWhitelisted,
      isCurrentlyBlocked: !!traffic?.isCurrentlyBlocked,
      ddosTriggeredAt: traffic?.ddosTriggeredAt ? new Date(traffic.ddosTriggeredAt) : null,
      totalRequests: traffic?.totalRequests || 0,
      firstSeenAt: traffic?.firstSeenAt ? new Date(traffic.firstSeenAt) : null,
      threshold: traffic?.threshold || 0,
      graceRequests: traffic?.graceRequests || 0,
    },
    requestDetails: {
      timestamp: new Date(),
      headers: {
        userAgent: req.headers["user-agent"] || "",
        referer: req.headers["referer"] || req.headers["referrer"] || "",
        contentType: req.headers["content-type"] || "",
      },
      contentLength: req.headers["content-length"] || 0,
    },
  };

  const liveLog = addMemoryLog(logDoc);
  publishLogEvent(liveLog);

  if (Log.db.readyState === 1) {
    Log.create(logDoc)
      .catch((error) =>
        console.error("Failed to create presentation log:", error.message),
      );
  }
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ai-waf-backend" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "ai-waf-backend" });
});

app.post("/api/presentation/simulate", (req, res) => {
  if (presentationSimulationRunning) {
    return res.status(409).json({
      error: "Presentation DDoS simulation is already running",
    });
  }

  const pythonCommand = ENV.DDOS_SIMULATOR_PYTHON || "python";
  const scriptPath = path.join(__dirname, "../ddostest/strongddos.py");
  const child = spawn(pythonCommand, [scriptPath], {
    cwd: path.dirname(scriptPath),
    shell: process.platform === "win32",
    detached: true,
    stdio: "ignore",
  });

  presentationSimulationRunning = true;

  child.unref();

  child.on("error", (error) => {
    presentationSimulationRunning = false;
    console.error("Failed to start presentation simulator:", error.message);
  });

  child.on("close", (code) => {
    presentationSimulationRunning = false;
    if (code !== 0) {
      console.error(`Presentation simulator exited with code ${code}`);
    }
  });

  return res.status(202).json({
    status: "started",
    message: "Presentation DDoS simulation started",
  });
});

app.use(
  "/api/auth",
  createRateLimiter({
    keyPrefix: "auth",
    max: Number(ENV.AUTH_RATE_LIMIT_MAX || 10),
    keyGenerator: (req) =>
      `${req.ip || "unknown"}:${req.body?.username || "unknown"}`,
  }),
  authRoutes,
);

app.use("/api", createRateLimiter());
app.use("/api", authMiddleware);

app.use("/api/decision", decisionRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/reports", reportsRoutes);

app.use("/presentation", (req, res, next) => {
  const traffic = recordRequest(getRequestIp(req));

  if (traffic.shouldBlock) {
    createPresentationLog(req, "block", traffic);
    return res.status(429).json({
      error: "DDoS rate limit exceeded",
      message: "Too many requests from the same IP in a short time window",
      retryAfterSeconds: Math.ceil(
        (traffic.ddosTriggeredAt + Number(ENV.DDOS_BLOCK_DURATION_MS || 15000) - Date.now()) / 1000,
      ),
    });
  }

  if (req.method === "GET") {
    createPresentationLog(req, "allow", traffic);
  }

  next();
});

app.use(express.static(path.join(__dirname, "../frontend", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
});
export default app;
