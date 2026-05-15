// logs.controller.js
import { Log } from "../models/Log.js";
import {
  addLogStreamClient,
  removeLogStreamClient,
  publishPing,
} from "../utils/logStream.js";
import {
  getMemoryLogById,
  getMemoryLogs,
  getMemoryLogStats,
} from "../utils/memoryLogStore.js";
import { getDdosStats as getTrafficStats } from "../utils/trafficMonitor.js";

export const getLogs = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";
    const limit = Math.min(Number(req.query.limit) || 100, 1000); // Max 1000, default 100
    const skip = Number(req.query.skip) || 0;
    
    const logs = await Log.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json(logs);
  } catch (error) {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    res.json(getMemoryLogs(limit, req.tenantId));
  }
};

export const getLogById = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";
    const log = await Log.findOne({ _id: req.params.id, tenantId });
    if (!log) return res.status(404).json({ error: "Log not found" });
    res.json(log);
  } catch (error) {
    const mem = getMemoryLogById(req.params.id, req.tenantId);
    if (!mem) return res.status(404).json({ error: "Log not found" });
    res.json(mem);
  }
};

export const getLogStats = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";
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

    res.json({ total, ...counts });
  } catch (error) {
    res.json(getMemoryLogStats(req.tenantId));
  }
};

export const streamLogs = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  addLogStreamClient(res);
  res.write(`event: status\n`);
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);

  const pingInterval = setInterval(() => publishPing(), 15000);

  req.on("close", () => {
    clearInterval(pingInterval);
    removeLogStreamClient(res);
  });
};

export const getDdosLogs = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const skip = Number(req.query.skip) || 0;

    // Get DDoS logs (logs where isDdos is true)
    const logs = await Log.find({ tenantId, isDdos: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching DDoS logs:", error);
    res.json([]);
  }
};

export const getDdosStats = async (req, res) => {
  try {
    const tenantId = req.tenantId || "default";

    // Count total DDoS attempts
    const totalDdosAttempts = await Log.countDocuments({ tenantId, isDdos: true });

    // Count unique IPs that triggered DDoS
    const uniqueIps = await Log.aggregate([
      { $match: { tenantId, isDdos: true } },
      { $group: { _id: "$ip" } },
      { $count: "count" },
    ]);

    // Count DDoS attempts that resulted in blocks
    const ddosBlocks = await Log.countDocuments({
      tenantId,
      isDdos: true,
      decision: "block",
    });

    // Get real-time traffic monitor stats
    const trafficStats = getTrafficStats();

    // Get most active attacking IPs
    const topAttackers = await Log.aggregate([
      { $match: { tenantId, isDdos: true } },
      { $group: { _id: "$ip", count: { $sum: 1 }, maxRps: { $max: "$ddosDetails.rps" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      totalAttempts: totalDdosAttempts,
      uniqueAttackerIps: uniqueIps[0]?.count || 0,
      successfulBlocks: ddosBlocks,
      blockRate: totalDdosAttempts > 0 ? (ddosBlocks / totalDdosAttempts * 100).toFixed(2) : 0,
      currentlyTrackedIps: trafficStats.totalTrackedIps,
      currentlyBlockedIps: trafficStats.blockedIps,
      topAttackers,
    });
  } catch (error) {
    console.error("Error fetching DDoS stats:", error);
    res.json({
      totalAttempts: 0,
      uniqueAttackerIps: 0,
      successfulBlocks: 0,
      blockRate: 0,
      currentlyTrackedIps: 0,
      currentlyBlockedIps: 0,
      topAttackers: [],
    });
  }
};
