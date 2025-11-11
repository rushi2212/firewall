from typing import List, Union
import os
import json
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import tokenizer_from_json, Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# --- Configuration ---
MODEL_PATH = "bilstm_payload_detector.h5"
TOKENIZER_PATH = "tokenizer.json"
WORD_INDEX_PATH = "word_index.json"
MAX_LEN = 100

app = FastAPI(title="BILSTM Payload Detector",
              description="Detects SQL-injection-like payloads using a pretrained BiLSTM model",
              version="1.0")

logger = logging.getLogger("uvicorn.error")


class PredictRequest(BaseModel):
    # Accept a single string or a list of strings
    text: Union[str, List[str]]


def preprocess_text(text: str) -> str:
    text = text.lower().strip()
    text = " ".join(text.split())
    return text


def load_tokenizer(path: str):
    if os.path.exists(path) and os.path.getsize(path) > 10:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                raw = f.read()
            tok = tokenizer_from_json(raw)
            logger.info(f"Loaded tokenizer from {path}")
            return tok
        except Exception as e:
            logger.warning(f"Failed to load tokenizer_from_json: {e}")

    # Fallback: try loading word_index.json and reconstruct a Tokenizer
    if os.path.exists(WORD_INDEX_PATH) and os.path.getsize(WORD_INDEX_PATH) > 10:
        try:
            with open(WORD_INDEX_PATH, 'r', encoding='utf-8') as f:
                wi = json.load(f)
            tok = Tokenizer()  # minimal tokenizer
            tok.word_index = wi
            # Build index_word for safety
            tok.index_word = {int(v): k for k, v in wi.items()}
            logger.info(f"Reconstructed tokenizer from {WORD_INDEX_PATH}")
            return tok
        except Exception as e:
            logger.warning(f"Failed to reconstruct tokenizer from word_index.json: {e}")

    logger.error("No usable tokenizer found (tokenizer.json or word_index.json).")
    return None


@app.on_event("startup")
def startup_load_model_and_tokenizer():
    # Load model
    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model file not found at {MODEL_PATH}")
        # We still allow the app to start but predictions will fail with clear error
        app.state.model = None
    else:
        try:
            app.state.model = tf.keras.models.load_model(MODEL_PATH)
            logger.info(f"Loaded model from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            app.state.model = None

    # Load tokenizer
    app.state.tokenizer = load_tokenizer(TOKENIZER_PATH)


@app.post('/predict')
def predict(req: PredictRequest):
    model = app.state.model
    tokenizer = app.state.tokenizer
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server.")
    if tokenizer is None:
        raise HTTPException(status_code=500, detail="Tokenizer not available on server.")

    texts = req.text
    if isinstance(texts, str):
        texts = [texts]
    if not isinstance(texts, list) or len(texts) == 0:
        raise HTTPException(status_code=400, detail="`text` must be a non-empty string or list of strings")

    processed = [preprocess_text(t) for t in texts]

    try:
        sequences = tokenizer.texts_to_sequences(processed)
    except Exception as e:
        logger.error(f"Error converting texts to sequences: {e}")
        raise HTTPException(status_code=500, detail="Tokenizer failed to convert texts to sequences")

    pad = pad_sequences(sequences, maxlen=MAX_LEN, padding='post', truncating='post')

    try:
        preds = model.predict(pad)
    except Exception as e:
        logger.error(f"Model prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Model prediction failed")

    # Ensure shape (n, )
    preds = np.array(preds).reshape(-1)

    results = []
    for i, txt in enumerate(texts):
        conf = float(preds[i])
        label = "sql_injection" if conf > 0.5 else "safe"
        results.append({
            "input": txt,
            "label": label,
            "confidence": round(conf, 6)
        })

    return {"results": results}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")
