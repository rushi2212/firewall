import axios from "axios";
import { ENV } from "../config/env.js";
import { analyzePayload } from "./decision.controller.js";

const parseAllowlist = () =>
  String(ENV.UPSTREAM_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const isAllowedUpstream = (target) => {
  const allowlist = parseAllowlist();
  if (!allowlist.length) return false;
  try {
    const targetUrl = new URL(target);
    return allowlist.some((allowed) => {
      const allowedUrl = new URL(allowed);
      return (
        targetUrl.protocol === allowedUrl.protocol &&
        targetUrl.hostname === allowedUrl.hostname &&
        targetUrl.port === allowedUrl.port
      );
    });
  } catch {
    return false;
  }
};

const stripHopByHop = (headers) => {
  const blocked = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
  ]);
  const cleaned = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (!blocked.has(key.toLowerCase())) cleaned[key] = value;
  }
  return cleaned;
};

const resolveUpstream = (req) => {
  return String(ENV.PROXY_TARGET || "").trim().replace(/\/+$/, "");
};

export const proxyRequest = async (req, res) => {
  const target = resolveUpstream(req);
  if (!target) {
    return res.status(400).json({ error: "Missing proxy target" });
  }
  if (!isAllowedUpstream(target)) {
    return res.status(403).json({ error: "Proxy target is not allowlisted" });
  }

  const trimmed = req.originalUrl.replace(/^\/api\/proxy/, "");
  const upstreamUrl = `${target.replace(/\/+$/, "")}${trimmed}`;

  const payloadSource =
    req.method === "GET" || req.method === "HEAD"
      ? req.originalUrl
      : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body || {});

  const analysis = await analyzePayload({
    payload: payloadSource,
    ua: req.headers["user-agent"],
    method: req.method,
    path: req.originalUrl,
    referer: req.headers?.referer || req.headers?.referrer || "",
    ip: req.ip,
    flow: req.body?.flow,
    sessions: req.body?.sessions,
    tenantId: req.tenantId || "default",
  });

  if (analysis.decision === "block" && !analysis.shadowMode) {
    return res.status(403).json({
      error: "Blocked by AI-WAF",
      decision: analysis.decision,
      effectiveDecision: analysis.effectiveDecision,
      logId: analysis.log?._id,
    });
  }

  try {
    const upstream = await axios({
      method: req.method,
      url: upstreamUrl,
      data: req.body,
      headers: stripHopByHop(req.headers),
      timeout: Number(ENV.PROXY_REQUEST_TIMEOUT_MS || 5000),
      validateStatus: () => true,
    });

    res.status(upstream.status);
    for (const [key, value] of Object.entries(upstream.headers || {})) {
      res.setHeader(key, value);
    }
    return res.send(upstream.data);
  } catch (error) {
    return res.status(502).json({
      error: "Upstream request failed",
      detail: error.message,
    });
  }
};
