# AI-WAF Production MVP Readiness Audit

Date: 2026-05-01

Project: AI-WAF

Stack reviewed: MERN backend/frontend plus FastAPI ML service

Verdict: **Not MVP-ready for real customers yet. Strong prototype, but unsafe to launch as a production WAF tomorrow.**

If deployed tomorrow in front of real user traffic, this system would likely work for demos and controlled lab payloads, but it would not survive production traffic, adversarial bypass attempts, operational failures, or a paying customer security review.

---

## Executive Decision

### MVP Status

**Decision: Just a prototype, close to an internal alpha.**

It is not production MVP-ready yet because:

- Blocking depends on multiple synchronous ML calls with no timeout or circuit breaker.
- Model failures silently become zero-risk signals in the Node decision path.
- API authentication is optional, and frontend admin authentication is hardcoded demo logic.
- The proxy can be turned into an open proxy/SSRF primitive through `x-proxy-target`.
- There is no serious automated test suite proving detection, blocking, logging, or bypass resistance.
- The AI layer has no visible validation metrics, drift handling, calibration, or production feedback loop.
- Brute force and credential stuffing detection are essentially missing.

### Current Readiness Score

| Area | Score | Reality |
|---|---:|---|
| Functional WAF behavior | 5/10 | End-to-end path exists, but coverage is incomplete and fragile. |
| AI usefulness | 4/10 | Real models exist, but production validity is unproven. |
| Architecture | 5/10 | Good separation idea, weak resilience and deployment story. |
| Security | 2/10 | Serious launch blockers. |
| Performance | 3/10 | Synchronous deep inference per request will not scale. |
| Testing/reliability | 2/10 | No meaningful CI/test evidence. |
| SaaS readiness | 3/10 | Tenant policy exists, but auth/RBAC/billing/onboarding are absent. |

Overall: **3.5/10 production readiness.**

---

## Part 1: Functional Evaluation

### Does It Detect Common Attacks?

#### SQL Injection

**Partially.**

The FastAPI service includes a BiLSTM payload detector at `/bilstm/predict`, and the Node decision pipeline calls it from `backend/controllers/decision.controller.js`.

Problems:

- No obvious deterministic SQLi rule layer exists for known payloads.
- SQLi confidence is treated as the payload score, but no model validation evidence is present.
- Obfuscated SQLi, encoded payloads, nested JSON, multipart bodies, cookies, and headers are not robustly normalized.
- Payload extraction is weak: the decision route expects `req.body.payload`; the proxy stringifies JSON bodies or uses the URL for GET/HEAD.

Conclusion: **Can catch some lab SQLi payloads. Not reliable enough for production.**

#### XSS

**Partially, with a scoring bug.**

The FastAPI service includes an XSS BiLSTM model at `/xss/predict`, and Node calls it.

Critical issue:

- `calculateThreatScore` in `backend/utils/scoreCalculator.js` ignores the `xss` score entirely. XSS only affects the final decision through the override logic if it exceeds `overrideThreshold`.
- A payload with XSS probability of `0.70` may alert/block less reliably than expected because it does not contribute to the weighted score.

Conclusion: **XSS detection exists, but decision integration is flawed.**

#### Brute Force / Credential Stuffing

**Mostly missing.**

There is no real login-attempt tracking by username, account, route, ASN, device, session, password failure rate, or distributed IP cluster.

The current DDoS/rate score is per-process IP request frequency only. That is not brute force detection.

Conclusion: **Not implemented as a production WAF feature.**

#### Bot Detection

**Prototype only.**

FastAPI has RandomForest and IsolationForest bot endpoints, but the Node pipeline only calls these when the request includes a manually provided `flow` object.

Problems:

- The proxy does not derive real network flow features.
- Normal RandomForest confidence appears to be used as a threat score without checking whether the prediction is actually "Bot/Attack".
- IsolationForest confidence is `abs(anomaly_score)`, which is not guaranteed to be calibrated to 0-1.

Conclusion: **Useful for lab demos, not real bot management.**

#### DDoS / Rate Abuse

**Very basic.**

`backend/utils/trafficMonitor.js` tracks timestamps in memory per IP over a 10-second window.

Problems:

- Per-process only; breaks across multiple Node instances.
- No Redis/shared store.
- No route-specific limits.
- No account/user/device dimension.
- No sliding-window persistence across restarts.
- Easy to bypass with distributed IPs or spoofed headers if proxy trust is not configured.

Conclusion: **Not production DDoS protection. At best, local request burst scoring.**

### Does It Respond in Real Time?

**Yes in the narrow proxy path, but not safely.**

`backend/controllers/proxy.controller.js` can analyze a request and return `403` when the decision is `block` and `shadowMode` is false.

However:

- The decision path waits synchronously for feature extraction, BiLSTM, XSS, and optional bot/behavior ML calls.
- Axios calls have no configured timeout.
- If FastAPI is slow, request latency can spike or hang.
- If FastAPI calls fail, the code falls back to score `0`, which means fail-open.
- Email alerts are awaited in the request path, adding avoidable latency.

Conclusion: **Real-time blocking exists, but the reliability model is not production-grade.**

### Does It Log and Track Attacks Properly?

**Partially.**

Good:

- MongoDB log model exists.
- Tenant ID is included.
- Payload redaction and hash are implemented.
- SSE log streaming exists.
- Alerts are derived from blocked/alert decisions.

Problems:

- If MongoDB fails, logs fall back to in-memory storage and disappear on restart.
- Falling back to memory hides a serious production outage.
- Log schema is too loose (`prediction: Object`, `override: Object`) for analytics and compliance.
- No retention policy, TTL index, immutable audit trail, export controls, or tamper resistance.
- No request ID/correlation ID.
- No model version, policy version, latency, error state, or upstream status in logs.
- No false-positive feedback labels.

Conclusion: **Good demo logging, not audit-grade security logging.**

### Fake or Placeholder Functionality

Brutally honest list:

- Frontend login is fake: hardcoded `admin/admin123` stored in localStorage.
- Setup docs still describe demo mode and local-only operation.
- API auth is optional: if `API_KEYS` is empty, every `/api/*` request is allowed.
- Bot detection depends on client-supplied flow features, not real traffic-derived flow data.
- User behavior detection depends on client-supplied `sessions`, not actual session reconstruction.
- IP reputation returns dummy score when no AbuseIPDB key is present.
- GeoIP depends on local MaxMind DB, with fallback to Unknown.
- DDoS detection is in-memory and single-node.
- There is no true managed rule set comparable to OWASP CRS.
- No production deployment assets exist in the reviewed tree: no Dockerfile, Compose, Terraform, Kubernetes, or Nginx config.
- No meaningful tests for WAF behavior.

---

## Part 2: AI Component Evaluation

### Is It Truly Intelligent or Rule-Based?

It is more than rule-based because there are real ML artifacts:

- BiLSTM payload detector.
- XSS BiLSTM detector.
- RandomForest bot model.
- IsolationForest bot model.
- Behavior LSTM model.

But production intelligence is unproven.

Missing proof:

- Training datasets are not documented in a production-ready way.
- No precision, recall, F1, ROC-AUC, false-positive rate, false-negative rate, or confusion matrix is shipped.
- No adversarial/evasion test suite.
- No model versioning in decisions.
- No calibration validation.
- No drift detection.
- No explainability beyond raw model scores.
- No feedback loop from analyst review.

### Generalizing or Overfitting?

Unknown, and that is a major risk.

For a WAF startup, "unknown" means **assume overfitting until proven otherwise**.

The models may perform well against training-like examples but fail on:

- Encoded payloads.
- Mixed-case and comment-obfuscated SQLi.
- DOM XSS variants.
- JSON/XML/multipart payloads.
- API-specific abuse.
- Slow brute force.
- Distributed low-rate bot traffic.
- Business-logic attacks.

### Useful in Production?

Useful only as an assistive scoring layer after hardening.

For production MVP:

- Keep ML out of the critical path for heavy analysis.
- Use a fast rule/heuristic layer inline.
- Run expensive ML in shadow/async mode first.
- Block automatically only on high-confidence deterministic signals.
- Require tenant-specific tuning and false-positive review.

Current AI is **not ready to be trusted as the primary blocker**.

---

## Part 3: Architecture and Code Quality

### Backend Structure

Good:

- Express backend is separated from FastAPI inference service.
- Controllers/routes/models/utilities are reasonably organized.
- Policy persistence exists through MongoDB.
- Proxy route exists.
- Log stream via SSE is simple and useful.

Problems:

- Decision orchestration is tightly coupled to every model endpoint.
- No timeout, retry, circuit breaker, or degradation policy.
- The request path mixes detection, persistence, streaming, and alerting.
- Email alert delivery happens inside the detection path.
- MongoDB failure is treated as acceptable demo mode.
- No centralized error taxonomy.
- No request correlation ID.
- No API schema/OpenAPI for Node backend.

### FastAPI Structure

Good:

- Combined app mounts separate model routers.
- Startup loads models.
- Health endpoints exist for some models.

Problems:

- Heavy TensorFlow model inference is synchronous inside request handlers.
- No auth on FastAPI endpoints.
- No rate limiting on inference endpoints.
- No model metadata endpoint with version/checksum/training date.
- No batching strategy from Node to FastAPI.
- No GPU/CPU resource isolation plan.
- Paths with spaces/hyphens (`bot detection`, `feature-extractor`) are awkward for deployment.

### API Design

Prototype-grade.

Issues:

- `/api/decision/analyze` accepts caller-provided IP, method, path, UA, flow, and sessions. A malicious caller can forge context.
- `/api/proxy/*` lets the target come from `x-proxy-target`, which is dangerous.
- No typed shared contract between Node and FastAPI.
- No idempotency, request IDs, or versioned API.
- No RBAC for admin/policy/report routes.

### Database Schema

Basic but not production-ready.

Needs:

- Structured prediction subdocument.
- Policy version field.
- Model version fields.
- Latency/error fields per detector.
- Decision reason fields.
- Indexes for `{ tenantId, createdAt }`, `{ tenantId, decision, createdAt }`, `{ tenantId, ip, createdAt }`.
- TTL/retention controls.
- Separate collections for tenants, API keys, users, policies, alerts, incidents, feedback labels.

### Production-Ready or Academic Code?

**Closer to academic/prototype code.**

The concept is valid, but the implementation still optimizes for "show it working locally" rather than "operate safely under customer traffic."

---

## Part 4: Performance and Scalability

### Can It Handle Real Traffic?

Not yet.

Main bottlenecks:

- Every proxied request can trigger multiple HTTP calls to FastAPI.
- TensorFlow inference runs per request.
- No timeout on Axios.
- No async queue.
- No cache for repeated payload hashes.
- No batching.
- No backpressure.
- No load shedding.
- No Redis/shared rate limiter.
- No horizontal deployment configuration.
- MongoDB writes happen on every request.
- Email alerting can run inside the request path.

### Latency Risk

A real WAF should add very low latency. For many SaaS apps, an inline security layer should aim for roughly:

- P50 under 5-10 ms for common allow path.
- P95 under 25-50 ms depending on deployment.
- Hard timeout/fail policy for analysis.

Current design could add tens to hundreds of milliseconds, and worse under load.

### Async Handling

FastAPI endpoints are mostly synchronous model calls. Node uses `Promise.allSettled`, which is good for parallelizing detector calls, but the request still waits for all detector results.

Needed:

- Inline fast path: normalization, OWASP CRS-style rules, lightweight scoring.
- Async path: ML enrichment, incident creation, dashboard updates.
- Timeout budget per detector, such as 50-100 ms total for inline checks.
- Circuit breaker: if ML service is unhealthy, switch to deterministic rules and alert ops.

### High-Scale Recommendations

- Put Nginx/Envoy/HAProxy in front as the actual reverse proxy.
- Use ModSecurity + OWASP CRS as baseline deterministic detection.
- Use Redis for distributed rate limits and counters.
- Use BullMQ or Kafka for async ML enrichment.
- Use ONNX Runtime for lightweight inference where possible.
- Cache payload-hash/model decisions for repeated attacks.
- Store logs asynchronously with bounded queue and dead-letter behavior.
- Add Prometheus metrics and OpenTelemetry traces.
- Run FastAPI model service as separately autoscaled workers.

---

## Part 5: Security Evaluation

### Can It Be Bypassed Easily?

Yes.

Bypass paths:

- Direct-to-origin bypass if customer origin is publicly reachable.
- Encoded/obfuscated payloads due to weak normalization.
- Multipart/form-data not inspected deeply.
- Cookies/headers not fully inspected.
- Query/body/path normalization is incomplete.
- Brute force and credential stuffing are not detected.
- Distributed low-rate traffic bypasses in-memory IP counters.
- FastAPI outage causes detector scores to default to zero.
- If `API_KEYS` is unset, API routes are open.

### System Vulnerabilities

Critical:

- `x-proxy-target` can define upstream target. This can become SSRF/open proxy behavior.
- CORS is wide open.
- Frontend admin auth is fake.
- FastAPI has no auth.
- API key comparison is plain string comparison, not constant-time.
- No secure admin session/JWT/OAuth.
- No CSRF strategy for browser admin actions.
- No rate limiting on dashboard/API/inference endpoints.
- No request size limit beyond Express default JSON behavior.
- No security headers/helmet.
- No input schema validation on Node request bodies.
- No secret manager.

### Rate Limiting

Only a local in-memory score exists. This is not sufficient.

Required:

- Redis-backed rate limiter.
- Per-tenant quotas.
- Per-IP and per-route limits.
- Login-specific counters by username/account.
- Burst and sustained windows.
- Penalty box / temporary block list.

### Input Sanitization

Weak.

The system does not appear to canonicalize:

- URL encoding.
- HTML entities.
- Unicode tricks.
- SQL comments.
- JSON nesting.
- Multipart fields.
- Base64 wrappers.
- Compression.

For a WAF, canonicalization is not optional.

### Authentication

Not production-safe.

Backend API key auth is optional. Frontend auth is local mock auth. FastAPI has no auth. There is no user model, password hashing, RBAC, tenant membership, audit log, or session invalidation.

---

## Part 6: Testing and Reliability

### Current Test State

There is no meaningful automated test suite for the WAF.

Observed:

- `backend/package.json` has `"test": "echo \"Error: no test specified\" && exit 1`.
- Frontend has lint/build scripts but no tests.
- FastAPI has model/manual test scripts, but not a real API reliability suite.
- Existing `ddostest` appears to be a load/DDOS test utility, not integrated CI coverage.

### Required Test Coverage Before MVP

Unit tests:

- Score calculation, including XSS contribution.
- Policy thresholds and shadow mode.
- Redaction and hashing.
- Rate limiter behavior.
- Auth middleware.
- Proxy upstream validation.

Integration tests:

- Clean request is allowed and proxied.
- SQLi request is blocked.
- XSS request is blocked.
- Alert request logs but does not block when below block threshold.
- Shadow mode logs block decision but forwards request.
- FastAPI timeout behavior is deterministic.
- MongoDB unavailable behavior is explicit and observable.

Security tests:

- SSRF attempts through proxy target are rejected.
- API routes reject missing/invalid API keys in production config.
- Direct FastAPI access requires auth/network isolation.
- Oversized payloads rejected.
- Obfuscated attack payload corpus tested.

Load tests:

- P50/P95/P99 latency under expected RPS.
- FastAPI saturation behavior.
- MongoDB write pressure.
- Redis rate limiter behavior under concurrency.

Reliability:

- Health checks.
- Readiness checks for model loaded state.
- Graceful shutdown.
- Queue backpressure.
- Alert delivery retry/dead-letter.

---

## Part 7: MVP Criteria Check

### Required MVP Criteria

| Criterion | Current State | MVP Verdict |
|---|---|---|
| Real inline blocking | Exists through Express proxy | Partial |
| Common attack coverage | SQLi/XSS partial, brute force missing | Fail |
| Low-latency allow path | Heavy synchronous model calls | Fail |
| Reliable logging | MongoDB plus memory fallback | Partial |
| Production auth | Optional API keys, fake frontend auth | Fail |
| Tenant isolation | Tenant field exists, weak auth boundary | Partial |
| Admin dashboard | Present | Partial |
| Policy control | Backend policy exists | Partial |
| Testing | Almost absent | Fail |
| Deployment | Local setup only | Fail |
| Monitoring | Not enough | Fail |

### Final MVP Decision

**Not ready to launch.**

Best classification:

**Prototype / internal alpha.**

It can be shown to advisors, classmates, early pilot partners, or investors as a technical demo. It should not be sold as a protective production WAF yet.

---

## Part 8: Top 5 Must-Fix Before MVP

### 1. Lock Down Proxy and Auth

Severity: Critical

Fix:

- Remove `x-proxy-target` as a general target selector.
- Store allowed upstream origins per tenant in DB/config.
- Require API keys/JWT in production.
- Add real admin auth with password hashing or OAuth.
- Network-isolate FastAPI so only backend can call it.

Why:

Current behavior risks open proxy/SSRF and unauthenticated access.

### 2. Add Production Decision Safety

Severity: Critical

Fix:

- Add detector timeouts.
- Add circuit breaker.
- Decide fail-open vs fail-closed per tenant/policy.
- Log detector failures explicitly.
- Do not silently convert model failures to safe scores.
- Move email/webhook alerting out of request path.

Why:

A WAF cannot quietly stop analyzing traffic and call it safe.

### 3. Add Real WAF Coverage and Canonicalization

Severity: Critical

Fix:

- Add normalization pipeline.
- Add OWASP CRS/ModSecurity or equivalent deterministic rule layer.
- Inspect query, path, headers, cookies, JSON, forms, and multipart.
- Add brute force/credential stuffing detection.
- Add route/account/device-aware rate limits.

Why:

ML-only detection will be bypassed. Production WAFs need layered controls.

### 4. Fix Scoring and Model Semantics

Severity: High

Fix:

- Include XSS in weighted threat score.
- Use bot prediction label plus confidence, not confidence alone.
- Normalize IsolationForest scores.
- Store model version and decision explanation.
- Add threshold calibration from validation data.

Why:

Current scoring can underweight XSS and over-score normal bot predictions.

### 5. Add Tests, CI, and Deployment Assets

Severity: High

Fix:

- Add Jest/Supertest for Node.
- Add pytest/FastAPI TestClient for Python.
- Add attack corpus tests.
- Add Dockerfiles and docker-compose.
- Add GitHub Actions or equivalent CI.
- Add Prometheus/OpenTelemetry.

Why:

Without tests and deployment automation, every change is a production risk.

---

## Quick Wins vs Major Rebuilds

### Quick Wins: 1-5 Days

- Add `helmet`, CORS allowlist, request body size limits.
- Make `API_KEYS` required in production.
- Remove or restrict `x-proxy-target`.
- Add Axios timeouts for all FastAPI calls.
- Include `xss` in `calculateThreatScore`.
- Log detector failures and latency.
- Add indexes to Log schema.
- Add `npm test` with basic controller/unit tests.
- Add `/health` and `/ready` endpoints for Node.
- Add Dockerfile for backend/frontend/FastAPI.

### Medium Work: 1-2 Weeks

- Redis-backed rate limiting.
- Real admin auth and RBAC.
- Async alert queue using BullMQ.
- Policy UI connected to backend.
- Brute-force detector.
- Model metadata/version endpoints.
- Attack corpus regression suite.
- Shadow mode that records would-block decisions separately.

### Major Rebuilds: 2-6 Weeks

- Proper Nginx/Envoy gateway architecture.
- OWASP CRS/ModSecurity integration.
- Full canonicalization pipeline.
- Async ML enrichment architecture.
- Tenant onboarding, API key management, and upstream config.
- Observability stack with traces, metrics, and dashboards.
- Model evaluation/training pipeline with drift monitoring.

---

## 2-4 Week MVP Upgrade Plan

### Week 1: Make It Safe Enough to Put in Front of a Test App

Goals:

- Remove obvious security footguns.
- Make decisions deterministic under failure.
- Add minimum tests.

Tasks:

- Require `API_KEYS` when `NODE_ENV=production`.
- Replace `x-proxy-target` with tenant-configured upstream allowlist.
- Add request body size limits and content-type handling.
- Add `helmet` and strict CORS allowlist.
- Add Axios timeout, such as 100 ms per detector for inline mode.
- Add circuit breaker around FastAPI.
- Add detector failure fields to logs.
- Fix XSS scoring.
- Fix bot score semantics.
- Add basic Jest/Supertest coverage for allow/block/shadow/error paths.

Tools:

- `helmet`
- `express-rate-limit` for temporary local protection
- `joi` or `zod` for Node request validation
- `jest` + `supertest`

### Week 2: Add Real WAF Baseline Controls

Goals:

- Stop relying on ML alone.
- Add brute-force and rate-limit primitives.

Tasks:

- Add normalization/canonicalization module.
- Add deterministic rules for common SQLi/XSS/RCE/LFI/path traversal.
- Add Redis-backed rate limiter.
- Add login brute-force tracking by tenant, route, username, IP.
- Add blocklist/allowlist per tenant.
- Add shadow mode field: `effectiveDecision` vs `observedDecision`.
- Add payload corpus tests from OWASP examples.

Tools:

- Redis
- `rate-limiter-flexible`
- OWASP CRS via ModSecurity/Nginx, or a simpler first-pass custom rule set if time is limited

### Week 3: Productionize Deployment and Observability

Goals:

- Make it deployable and observable.

Tasks:

- Add Dockerfiles for backend, frontend, FastAPI.
- Add `docker-compose.yml` with MongoDB, Redis, backend, FastAPI, frontend/Nginx.
- Add Nginx reverse proxy config.
- Add Prometheus metrics endpoint.
- Add OpenTelemetry trace IDs through proxy -> backend -> FastAPI.
- Add structured JSON logging.
- Add health/readiness endpoints.
- Move email alerts to queue worker.
- Add webhook alert option.

Tools:

- Docker
- Docker Compose
- Nginx
- Prometheus
- OpenTelemetry
- BullMQ

### Week 4: Pilot-Ready SaaS Layer

Goals:

- Prepare for controlled pilot, not public launch.

Tasks:

- Add tenant model.
- Add API key management.
- Add admin user model with hashed passwords.
- Add RBAC roles: owner, admin, viewer.
- Add policy versioning.
- Add feedback labels: false positive, true positive, ignored.
- Add report export.
- Add attack simulation CI job.
- Run load test and document P95/P99 latency.

Tools:

- `bcrypt` or `argon2`
- JWT or managed auth provider
- Locust or k6
- GitHub Actions

---

## Suggested Deployment Architecture

### MVP Pilot Architecture

```text
Client
  |
Cloudflare / AWS ALB
  |
Nginx or Envoy Reverse Proxy
  |
AI-WAF Inline Service (Node)
  |       |
  |       +-- Redis: counters, rate limits, circuit state
  |       +-- MongoDB/Postgres: logs, policies, tenants
  |       +-- Queue: async analysis and alerts
  |
Customer Origin App

Async path:
Queue -> FastAPI Model Workers -> Alert/Incident Store -> Dashboard
```

### AWS Option

- ECS Fargate for Node backend and FastAPI workers.
- ALB for public entry.
- ElastiCache Redis for counters/rate limits.
- DocumentDB or MongoDB Atlas for logs; Postgres/RDS is better long-term for SaaS metadata.
- S3 for exports/model artifacts.
- CloudWatch logs/metrics initially, Prometheus later.
- Secrets Manager for API keys and email/webhook secrets.

### Docker/Nginx Option for First Pilot

- `nginx` container as public reverse proxy.
- `backend` container for decision/proxy API.
- `fastapi` container for model inference.
- `mongodb` container for logs.
- `redis` container for rate limits.
- `worker` container for alert queue.

---

## Launch Readiness Gate

Do not call this MVP-ready until all of these are true:

- API auth cannot be disabled accidentally in production.
- Proxy upstreams are tenant-configured and allowlisted.
- FastAPI is private and authenticated.
- Detector timeout/circuit breaker behavior is tested.
- XSS/SQLi/brute force tests pass in CI.
- Rate limiting works across multiple backend instances.
- Logs persist without falling back silently to memory.
- Dashboard auth is real.
- Docker deployment runs end-to-end.
- You have latency numbers under load.
- You have false-positive/false-negative measurements on a labeled attack corpus.

---

## Brutal Truth

This is a promising prototype, not a sellable WAF yet.

The best thing about the project is that it has an actual end-to-end shape: proxy, detector calls, policy, logging, alerts, dashboard. That is more than a mockup.

The dangerous part is that it can look production-like while still failing the things customers care about most: bypass resistance, predictable latency, safe failure behavior, real authentication, reliable logs, and provable detection quality.

For a startup MVP, narrow the scope:

- Position it as an **AI-assisted WAF for SaaS/API pilot deployments in shadow mode first**.
- Do not promise full DDoS protection.
- Do not promise zero-day blocking without evidence.
- Do not let ML be the only blocker.
- Use deterministic rules and rate limits inline, ML for scoring, explanation, and analyst review.

With 2-4 focused weeks, this can become a credible **pilot MVP**. It is not ready for a public production launch today.
