export function getBrowserType(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  return "Other";
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = mean(values.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

// Records browser interaction timestamps and basic counts.
// You can interpret it as a proxy for a "flow".
export function createInteractionRecorder() {
  const startMs = performance.now();
  const eventTimesMs = [];
  const packetSizes = [];
  const counters = {
    click: 0,
    keydown: 0,
    scroll: 0,
    mousemove: 0,
  };

  const record = (type, size) => {
    counters[type] = (counters[type] || 0) + 1;
    eventTimesMs.push(performance.now());
    packetSizes.push(size);
  };

  const onClick = () => record("click", 220);
  const onKeydown = () => record("keydown", 140);
  const onScroll = () => record("scroll", 180);
  const onMousemove = () => record("mousemove", 90);

  const start = () => {
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMousemove);
  };

  const stop = () => {
    window.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("mousemove", onMousemove);
  };

  const snapshot = () => {
    const nowMs = performance.now();
    const durationMs = Math.max(1, nowMs - startMs);

    return {
      startMs,
      nowMs,
      durationMs,
      eventTimesMs: [...eventTimesMs],
      packetSizes: [...packetSizes],
      counters: { ...counters },
    };
  };

  return { start, stop, snapshot };
}

// Converts the interaction snapshot to the TrafficFlow schema FastAPI expects.
// Values are bounded to keep them in a plausible range.
export function snapshotToTrafficFlow(snapshot) {
  const durationMs = clampNumber(snapshot?.durationMs ?? 1, 1, 120_000);
  const durationSec = durationMs / 1000;

  const times = (snapshot?.eventTimesMs || []).slice().sort((a, b) => a - b);
  const sizes = snapshot?.packetSizes || [];

  const totalEvents = times.length;
  const totalBytes = sizes.reduce((a, b) => a + b, 0);

  const iats = [];
  for (let i = 1; i < times.length; i++) iats.push(times[i] - times[i - 1]);

  const fwdEvents = Math.ceil(totalEvents * 0.6);
  const bwdEvents = totalEvents - fwdEvents;

  const flow_byts_s = durationSec > 0 ? totalBytes / durationSec : totalBytes;
  const flow_pkts_s = durationSec > 0 ? totalEvents / durationSec : totalEvents;

  const pkt_len_mean = mean(sizes);
  const pkt_len_std = stddev(sizes);

  const fwd_pkts_s = durationSec > 0 ? fwdEvents / durationSec : fwdEvents;
  const bwd_pkts_s = durationSec > 0 ? bwdEvents / durationSec : bwdEvents;
  const flow_iat_mean = mean(iats);

  return {
    flow_duration: clampNumber(durationMs, 1, 120_000),
    flow_byts_s: clampNumber(flow_byts_s, 0, 5_000_000),
    flow_pkts_s: clampNumber(flow_pkts_s, 0, 20_000),
    pkt_len_mean: clampNumber(pkt_len_mean, 0, 1500),
    pkt_len_std: clampNumber(pkt_len_std, 0, 1500),
    fwd_pkts_s: clampNumber(fwd_pkts_s, 0, 20_000),
    bwd_pkts_s: clampNumber(bwd_pkts_s, 0, 20_000),
    flow_iat_mean: clampNumber(flow_iat_mean, 0, 60_000),
  };
}

export function createBehaviourEvent({ eventName, pageName, userAgent }) {
  return {
    Event: eventName,
    page_name: pageName,
    browser_type: getBrowserType(userAgent),
  };
}

export function newSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `sess_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  }
}
