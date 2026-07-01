import { ENV } from "../config/env.js";
import { Log } from "../models/Log.js";
import { recordRequest } from "../utils/trafficMonitor.js";
import { publishLogEvent } from "../utils/logStream.js";
import {
  isIpAllowedForTenantSync,
  isIpBlockedForTenantSync,
} from "../utils/policyStore.js";

const buckets = new Map();

const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const cleanup = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const createRateLimiter = ({
  windowMs = Number(ENV.RATE_LIMIT_WINDOW_MS || 60000),
  max = Number(ENV.RATE_LIMIT_MAX || 120),
  keyPrefix = "global",
  keyGenerator,
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);

    const tenant = req.tenantId || req.headers["x-tenant-id"] || "anonymous";
    const route = req.baseUrl || req.path || "root";
    const ip = clientIp(req);
    const identity = keyGenerator
      ? keyGenerator(req)
      : `${tenant}:${ip}:${route}`;
    const key = `${keyPrefix}:${identity}`;
    const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    const isAllowed = isIpAllowedForTenantSync(tenant, ip);
    const isBlocked = !isAllowed && isIpBlockedForTenantSync(tenant, ip);

    if (isAllowed) {
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(max));
      res.setHeader(
        "RateLimit-Reset",
        String(Math.ceil((now + windowMs) / 1000)),
      );
      return next();
    }

    if (isBlocked) {
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader(
        "RateLimit-Reset",
        String(Math.ceil((now + windowMs) / 1000)),
      );
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    }

    if (current.resetAt <= now) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    buckets.set(key, current);

    const remaining = Math.max(0, max - current.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      try {
        const tenantId =
          req.tenantId || req.headers["x-tenant-id"] || "default";
        const traffic = recordRequest(ip);

        const logDoc = {
          tenantId,
          ip,
          method: req.method,
          path: req.originalUrl || req.path,
          ua: req.headers["user-agent"] || "",
          referer: req.headers["referer"] || req.headers["referrer"] || "",
          payload: "",
          payloadHash: "",
          prediction: {},
          threatScore: traffic.rps || 0,
          decision: "block",
          effectiveDecision: "block",
          isDdos: !!traffic.isDdos,
          ddosDetails: {
            rps: traffic.rps,
            isWhitelisted: traffic.isWhitelisted,
            isCurrentlyBlocked: traffic.isCurrentlyBlocked,
            ddosTriggeredAt: traffic.ddosTriggeredAt
              ? new Date(traffic.ddosTriggeredAt)
              : null,
            totalRequests: traffic.totalRequests,
            firstSeenAt: traffic.firstSeenAt
              ? new Date(traffic.firstSeenAt)
              : null,
            threshold: traffic.threshold,
          },
          requestDetails: {
            timestamp: new Date(),
            headers: {
              userAgent: req.headers["user-agent"] || "",
              referer: req.headers["referer"] || "",
              contentType: req.headers["content-type"] || "",
            },
            contentLength: req.headers["content-length"] || 0,
          },
        };

        Log.create(logDoc)
          .then((created) => publishLogEvent(created))
          .catch((e) =>
            console.error("Failed to create rate-limit log:", e.message),
          );
      } catch (e) {
        console.error("Error while logging rate limit event:", e.message);
      }

      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
      });
    }

    return next();
  };
};

export const resetRateLimiterForTests = () => {
  buckets.clear();
};
