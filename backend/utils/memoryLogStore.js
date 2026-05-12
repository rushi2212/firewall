import crypto from "crypto";

const logs = [];

const toId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

export const addMemoryLog = (partial) => {
  const createdAt = partial?.createdAt ?? new Date().toISOString();
  const doc = {
    _id: partial?._id ?? toId(),
    ...partial,
    createdAt,
    updatedAt: partial?.updatedAt ?? createdAt,
  };

  logs.unshift(doc);
  if (logs.length > 1000) logs.length = 1000;
  return doc;
};

const filterByTenant = (tenantId) =>
  tenantId ? logs.filter((l) => String(l?.tenantId || "default") === String(tenantId)) : logs;

export const getMemoryLogs = (limit = 100, tenantId) =>
  filterByTenant(tenantId).slice(0, limit);

export const getMemoryLogById = (id, tenantId) =>
  filterByTenant(tenantId).find((l) => String(l?._id) === String(id)) ?? null;

export const getMemoryLogStats = (tenantId) => {
  const stats = { total: 0, allowed: 0, alerted: 0, blocked: 0 };
  for (const log of filterByTenant(tenantId)) {
    stats.total++;
    const d = String(log?.decision || "").toLowerCase();
    if (d === "allow" || d === "allowed") stats.allowed++;
    else if (d === "alert" || d === "alerted") stats.alerted++;
    else if (d === "block" || d === "blocked") stats.blocked++;
  }
  return stats;
};

export const getMemoryAlerts = (limit = 100, tenantId) =>
  filterByTenant(tenantId)
    .filter((l) => String(l?.decision || "").toLowerCase() !== "allow")
    .slice(0, limit);
