import crypto from "crypto";

const MAX_PAYLOAD_LENGTH = 1024;

const redactPatterns = [
  [/password\s*=\s*[^&\s]+/gi, "password=***"],
  [/pass\s*=\s*[^&\s]+/gi, "pass=***"],
  [/token\s*=\s*[^&\s]+/gi, "token=***"],
  [/api[_-]?key\s*=\s*[^&\s]+/gi, "api_key=***"],
  [/authorization:\s*bearer\s+[a-z0-9\-_.]+/gi, "authorization: bearer ***"],
  [/set-cookie:\s*[^\n]+/gi, "set-cookie: ***"],
  [/cookie:\s*[^\n]+/gi, "cookie: ***"],
];

export const redactPayload = (value) => {
  const raw = value === undefined || value === null ? "" : String(value);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  let redacted = raw;
  for (const [pattern, replacement] of redactPatterns) {
    redacted = redacted.replace(pattern, replacement);
  }

  if (redacted.length > MAX_PAYLOAD_LENGTH) {
    redacted = `${redacted.slice(0, MAX_PAYLOAD_LENGTH)}…`;
  }

  return { redacted, hash };
};
