# AI-WAF Code Evaluation vs MVP Readiness

Date: 2026-05-01

Scope reviewed:
- Backend API + decision pipeline
- FastAPI ML services
- Frontend dashboard and alerts
- Logging, streaming, and config

---

## 1) MVP Readiness Summary

**Status:** Partially MVP-ready (demo-grade, not production-grade).

**Meets MVP intent:**
- End-to-end request analysis path exists: request → feature extraction → model scores → decision → log → alerts → dashboard.
- Works in demo mode even without MongoDB (in-memory fallback).
- Real-time log stream via SSE for live dashboard.

**Not MVP-ready for paying users:**
- Inline proxy / gateway not implemented (current API expects you to POST payload). No real HTTP traffic interception.
- No auth or tenant separation (single global data store).
- Policy tuning UI is mocked; thresholds are not wired to backend policy.
- Email alerting is fragile (Gmail direct transport, no queue, no retry).

---

## 2) Functional Coverage vs MVP Spec

**Inline request scoring (core):**
- Implemented as `POST /api/decision/analyze`, but not inline proxy.
- Files: [backend/controllers/decision.controller.js](backend/controllers/decision.controller.js#L1-L219), [backend/routes/decision.routes.js](backend/routes/decision.routes.js#L1-L7).

**Feature extraction:**
- ML service supports payload tokens, entropy, geo, reputation with fallbacks.
- Files: [FastApi/app.py](FastApi/app.py#L1-L120).

**Multi-model scoring:**
- BiLSTM payload, XSS, bot, behavior, DDoS score combined.
- Files: [backend/controllers/decision.controller.js](backend/controllers/decision.controller.js#L1-L219), [backend/utils/scoreCalculator.js](backend/utils/scoreCalculator.js#L1-L12).

**Policy decision (allow/alert/block):**
- Reads JSON policy and applies thresholds.
- Files: [backend/utils/policyManager.js](backend/utils/policyManager.js#L1-L21).

**Logging + dashboard:**
- Log model + SSE streaming + dashboard pages implemented.
- Files: [backend/models/Log.js](backend/models/Log.js#L1-L17), [backend/utils/logStream.js](backend/utils/logStream.js#L1-L30), [frontend/src/pages/PresentationDashboard.jsx](frontend/src/pages/PresentationDashboard.jsx#L1-L209).

**Alerts:**
- Email alerts + alert history page exist, but alerts are derived from logs only.
- Files: [backend/controllers/alerts.controller.js](backend/controllers/alerts.controller.js#L1-L23), [frontend/src/pages/Alerts.jsx](frontend/src/pages/Alerts.jsx#L1-L198).

**Reports / analytics:**
- Reporting endpoint exists with time range support and rollups.
- Files: [backend/controllers/reports.controller.js](backend/controllers/reports.controller.js#L1-L199).

---

## 3) Gaps Blocking MVP for Real Users

### A) Inline traffic interception (critical)
- The system does not sit in front of a real app. It requires payloads to be posted to `POST /api/decision/analyze`.
- Missing: reverse proxy (Nginx/Envoy) or middleware SDK to intercept live traffic.
- Impact: cannot be used as a true WAF in production.

### B) Multi-tenant isolation (critical)
- Single global dataset in MongoDB; no tenant ID or auth layer.
- Missing: API key, tenant-id, and RBAC guardrails.
- Impact: unsafe for multi-customer use.

### C) Model performance + latency (high)
- FastAPI loads heavy models; no inference queue or batching.
- LSTM inference per request adds unpredictable latency.
- Impact: risk of slow requests and timeouts under load.

### D) Configuration drift (high)
- Frontend settings are UI-only, not persisted or connected to backend policy.
- Policy is read from a JSON file on disk; no admin API to update.
- Impact: cannot tune safely in production.

### E) Alerting reliability (medium)
- Email uses Gmail transport; no queue, retry, or monitoring.
- Impact: alerts can be dropped, not audit-safe.

---

## 4) Security Risks in Current Code

- **No auth:** All endpoints are open, including logs and reports.
  - Files: [backend/app.js](backend/app.js#L1-L19), [backend/routes/logs.routes.js](backend/routes/logs.routes.js#L1-L12).
- **No rate limiting:** API can be abused to exhaust model inference.
- **Log PII risk:** Payloads are stored raw in logs.
  - Files: [backend/models/Log.js](backend/models/Log.js#L1-L17).
- **Email secrets in env:** Uses `EMAIL_PASS`; no secure secret manager.
  - Files: [backend/config/env.js](backend/config/env.js#L1-L10), [backend/utils/emailSender.js](backend/utils/emailSender.js#L1-L22).

---

## 5) MVP Matching Score (Code vs Plan)

| MVP Requirement | Status | Notes |
|---|---|---|
| Inline scoring | Partial | Works only via manual POST, not true proxy |
| Shadow mode | Missing | No dual-path or sample-only mode |
| Explainability | Partial | Logs show model scores, no explicit rationale |
| Dashboard | Good | UI exists and works with logs |
| Alerts | Partial | Email only, no webhooks/Slack |
| Tenant config | Missing | No auth, no tenant metadata |
| Model ops | Weak | No versioning, A/B, or drift tracking |

**Overall MVP Match:** 6/10

---

## 6) Suggested Updated MVP Plan (Code-Aligned)

### Phase 1 (0–4 weeks): Make it a real WAF
- Implement reverse proxy or middleware SDK
  - Option A: Nginx + Node sidecar
  - Option B: Express middleware for Node apps
- Add API key auth on all endpoints
- Add per-tenant log filtering (tenant_id field)

### Phase 2 (4–6 weeks): Production-safe controls
- Add policy update API + UI wire-up
- Add simple rate limiter on inference endpoints
- Add alert delivery via webhook (Slack/Teams)

### Phase 3 (6–8 weeks): Reliability + learning
- Add shadow mode (analyze without block)
- Add model confidence thresholds per tenant
- Add weekly drift report from logs

---

## 7) Suggested Code Changes (High Priority)

1) **Add auth middleware** for `/api/*`
   - Add API keys and a `tenantId` in logs.
2) **Create proxy path** to intercept real HTTP requests
   - Introduce `/proxy/*` and forward upstream.
3) **Persist policy in DB** instead of JSON file
   - Replace disk reads in [backend/utils/policyManager.js](backend/utils/policyManager.js#L1-L21).
4) **Sanitize payload logging** to remove secrets/PII.
5) **Add background queue** for heavy ML inference (Celery/RQ or BullMQ).

---

## 8) MVP Readiness Decision

**Decision:** Not yet funding-ready without real traffic interception and multi-tenant security. Strong demo potential, but a production MVP needs basic gateway, auth, and operational controls.

---

## 9) Next-Step Recommendations (Immediate)

- Implement proxy or middleware integration so it can run inline.
- Add auth + tenant ID.
- Wire policy sliders to backend API and persist settings.
- Reduce PII logging by default.

If you want, I can create a technical MVP backlog with exact user stories and acceptance criteria.