from typing import List, Optional
import os
import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import load_model

# ------------
# Config
# ------------
MODEL_PATH = "behavior_lstm_model.h5"
ENCODER_PATH = "action_encoder.pkl"
MAXLEN = 20

app = FastAPI(title="Behavior LSTM Inference API", version="1.0.0")

# ------------
# Schemas
# ------------


class EventItem(BaseModel):
    Event: str = Field(..., description="Event name, e.g., Click, View")
    page_name: str = Field(..., description="Page name, e.g., Home, Product")
    browser_type: str = Field(..., description="Browser, e.g., Chrome, Safari")


class SessionInput(BaseModel):
    sessn_id: str
    events: List[EventItem]


class PredictRequest(BaseModel):
    sessions: List[SessionInput]


class SessionPrediction(BaseModel):
    sessn_id: str
    probability: float
    label: int


class PredictResponse(BaseModel):
    predictions: List[SessionPrediction]


# ------------
# Artifacts loading
# ------------
model = None
encoder = None
label_to_index = None
unknown_idx: Optional[int] = None


def _combine_token(e: EventItem) -> str:
    # Must match training logic exactly: Event + '_' + page_name + '_' + browser_type
    return f"{e.Event}_{e.page_name}_{e.browser_type}"


def load_artifacts():
    global model, encoder, label_to_index, unknown_idx

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file '{MODEL_PATH}' not found. Train the model first (runs 'train_behavior_lstm.py')."
        )
    if not os.path.exists(ENCODER_PATH):
        raise RuntimeError(
            f"Encoder file '{ENCODER_PATH}' not found. Train the model first (runs 'train_behavior_lstm.py')."
        )

    # Load Keras model
    model = load_model(MODEL_PATH)

    # Load LabelEncoder
    with open(ENCODER_PATH, "rb") as f:
        encoder_obj = pickle.load(f)
    # Build a token->index mapping and an unknown bucket index
    classes = list(encoder_obj.classes_)
    label_to_index = {label: idx for idx, label in enumerate(classes)}
    # Reserve an unknown token index at the end of the embedding space
    unknown_idx = len(classes)


load_artifacts()

# ------------
# Inference utils
# ------------


def encode_session(events: List[EventItem]) -> List[int]:
    # Convert structured events to tokens and then indices
    tokens = [_combine_token(e) for e in events]
    indices = [label_to_index.get(tok, unknown_idx) for tok in tokens]
    return indices


# ------------
# Routes
# ------------
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.sessions:
        raise HTTPException(status_code=400, detail="No sessions provided")

    # Encode all sessions to build a batch
    seqs = [encode_session(s.events) if s.events else [] for s in req.sessions]
    # Pad to MAXLEN on the right (post)
    X = pad_sequences(seqs, maxlen=MAXLEN, padding="post", value=0)

    # Predict
    probs = model.predict(X).reshape(-1)
    labels = (probs >= 0.5).astype(int)

    predictions = [
        SessionPrediction(
            sessn_id=s.sessn_id,
            probability=float(p),
            label=int(l),
        )
        for s, p, l in zip(req.sessions, probs, labels)
    ]

    return PredictResponse(predictions=predictions)


# Optional: local dev runner (uvicorn-style)
# Run: uvicorn app:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
