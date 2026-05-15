import assert from "node:assert/strict";
import { calculateThreatScore } from "../utils/scoreCalculator.js";
import { canonicalizePayload, evaluateWafRules } from "../utils/wafRules.js";
import { createDashboardToken, verifyDashboardToken } from "../utils/dashboardAuth.js";
import { createRateLimiter, resetRateLimiterForTests } from "../middleware/rateLimiter.js";

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test("score includes deterministic rule and XSS scores", () => {
  const score = calculateThreatScore({
    rules: 1,
    payload: 0,
    xss: 1,
    bot: 0,
    ddos: 0,
    behavior: 0,
  });

  assert.equal(score, 0.5);
});

test("score keeps clean traffic at zero", () => {
  assert.equal(calculateThreatScore({}), 0);
});

test("canonicalizes encoded payloads before rule evaluation", () => {
  assert.equal(
    canonicalizePayload("%253Cscript%253Ealert(1)%253C%252Fscript%253E"),
    "<script>alert(1)</script>"
  );
});

test("detects common SQL injection payloads", () => {
  const result = evaluateWafRules("' OR '1'='1' --");

  assert.equal(result.matched, true);
  assert.equal(result.matches.some((match) => match.category === "sqli"), true);
  assert.ok(result.score >= 0.8);
});

test("detects encoded XSS payloads", () => {
  const result = evaluateWafRules("%3Cscript%3Ealert(1)%3C%2Fscript%3E");

  assert.equal(result.matched, true);
  assert.equal(result.matches.some((match) => match.category === "xss"), true);
  assert.ok(result.score >= 0.9);
});

test("does not flag ordinary payloads", () => {
  const result = evaluateWafRules("name=alice&action=view");

  assert.equal(result.matched, false);
  assert.equal(result.score, 0);
});

test("detects path traversal payloads", () => {
  const result = evaluateWafRules("file=../../../../etc/passwd");

  assert.equal(result.matched, true);
  assert.equal(result.matches.some((match) => match.category === "lfi"), true);
});

test("detects command injection payloads", () => {
  const result = evaluateWafRules("name=test; cat /etc/passwd");

  assert.equal(result.matched, true);
  assert.equal(result.matches.some((match) => match.category === "rce"), true);
});

test("dashboard tokens verify and preserve RBAC claims", () => {
  const token = createDashboardToken({
    username: "admin",
    role: "owner",
    tenantId: "tenant-a",
  });
  const claims = verifyDashboardToken(token);

  assert.equal(claims.sub, "admin");
  assert.equal(claims.role, "owner");
  assert.equal(claims.tenantId, "tenant-a");
});

test("dashboard token verification rejects tampering", () => {
  const token = createDashboardToken({
    username: "admin",
    role: "owner",
    tenantId: "tenant-a",
  });
  const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");

  assert.equal(verifyDashboardToken(tampered), null);
});

test("rate limiter blocks after configured threshold", () => {
  resetRateLimiterForTests();
  const limiter = createRateLimiter({
    max: 2,
    windowMs: 10000,
    keyPrefix: "test",
    keyGenerator: () => "client",
  });
  const req = {
    headers: {},
    ip: "127.0.0.1",
    baseUrl: "/api/test",
  };
  let statusCode = 200;
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalls = 0;
  const next = () => {
    nextCalls += 1;
  };

  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.equal(res.body.error, "Rate limit exceeded");
});

let failed = 0;
for (const item of tests) {
  try {
    item.fn();
    console.log(`ok - ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${item.name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} tests passed`);
}
