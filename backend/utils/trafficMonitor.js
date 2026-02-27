const WINDOW_MS = 10_000;
const ipToTimestamps = new Map();

const nowMs = () => Date.now();

const pruneOld = (timestamps, cutoff) => {
  while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();
};

export const recordRequest = (ip) => {
  if (!ip) return { rps: 0, windowMs: WINDOW_MS };
  const ts = nowMs();
  const cutoff = ts - WINDOW_MS;

  const timestamps = ipToTimestamps.get(ip) ?? [];
  timestamps.push(ts);
  pruneOld(timestamps, cutoff);
  ipToTimestamps.set(ip, timestamps);

  const rps = timestamps.length / (WINDOW_MS / 1000);
  return { rps, windowMs: WINDOW_MS };
};

export const computeDdosScore = (rps) => {
  // Simple mapping: <=1 rps => 0, >=10 rps => 1
  const base = 1;
  const max = 10;
  const raw = (rps - base) / (max - base);
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
};
