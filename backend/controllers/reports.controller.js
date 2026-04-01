import { Log } from "../models/Log.js";
import { getMemoryLogs } from "../utils/memoryLogStore.js";

const isDateOnlyString = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDayUtc = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
const endOfDayUtc = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

const parseDateRange = (query) => {
  // Supports:
  // - ?date=YYYY-MM-DD
  // - ?startDate=...&endDate=...
  const date = query?.date;
  const startDateRaw = query?.startDate;
  const endDateRaw = query?.endDate;

  if (date) {
    const d = toDateOrNull(date);
    if (!d) return { error: "Invalid 'date' (expected ISO or YYYY-MM-DD)" };
    return { start: startOfDayUtc(d), end: endOfDayUtc(d) };
  }

  let start = toDateOrNull(startDateRaw);
  let end = toDateOrNull(endDateRaw);

  // Friendly defaults: if nothing passed, default to today (UTC).
  if (!start && !end) {
    const now = new Date();
    start = startOfDayUtc(now);
    end = endOfDayUtc(now);
    return { start, end };
  }

  if (startDateRaw && isDateOnlyString(startDateRaw)) start = start ? startOfDayUtc(start) : null;
  if (endDateRaw && isDateOnlyString(endDateRaw)) end = end ? endOfDayUtc(end) : null;

  if (!start) return { error: "Missing or invalid 'startDate'" };
  if (!end) return { error: "Missing or invalid 'endDate'" };

  if (start > end) return { error: "'startDate' must be <= 'endDate'" };

  // Guardrail to avoid accidental huge queries in the UI.
  const maxRangeDays = 31;
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > maxRangeDays) return { error: `Date range too large (max ${maxRangeDays} days)` };

  return { start, end };
};

const payloadSnippet = (payload, maxLen = 120) => {
  const text = String(payload ?? "");
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}…`;
};

const computeFromLogs = (logs, start, end) => {
  const stats = {
    total: 0,
    allowed: 0,
    blocked: 0,
    alerted: 0,
    overrideCount: 0,
    avgThreatScore: 0,
    maxThreatScore: 0,
    minThreatScore: null,
  };

  const ipMap = new Map();
  const hourly = new Array(24).fill(0);
  const modelSums = { payload: 0, bot: 0, ddos: 0, behavior: 0, xss: 0 };
  let modelCount = 0;

  const rows = [];

  for (const log of logs) {
    const createdAt = new Date(log?.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;
    if (createdAt < start || createdAt > end) continue;

    stats.total++;

    const d = String(log?.decision || "").toLowerCase();
    if (d === "allow" || d === "allowed") stats.allowed++;
    else if (d === "block" || d === "blocked") stats.blocked++;
    else if (d === "alert" || d === "alerted") stats.alerted++;

    if (log?.override) stats.overrideCount++;

    const threat = Number(log?.threatScore || 0);
    stats.avgThreatScore += threat;
    stats.maxThreatScore = Math.max(stats.maxThreatScore, threat);
    stats.minThreatScore = stats.minThreatScore === null ? threat : Math.min(stats.minThreatScore, threat);

    const hour = createdAt.getUTCHours();
    hourly[hour]++;

    const ip = String(log?.ip || "unknown");
    const cur = ipMap.get(ip) || { ip, count: 0, avgThreatScore: 0, maxThreatScore: 0, blocked: 0, alerted: 0 };
    cur.count++;
    cur.avgThreatScore += threat;
    cur.maxThreatScore = Math.max(cur.maxThreatScore, threat);
    if (d === "block" || d === "blocked") cur.blocked++;
    if (d === "alert" || d === "alerted") cur.alerted++;
    ipMap.set(ip, cur);

    const pred = log?.prediction || {};
    const p = Number(pred?.payload || 0);
    const b = Number(pred?.bot || 0);
    const dd = Number(pred?.ddos || 0);
    const beh = Number(pred?.behavior || 0);
    const x = Number(pred?.xss || 0);
    if (!Number.isNaN(p + b + dd + beh + x)) {
      modelSums.payload += p;
      modelSums.bot += b;
      modelSums.ddos += dd;
      modelSums.behavior += beh;
      modelSums.xss += x;
      modelCount++;
    }

    rows.push({
      createdAt: createdAt.toISOString(),
      ip,
      decision: d,
      threatScore: threat,
      payloadSnippet: payloadSnippet(log?.payload),
    });
  }

  if (stats.total > 0) stats.avgThreatScore = stats.avgThreatScore / stats.total;
  const topIps = Array.from(ipMap.values())
    .map((x) => ({
      ...x,
      avgThreatScore: x.count > 0 ? x.avgThreatScore / x.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topThreats = rows
    .slice()
    .sort((a, b) => b.threatScore - a.threatScore)
    .slice(0, 10);

  const peakHourUtc = hourly.reduce(
    (best, count, hour) => (count > best.count ? { hour, count } : best),
    { hour: 0, count: 0 }
  );

  return {
    meta: {
      start: start.toISOString(),
      end: end.toISOString(),
      generatedAt: new Date().toISOString(),
      timezone: "UTC",
      source: "memory",
    },
    summary: {
      ...stats,
      decisionPercentages: {
        allowed: stats.total ? stats.allowed / stats.total : 0,
        blocked: stats.total ? stats.blocked / stats.total : 0,
        alerted: stats.total ? stats.alerted / stats.total : 0,
      },
      peakHourUtc,
    },
    hourly: hourly.map((count, hour) => ({ hour, count })),
    modelAverages:
      modelCount > 0
        ? {
            payload: modelSums.payload / modelCount,
            bot: modelSums.bot / modelCount,
            ddos: modelSums.ddos / modelCount,
            behavior: modelSums.behavior / modelCount,
            xss: modelSums.xss / modelCount,
          }
        : { payload: 0, bot: 0, ddos: 0, behavior: 0, xss: 0 },
    topIps,
    topThreats,
  };
};

export const getRequestsReport = async (req, res) => {
  const parsed = parseDateRange(req.query);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { start, end } = parsed;

  // Prefer MongoDB (accurate for large datasets). If DB is unavailable, fall back
  // to the in-memory log store.
  try {
    const match = { createdAt: { $gte: start, $lte: end } };

    const [result] = await Log.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgThreatScore: { $avg: { $ifNull: ["$threatScore", 0] } },
                maxThreatScore: { $max: { $ifNull: ["$threatScore", 0] } },
                minThreatScore: { $min: { $ifNull: ["$threatScore", 0] } },
                overrideCount: {
                  $sum: {
                    $cond: [{ $ifNull: ["$override", false] }, 1, 0],
                  },
                },
              },
            },
          ],
          decisions: [
            {
              $group: {
                _id: { $toLower: { $ifNull: ["$decision", "allow"] } },
                count: { $sum: 1 },
              },
            },
          ],
          hourly: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          topIps: [
            {
              $group: {
                _id: { $ifNull: ["$ip", "unknown"] },
                count: { $sum: 1 },
                avgThreatScore: { $avg: { $ifNull: ["$threatScore", 0] } },
                maxThreatScore: { $max: { $ifNull: ["$threatScore", 0] } },
                blocked: {
                  $sum: {
                    $cond: [
                      { $in: [{ $toLower: { $ifNull: ["$decision", ""] } }, ["block", "blocked"]] },
                      1,
                      0,
                    ],
                  },
                },
                alerted: {
                  $sum: {
                    $cond: [
                      { $in: [{ $toLower: { $ifNull: ["$decision", ""] } }, ["alert", "alerted"]] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          topThreats: [
            { $sort: { threatScore: -1, createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 0,
                createdAt: 1,
                ip: { $ifNull: ["$ip", "unknown"] },
                decision: { $toLower: { $ifNull: ["$decision", "allow"] } },
                threatScore: { $ifNull: ["$threatScore", 0] },
                payloadSnippet: {
                  $cond: [
                    { $gt: [{ $strLenBytes: { $ifNull: ["$payload", ""] } }, 0] },
                    {
                      $concat: [
                        { $substrBytes: [{ $ifNull: ["$payload", ""] }, 0, 120] },
                        "…",
                      ],
                    },
                    "",
                  ],
                },
              },
            },
          ],
          modelAverages: [
            {
              $group: {
                _id: null,
                payload: { $avg: { $ifNull: ["$prediction.payload", 0] } },
                bot: { $avg: { $ifNull: ["$prediction.bot", 0] } },
                ddos: { $avg: { $ifNull: ["$prediction.ddos", 0] } },
                behavior: { $avg: { $ifNull: ["$prediction.behavior", 0] } },
                xss: { $avg: { $ifNull: ["$prediction.xss", 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]);

    const totals = (result?.totals && result.totals[0]) || {
      total: 0,
      avgThreatScore: 0,
      maxThreatScore: 0,
      minThreatScore: 0,
      overrideCount: 0,
    };

    const decisionCounts = { allowed: 0, blocked: 0, alerted: 0 };
    for (const row of result?.decisions || []) {
      const key = String(row?._id || "");
      if (key === "allow" || key === "allowed") decisionCounts.allowed += row.count;
      else if (key === "block" || key === "blocked") decisionCounts.blocked += row.count;
      else if (key === "alert" || key === "alerted") decisionCounts.alerted += row.count;
    }

    const hourly = new Array(24).fill(0);
    for (const row of result?.hourly || []) {
      const h = Number(row?._id);
      if (!Number.isNaN(h) && h >= 0 && h <= 23) hourly[h] = Number(row?.count || 0);
    }

    const peakHourUtc = hourly.reduce(
      (best, count, hour) => (count > best.count ? { hour, count } : best),
      { hour: 0, count: 0 }
    );

    res.json({
      meta: {
        start: start.toISOString(),
        end: end.toISOString(),
        generatedAt: new Date().toISOString(),
        timezone: "UTC",
        source: "mongodb",
      },
      summary: {
        total: totals.total,
        allowed: decisionCounts.allowed,
        blocked: decisionCounts.blocked,
        alerted: decisionCounts.alerted,
        overrideCount: totals.overrideCount,
        avgThreatScore: totals.avgThreatScore,
        maxThreatScore: totals.maxThreatScore,
        minThreatScore: totals.minThreatScore,
        decisionPercentages: {
          allowed: totals.total ? decisionCounts.allowed / totals.total : 0,
          blocked: totals.total ? decisionCounts.blocked / totals.total : 0,
          alerted: totals.total ? decisionCounts.alerted / totals.total : 0,
        },
        peakHourUtc,
      },
      hourly: hourly.map((count, hour) => ({ hour, count })),
      modelAverages: (result?.modelAverages && result.modelAverages[0]) || {
        payload: 0,
        bot: 0,
        ddos: 0,
        behavior: 0,
        xss: 0,
      },
      topIps: (result?.topIps || []).map((row) => ({
        ip: row?._id ?? "unknown",
        count: row?.count ?? 0,
        avgThreatScore: row?.avgThreatScore ?? 0,
        maxThreatScore: row?.maxThreatScore ?? 0,
        blocked: row?.blocked ?? 0,
        alerted: row?.alerted ?? 0,
      })),
      topThreats: (result?.topThreats || []).map((row) => ({
        ...row,
        createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
      })),
    });
  } catch (e) {
    const report = computeFromLogs(getMemoryLogs(1000), start, end);
    res.json(report);
  }
};
