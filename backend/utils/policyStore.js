import { Policy } from "../models/Policy.js";
import { ENV } from "../config/env.js";

const memoryPolicies = new Map();

const defaultPolicy = () => ({
  blockThreshold: Number(ENV.DEFAULT_BLOCK_THRESHOLD ?? 0.75),
  alertThreshold: Number(ENV.DEFAULT_ALERT_THRESHOLD ?? 0.5),
  overrideThreshold: Number(ENV.DEFAULT_OVERRIDE_THRESHOLD ?? 0.9),
  shadowMode: String(ENV.SHADOW_MODE || "").toLowerCase() === "true",
  allowIps: [],
  blockIps: [],
});

const normalizeIpList = (value) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((item) => String(item || "").trim()).filter(Boolean)),
  ];
};

const normalizeIp = (value) =>
  String(value || "")
    .trim()
    .replace(/^::ffff:/, "");

const ipv4ToNumber = (ip) => {
  const parts = normalizeIp(ip).split(".");
  if (parts.length !== 4) return null;
  let total = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    if (value < 0 || value > 255) return null;
    total = (total << 8) + value;
  }
  return total >>> 0;
};

const ipMatchesEntry = (ip, entry) => {
  const normalizedIp = normalizeIp(ip);
  const normalizedEntry = normalizeIp(entry);
  if (!normalizedIp || !normalizedEntry) return false;
  if (normalizedIp === normalizedEntry) return true;

  const [rangeIp, prefix] = normalizedEntry.split("/");
  if (prefix === undefined) return false;
  const ipNumber = ipv4ToNumber(normalizedIp);
  const rangeNumber = ipv4ToNumber(rangeIp);
  const prefixNumber = Number(prefix);
  if (
    ipNumber === null ||
    rangeNumber === null ||
    !Number.isInteger(prefixNumber) ||
    prefixNumber < 0 ||
    prefixNumber > 32
  ) {
    return false;
  }

  const mask =
    prefixNumber === 0 ? 0 : (0xffffffff << (32 - prefixNumber)) >>> 0;
  return (ipNumber & mask) === (rangeNumber & mask);
};

export const isIpAllowedForTenant = async (tenantId = "default", ip = "") => {
  const policy = await getPolicyForTenant(tenantId);
  return policy.allowIps.some((entry) => ipMatchesEntry(ip, entry));
};

export const isIpBlockedForTenant = async (tenantId = "default", ip = "") => {
  const policy = await getPolicyForTenant(tenantId);
  return policy.blockIps.some((entry) => ipMatchesEntry(ip, entry));
};

export const getCachedPolicyForTenant = (tenantId = "default") => {
  const cached = memoryPolicies.get(tenantId);
  return cached ? normalizePolicy(cached) : defaultPolicy();
};

export const isIpAllowedForTenantSync = (tenantId = "default", ip = "") =>
  getCachedPolicyForTenant(tenantId).allowIps.some((entry) =>
    ipMatchesEntry(ip, entry),
  );

export const isIpBlockedForTenantSync = (tenantId = "default", ip = "") =>
  getCachedPolicyForTenant(tenantId).blockIps.some((entry) =>
    ipMatchesEntry(ip, entry),
  );

const normalizePolicy = (input) => {
  const base = defaultPolicy();
  const blockThreshold =
    typeof input.blockThreshold === "number"
      ? input.blockThreshold
      : base.blockThreshold;
  const alertThreshold =
    typeof input.alertThreshold === "number"
      ? input.alertThreshold
      : base.alertThreshold;
  const overrideThreshold =
    typeof input.overrideThreshold === "number"
      ? input.overrideThreshold
      : base.overrideThreshold;
  const shadowMode =
    typeof input.shadowMode === "boolean" ? input.shadowMode : base.shadowMode;

  return {
    blockThreshold,
    alertThreshold,
    overrideThreshold,
    shadowMode,
    allowIps: normalizeIpList(input.allowIps || base.allowIps),
    blockIps: normalizeIpList(input.blockIps || base.blockIps),
  };
};

export const getPolicyForTenant = async (tenantId = "default") => {
  try {
    const found = await Policy.findOne({ tenantId }).lean();
    if (found) return normalizePolicy(found);
  } catch {
    // ignore and fall back to memory
  }

  const cached = memoryPolicies.get(tenantId);
  if (cached) return normalizePolicy(cached);

  const base = defaultPolicy();
  memoryPolicies.set(tenantId, base);
  return base;
};

export const setPolicyForTenant = async (tenantId, updates) => {
  const definedUpdates = Object.fromEntries(
    Object.entries(updates || {}).filter(([, value]) => value !== undefined),
  );
  const current = await getPolicyForTenant(tenantId);
  const normalized = normalizePolicy({ ...current, ...definedUpdates });

  try {
    const saved = await Policy.findOneAndUpdate(
      { tenantId },
      { tenantId, ...normalized },
      { upsert: true, new: true },
    ).lean();
    return normalizePolicy(saved || normalized);
  } catch {
    memoryPolicies.set(tenantId, normalized);
    return normalized;
  }
};

export const validatePolicyInput = (payload = {}) => {
  const errors = [];
  const toNum = (value) => (value === undefined ? undefined : Number(value));
  const blockThreshold = toNum(payload.blockThreshold);
  const alertThreshold = toNum(payload.alertThreshold);
  const overrideThreshold = toNum(payload.overrideThreshold);
  const allowIps = payload.allowIps;
  const blockIps = payload.blockIps;

  const checkRange = (label, value) => {
    if (value === undefined || Number.isNaN(value)) return;
    if (value < 0 || value > 1) errors.push(`${label} must be between 0 and 1`);
  };

  checkRange("blockThreshold", blockThreshold);
  checkRange("alertThreshold", alertThreshold);
  checkRange("overrideThreshold", overrideThreshold);

  if (
    blockThreshold !== undefined &&
    alertThreshold !== undefined &&
    blockThreshold < alertThreshold
  ) {
    errors.push("blockThreshold must be >= alertThreshold");
  }

  if (allowIps !== undefined && !Array.isArray(allowIps)) {
    errors.push("allowIps must be an array");
  }

  if (blockIps !== undefined && !Array.isArray(blockIps)) {
    errors.push("blockIps must be an array");
  }

  return {
    errors,
    normalized: {
      blockThreshold,
      alertThreshold,
      overrideThreshold,
      shadowMode:
        typeof payload.shadowMode === "boolean"
          ? payload.shadowMode
          : undefined,
      allowIps: allowIps === undefined ? undefined : normalizeIpList(allowIps),
      blockIps: blockIps === undefined ? undefined : normalizeIpList(blockIps),
    },
  };
};
