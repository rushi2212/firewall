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

export const getLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.json(getMemoryLogs(100));
  }
};

export const getLogById = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id);
    if (!log) return res.status(404).json({ error: "Log not found" });
    res.json(log);
  } catch (error) {
    const mem = getMemoryLogById(req.params.id);
    if (!mem) return res.status(404).json({ error: "Log not found" });
    res.json(mem);
  }
};

export const getLogStats = async (req, res) => {
  try {
    const total = await Log.countDocuments();
    const grouped = await Log.aggregate([
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
    res.json(getMemoryLogStats());
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
