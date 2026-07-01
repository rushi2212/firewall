import { ENV } from "../config/env.js";

const WINDOW_MS = 10_000;
const ipToTimestamps = new Map();
const ipToState = new Map(); // Track whitelist/block state for each IP

const DDOS_THRESHOLD_RPS = Number(ENV.DDOS_THRESHOLD_RPS || 0.8);
const DDOS_GRACE_REQUESTS = Number(ENV.DDOS_GRACE_REQUESTS || 8);
const DDOS_BLOCK_DURATION_MS = Number(ENV.DDOS_BLOCK_DURATION_MS || 60000);

const nowMs = () => Date.now();

const pruneOld = (timestamps, cutoff) => {
  while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();
};

export const recordRequest = (ip) => {
  if (!ip) return { rps: 0, windowMs: WINDOW_MS, isDdos: false };
  const ts = nowMs();
  const cutoff = ts - WINDOW_MS;

  const timestamps = ipToTimestamps.get(ip) ?? [];
  timestamps.push(ts);
  pruneOld(timestamps, cutoff);
  ipToTimestamps.set(ip, timestamps);

  const rps = timestamps.length / (WINDOW_MS / 1000);
  
  // Get or initialize IP state
  let state = ipToState.get(ip) || { 
    firstSeenAt: ts,
    blockedUntil: 0,
    totalRequests: 0,
    ddosTriggeredAt: null
  };

  state.totalRequests++;

  // Check if blocked period has expired
  if (state.blockedUntil && ts > state.blockedUntil) {
    state.blockedUntil = 0;
    state.ddosTriggeredAt = null;
    state.firstSeenAt = ts;
    state.totalRequests = 1;
  }

  const isCurrentlyBlocked = state.blockedUntil > ts;
  const isOverWindowLimit = timestamps.length > DDOS_GRACE_REQUESTS;
  const isDdos = isCurrentlyBlocked || isOverWindowLimit || rps >= DDOS_THRESHOLD_RPS;
  const hasGrace = !isCurrentlyBlocked && !isOverWindowLimit;

  if (isCurrentlyBlocked) {
    state.blockedUntil = ts + DDOS_BLOCK_DURATION_MS;
  } else if (isOverWindowLimit) {
    state.blockedUntil = ts + DDOS_BLOCK_DURATION_MS;
    state.ddosTriggeredAt = ts;
  }

  ipToState.set(ip, state);
  const shouldBlock = state.blockedUntil > ts;

  return {
    rps,
    windowMs: WINDOW_MS,
    isDdos,
    isWhitelisted: hasGrace,
    isCurrentlyBlocked: shouldBlock,
    shouldBlock,
    ddosTriggeredAt: state.ddosTriggeredAt,
    totalRequests: state.totalRequests,
    firstSeenAt: state.firstSeenAt,
    threshold: DDOS_THRESHOLD_RPS,
    graceRequests: DDOS_GRACE_REQUESTS,
  };
};

export const computeDdosScore = (rps) => {
  const base = 0;
  const max = Math.max(DDOS_THRESHOLD_RPS, 1);
  const raw = (rps - base) / (max - base);
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
};

export const clearDdosState = (ip) => {
  ipToTimestamps.delete(ip);
  ipToState.delete(ip);
};

export const getDdosStats = () => {
  const now = nowMs();
  const stats = {
    totalTrackedIps: ipToState.size,
    whitelistedIps: 0,
    blockedIps: 0,
    details: []
  };

  for (const [ip, state] of ipToState.entries()) {
    if (state.blockedUntil > now) {
      stats.blockedIps++;
    } else {
      stats.whitelistedIps++;
    }
    
    stats.details.push({
      ip,
      rps: (ipToTimestamps.get(ip)?.length || 0) / (WINDOW_MS / 1000),
      isBlocked: state.blockedUntil > now,
      totalRequests: state.totalRequests,
      firstSeenAt: state.firstSeenAt,
      ddosTriggeredAt: state.ddosTriggeredAt,
    });
  }
  
  return stats;
};
