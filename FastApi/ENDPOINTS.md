# Combined FastAPI Endpoints (FastApi/app.py)

This document lists the endpoints exposed by `FastApi/app.py`, which combines four model APIs under distinct prefixes.

Mount points:

- BILSTM endpoints: `/bilstm/*`
- Bot Detection endpoints: `/bot/*`
- User Behaviour endpoints: `/behaviour/*`
- XSS endpoints: `/xss/*`

---

## BILSTM Payload Detector (/bilstm)

- POST /bilstm/predict
  - Request JSON: { "text": "single string" } or { "text": ["str1", "str2"] }
  - Response: { "results": [ { "input": "...", "label": "sql_injection|safe", "confidence": 0.123 } ] }
  - Notes: model and tokenizer must be present under `FastApi/BiLstm/` (see `bilstm_payload_detector.h5`, `tokenizer.json`).

---

## Bot Detection (/bot)

- GET /bot/health

  - Returns model availability flags for supervised (rf) and unsupervised (iso).

- POST /bot/predict/supervised

  - Body: TrafficFlow JSON (see example in source)
  - Response: { prediction, prediction_label, confidence, model_type }

- POST /bot/predict/unsupervised

  - Body: TrafficFlow JSON
  - Response: { prediction, prediction_label, confidence, model_type }

- POST /bot/predict/batch
  - Body: { "model_type": "rf"|"iso", "flows": [ {TrafficFlow}, ... ] }
  - Response: { "predictions": [...], "total": N }

Notes: bot models/scalers expected under `FastApi/bot detection/` (pickle files).

---

## User Behaviour (/behaviour)

- POST /behaviour/predict
  - Body: { "sessions": [ { "sessn_id": "id", "events": [ {"Event":"Click","page_name":"Home","browser_type":"Chrome"}, ... ] }, ... ] }
  - Response: { "predictions": [ {"sessn_id": "...", "probability": 0.123, "label": 0|1 }, ... ] }

Notes: requires `behavior_lstm_model.h5` and `action_encoder.pkl` under `FastApi/User_Behaviour/`.

---

## XSS Detector (/xss)

- GET /xss/

  - Simple landing with advertised endpoints

- GET /xss/health

  - Returns status and loaded maxlen

- POST /xss/predict?threshold=0.5

  - Body: { "payload": "..." }
  - Response: { payload, prob_malicious, pred_label, threshold }

- POST /xss/predict/batch?threshold=0.5
  - Body: { "payloads": ["...", "..."] }
  - Response: { results: [ {payload, prob_malicious, pred_label, threshold}, ... ], threshold }

Notes: XSS model/tokenizer expected under `FastApi/XSS/` (see file list in source). Tokenizer may be a pickle containing {"tokenizer":..., "maxlen":...}.

---

## How to run

From the `FastApi` folder run (recommended):

```pwsh
# install dependencies from each model folder if needed, then:
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI will be available at `/docs` on the host and shows all combined endpoints and schemas.

---

If you want changes (mountpoints, renaming, authentication, or to expose a single `/predict` that routes to a model selector), tell me which behavior you prefer and I can implement it.
