import os
import pickle
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

# TensorFlow / Keras
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = FastAPI(title="XSS Detector API", version="1.0.0")


# --------- Config / Paths ---------
DEFAULT_MODEL_CANDIDATES = [
    os.getenv("MODEL_PATH"),
    os.path.join("models", "xss_bilstm_model.h5"),
    "xss_bilstm_model.h5",
]
DEFAULT_TOKENIZER_CANDIDATES = [
    os.getenv("TOKENIZER_PATH"),
    os.path.join("models", "xss_tokenizer.pkl"),
    "xss_tokenizer.pkl",
]


class PredictRequest(BaseModel):
    payload: str = Field(...,
                         description="The input string to classify for XSS risk")


class PredictBatchRequest(BaseModel):
    payloads: List[str] = Field(...,
                                description="List of input strings to classify")


class PredictResponse(BaseModel):
    payload: str
    prob_malicious: float
    pred_label: int
    threshold: float


class PredictBatchResponse(BaseModel):
    results: List[PredictResponse]
    threshold: float


# --------- Model / Tokenizer holders ---------
model: Optional[tf.keras.Model] = None
_tokenizer = None
_saved_maxlen: Optional[int] = None


# --------- Utilities ---------

def _first_existing(paths: List[Optional[str]]) -> Optional[str]:
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def load_model_and_tokenizer() -> None:
    global model, _tokenizer, _saved_maxlen

    model_path = _first_existing(DEFAULT_MODEL_CANDIDATES)
    tok_path = _first_existing(DEFAULT_TOKENIZER_CANDIDATES)

    if not model_path:
        raise FileNotFoundError(
            "Keras model not found. Set MODEL_PATH or place xss_bilstm_model.h5 in project or models/"
        )
    if not tok_path:
        raise FileNotFoundError(
            "Tokenizer pickle not found. Set TOKENIZER_PATH or place xss_tokenizer.pkl in project or models/"
        )

    # Load model
    model = tf.keras.models.load_model(model_path)

    # Load tokenizer data
    data = pickle.load(open(tok_path, "rb"))
    if isinstance(data, dict) and "tokenizer" in data:
        _tokenizer = data["tokenizer"]
        _saved_maxlen = data.get("maxlen")
    else:
        _tokenizer = data
        _saved_maxlen = None


def _prepare_X(payloads: List[str], maxlen: Optional[int]):
    seqs = _tokenizer.texts_to_sequences(payloads)
    if maxlen is None:
        lengths = [len(s) for s in seqs]
        maxlen = min(max(lengths) if lengths else 200, 200)
    X = pad_sequences(seqs, maxlen=maxlen, padding="post", truncating="post")
    return X, maxlen


# Load at startup
@app.on_event("startup")
def _startup():
    load_model_and_tokenizer()


@app.get("/")
def root():
    """Simple landing route to avoid 404 on '/'."""
    return {
        "name": "XSS Detector API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "predict_single": "/predict",
            "predict_batch": "/predict/batch",
            "docs": "/docs"
        },
        "message": "Use POST /predict or POST /predict/batch. See /docs for interactive UI."
    }


@app.get("/health")
def health():
    ok = model is not None and _tokenizer is not None
    return {"status": "ok" if ok else "missing-artifacts", "maxlen": _saved_maxlen}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    if model is None or _tokenizer is None:
        raise HTTPException(
            status_code=500, detail="Model or tokenizer not loaded")

    payloads = [req.payload or ""]
    X, used_maxlen = _prepare_X(payloads, _saved_maxlen)

    probs = model.predict(X, batch_size=1).ravel().astype(float)
    prob = float(probs[0])
    pred = int(prob >= threshold)

    return PredictResponse(
        payload=req.payload,
        prob_malicious=prob,
        pred_label=pred,
        threshold=threshold,
    )


@app.post("/predict/batch", response_model=PredictBatchResponse)
def predict_batch(req: PredictBatchRequest, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    if model is None or _tokenizer is None:
        raise HTTPException(
            status_code=500, detail="Model or tokenizer not loaded")

    payloads = [p or "" for p in req.payloads]
    if len(payloads) == 0:
        raise HTTPException(
            status_code=400, detail="payloads must be a non-empty list")

    X, used_maxlen = _prepare_X(payloads, _saved_maxlen)
    probs = model.predict(X, batch_size=min(
        len(payloads), 128)).ravel().astype(float)

    results = [
        PredictResponse(
            payload=payloads[i],
            prob_malicious=float(probs[i]),
            pred_label=int(probs[i] >= threshold),
            threshold=threshold,
        )
        for i in range(len(payloads))
    ]

    return PredictBatchResponse(results=results, threshold=threshold)


if __name__ == "__main__":
    # Optional: run with `python app.py` (for dev only); prefer `uvicorn app:app --reload`
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(
        os.getenv("PORT", 8000)), reload=False)
