import crypto from "crypto";
import { ENV } from "../config/env.js";

const base64url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromBase64url = (value) => {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
};

const signingSecret = () => {
  const secret = String(ENV.DASHBOARD_TOKEN_SECRET || "").trim();
  if (secret) return secret;
  if (ENV.NODE_ENV === "production") {
    throw new Error("DASHBOARD_TOKEN_SECRET must be set in production");
  }
  return "dev-dashboard-token-secret";
};

const sign = (value) =>
  base64url(crypto.createHmac("sha256", signingSecret()).update(value).digest());

const safeEqual = (left = "", right = "") => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const createDashboardToken = ({
  username,
  role = "viewer",
  tenantId = "default",
}) => {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(ENV.DASHBOARD_TOKEN_TTL_SECONDS || 28800);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: username,
      role,
      tenantId,
      iat: now,
      exp: now + ttl,
    })
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
};

export const verifyDashboardToken = (token) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  if (!safeEqual(sign(unsigned), signature)) return null;

  try {
    const parsed = JSON.parse(fromBase64url(payload));
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.exp || parsed.exp < now) return null;
    if (!parsed.sub || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const verifyAdminPassword = (username, password) => {
  const expectedUser = String(ENV.ADMIN_USERNAME || "admin");
  const expectedPassword = String(ENV.ADMIN_PASSWORD || "");
  if (!expectedPassword) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
};
