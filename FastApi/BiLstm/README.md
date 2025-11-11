# BILSTM Payload Detector — FastAPI

This small FastAPI backend exposes the pretrained BiLSTM model `bilstm_payload_detector.h5` with a single endpoint for predictions.

Files added:

- `app.py` — FastAPI application with `/predict` POST endpoint.
- `requirements.txt` — Python dependencies.
- `postman_sample.json` — example body to use in Postman.

How it works

- On startup the app attempts to load `bilstm_payload_detector.h5` and `tokenizer.json` (or falls back to `word_index.json`).
- The `/predict` endpoint accepts JSON with a `text` field that can be either a string or an array of strings. It returns a list of predictions with `label` and `confidence`.

Run locally (Windows PowerShell)

1. Create a virtual environment (recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install requirements:

```powershell
pip install -r requirements.txt
```

3. Start the server:

```powershell
python app.py
# or
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Postman sample

- URL: `POST http://localhost:8000/predict`
- Header: `Content-Type: application/json`
- Body (raw JSON): see `postman_sample.json`. Two examples are shown there.

Example request body (single string):

```json
{ "text": "SELECT * FROM users WHERE username = 'admin' --" }
```

Example request body (multiple):

```json
{ "text": ["SELECT * FROM users;", "Hello world"] }
```

Example response:

```json
{
  "results": [
    {
      "input": "SELECT * FROM users;",
      "label": "sql_injection",
      "confidence": 0.982345
    },
    { "input": "Hello world", "label": "safe", "confidence": 0.012345 }
  ]
}
```

Notes and troubleshooting

- If `tokenizer.json` is missing/empty the server will attempt to reconstruct a tokenizer from `word_index.json`. If both are missing the `/predict` endpoint will return a 500 explaining the tokenizer isn't available.
- TensorFlow can be large to install. If you don't need GPU support, the default `tensorflow` wheel will work for CPU-only usage.
