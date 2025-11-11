# Combined FastAPI Endpoints (FastApi/app.py)

This document lists the endpoints exposed by `FastApi/app.py`, which combines four model APIs under distinct prefixes.

Mount points:

- BILSTM endpoints: `/bilstm/*`

# Combined FastAPI Endpoints (FastApi/app.py)

This file documents the endpoints exposed by `FastApi/app.py`. The app mounts several model services under distinct prefixes and a feature-extractor service under `/feature`.

Mount points:

- BILSTM endpoints: `/bilstm/*`
- Bot Detection endpoints: `/bot/*`
- User Behaviour endpoints: `/behaviour/*`
- XSS endpoints: `/xss/*`
- Feature extractor: `/feature/*`

---

## BILSTM Payload Detector (/bilstm)

- POST /bilstm/predict
  - Request JSON: `{ "text": "single string" }` or `{ "text": ["str1", "str2"] }`
  - Response JSON: `{ "results": [ { "input": "...", "label": "sql_injection|safe", "confidence": 0.123 } ] }`
  - Notes: model and tokenizer must be present under `FastApi/BiLstm/` (files: `bilstm_payload_detector.h5`, `tokenizer.json`, optionally `word_index.json`).

---

## Bot Detection (/bot)

- GET /bot/health

  - Returns model availability flags for supervised (rf) and unsupervised (iso).

- POST /bot/predict/supervised

  - Body: TrafficFlow JSON (see schema in `app.py`)
  - Response: `{ prediction, prediction_label, confidence, model_type }`

- POST /bot/predict/unsupervised

  - Body: TrafficFlow JSON
  - Response: `{ prediction, prediction_label, confidence, model_type }`

- POST /bot/predict/batch
  - Body: `{ "model_type": "rf" | "iso", "flows": [ {TrafficFlow}, ... ] }`
  - Response: `{ "predictions": [...], "total": N }`

Notes: bot models and scalers are expected under `FastApi/bot detection/` as pickle files (see `rf_bot_model.pkl`, `rf_bot_scaler.pkl`, `isolation_forest_bot_model.pkl`, `isolation_forest_bot_scaler.pkl`).

---

## User Behaviour (/behaviour)

- POST /behaviour/predict
  - Body: `{ "sessions": [ { "sessn_id": "id", "events": [ {"Event":"Click","page_name":"Home","browser_type":"Chrome"}, ... ] }, ... ] }`
  - Response: `{ "predictions": [ {"sessn_id": "...", "probability": 0.123, "label": 0|1 }, ... ] }`

Notes: requires `behavior_lstm_model.h5` and `action_encoder.pkl` under `FastApi/User_Behaviour/`.

---

## XSS Detector (/xss)

- GET /xss/

  - Simple landing route with advertised endpoints.

- GET /xss/health

  - Returns status and loaded tokenizer maxlen if available.

- POST /xss/predict?threshold=0.5

  - Body: `{ "payload": "..." }`
  - Response: `{ payload, prob_malicious, pred_label, threshold }`

- POST /xss/predict/batch?threshold=0.5
  - Body: `{ "payloads": ["...", "..."] }`
  - Response: `{ results: [ {payload, prob_malicious, pred_label, threshold}, ... ], threshold }`

Notes: XSS model/tokenizer expected under `FastApi/XSS/`. Tokenizer can be a pickle containing `{"tokenizer":..., "maxlen":...}` or a raw tokenizer object.

---

## Feature Extractor (/feature)

- POST /feature/extract_features

  - Body JSON (example): `{ "payload": "<input string>", "ip": "1.2.3.4", "ua": "User-Agent string" }`
  - Response JSON:
    {
    "payload_hash": "<md5_hex>",
    "tokens": ["..."],
    "entropy": 3.142,
    "geo": {"ip": "1.2.3.4", "country": "...", "city": "...", "latitude": ..., "longitude": ...},
    "reputation_score": 10,
    "user_agent": "..."
    }

  - Notes:
    - The combined app dynamically loads helper modules from `FastApi/feature-extractor/`:
      - `geoip_utils.py` (uses `geoip2` and `GeoLite2-City.mmdb` if available)
      - `reputation_api.py` (optionally uses `ABUSEIPDB_API_KEY` env var)
      - `tokenizer/payload_tokenizer.py` (simple tokenization utility)
    - If any helper is missing or fails to load, the app returns safe fallbacks (unknown geo, reputation 0, empty tokens) and logs a warning.

---

## Requirements and runtime notes

- A combined `FastApi/requirements.txt` was added. It lists broad dependencies used across the mounted services (FastAPI, Uvicorn, TensorFlow, joblib, scikit-learn, geoip2, requests, etc.). For a stable environment on Windows, pin exact versions and prefer `tensorflow-cpu` if you don't have CUDA.
- For GeoIP lookups you need a MaxMind DB file (e.g. `GeoLite2-City.mmdb`) placed where `geoip_utils.py` expects it (the example code looks for `./GeoLite2-City.mmdb`).
- For IP reputation using AbuseIPDB supply `ABUSEIPDB_API_KEY` in the environment to avoid fallback values.

---

## How to run (quick)

From the `FastApi` folder run:

```pwsh
# install dependencies (adjust/pin versions as needed):
pip install -r requirements.txt

# run the combined app:
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI will be available at `/docs` and ReDoc at `/redoc`.

---

If you'd like, I can:

- Run a quick smoke-start of the app and paste the startup logs.
- Pin versions in `requirements.txt` to match each submodule.
- Refactor the `feature-extractor` folder into a proper package (optional but cleaner than dynamic imports).

Tell me which of those you prefer.

\*\*\* End Patch
