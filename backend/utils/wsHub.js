import { WebSocket, WebSocketServer } from "ws";
import { Log } from "../models/Log.js";
import { getMemoryLogs, getMemoryLogStats } from "./memoryLogStore.js";
import { getDdosStats } from "./trafficMonitor.js";
import { verifyDashboardToken } from "./dashboardAuth.js";
import { ENV } from "../config/env.js";

const clients = new Set();

const parseTenantId = (req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get("tenantId") || "default";
  } catch {
    return "default";
  }
};

const isAuthRequired = () => ENV.NODE_ENV === "production";

const validateConnection = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (!token) {
    return isAuthRequired() ? { ok: false } : { ok: true, tenantId: parseTenantId(req) };
  }
  const user = verifyDashboardToken(token);
  if (!user) return { ok: false };
  return { ok: true, tenantId: user.tenantId || parseTenantId(req) };
};

const getDbLogs = async (tenantId, limit) => {
  const logs = await Log.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit);
  return logs;
};

const getDbStats = async (tenantId) => {
  const total = await Log.countDocuments({ tenantId });
  const grouped = await Log.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $toLower: { $ifNull: ["$decision", ""] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = { allowed: 0, blocked: 0, alerted: 0 };
  for (const row of grouped) {
    const key = row._id;
    if (key === "allow" || key === "allowed") counts.allowed += row.count;
    else if (key === "block" || key === "blocked") counts.blocked += row.count;
    else if (key === "alert" || key === "alerted") counts.alerted += row.count;
  }

  return { total, ...counts };
};

const buildSnapshot = async (tenantId) => {
  try {
    const logs = await getDbLogs(tenantId, 500);
    const stats = await getDbStats(tenantId);
    return { logs, stats, ddosStats: getDdosStats() };
  } catch {
    return {
      logs: getMemoryLogs(500, tenantId),
      stats: getMemoryLogStats(tenantId),
      ddosStats: getDdosStats(),
    };
  }
};

const send = (ws, payload) => {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
};

export const initWebSocketHub = (server) => {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const auth = validateConnection(req);
    if (!auth.ok) {
      ws.close(1008, "unauthorized");
      return;
    }

    ws.tenantId = auth.tenantId;
    clients.add(ws);

    try {
      const snapshot = await buildSnapshot(ws.tenantId);
      send(ws, { type: "snapshot", data: snapshot });
    } catch (e) {
      send(ws, { type: "error", message: "snapshot_failed" });
    }

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  const pingInterval = setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }, 25000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  return wss;
};

export const broadcastLogEvent = (log) => {
  const tenantId = log?.tenantId || "default";
  for (const ws of clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (String(ws.tenantId || "default") !== String(tenantId)) continue;
    send(ws, { type: "log", data: log });
  }

  const ddosStats = getDdosStats();
  for (const ws of clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    send(ws, { type: "ddosStats", data: ddosStats });
  }
};
