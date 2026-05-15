import { ENV } from "../config/env.js";
import crypto from "crypto";
import { verifyDashboardToken } from "../utils/dashboardAuth.js";

const parseApiKeys = () => {
  const raw = String(ENV.API_KEYS || "").trim();
  if (!raw) return [];
  return raw.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    const [key, tenantId] = trimmed.split(":");
    return { key: key?.trim(), tenantId: tenantId?.trim() || null };
  }).filter(Boolean);
};

const cachedKeys = parseApiKeys();
const isProduction = ENV.NODE_ENV === "production";

const safeEqual = (left = "", right = "") => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearer) {
    const user = verifyDashboardToken(bearer);
    if (!user) {
      return res.status(401).json({ error: "Invalid dashboard token" });
    }
    req.user = user;
    req.authType = "dashboard";
    req.tenantId = user.tenantId || req.headers["x-tenant-id"] || "default";
    return next();
  }

  if (!cachedKeys.length) {
    if (isProduction) {
      return res.status(500).json({
        error: "API authentication is not configured",
      });
    }
    req.tenantId = req.headers["x-tenant-id"] || "default";
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const match = cachedKeys.find((item) => safeEqual(item.key, apiKey));
  if (!match) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  req.tenantId = req.headers["x-tenant-id"] || match.tenantId || "default";
  req.authType = "apiKey";
  req.user = {
    sub: "api-key",
    role: "service",
    tenantId: req.tenantId,
  };
  return next();
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (req.authType === "apiKey") return next();
  const role = req.user?.role;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: "Insufficient role" });
  }
  return next();
};
