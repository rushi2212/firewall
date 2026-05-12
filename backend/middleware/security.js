import { ENV } from "../config/env.js";

const parseOrigins = () =>
  String(ENV.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    const allowed = parseOrigins();
    if (!origin) {
      return callback(null, true);
    }
    if (allowed.includes(origin) || (allowed.length === 0 && ENV.NODE_ENV !== "production")) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  },
};

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (ENV.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  return next();
};
