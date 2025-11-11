"""
FastAPI server for bot detection model inference.
Supports both supervised (RandomForest) and unsupervised (IsolationForest) models.
"""

import os
import joblib
import numpy as np
from typing import Dict, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ==============================
# Constants & Initialization
# ==============================
DEFAULT_FEATURES = [
    "Flow Duration",
    "Flow Byts/s",
    "Flow Pkts/s",
    "Pkt Len Mean",
    "Pkt Len Std",
    "Fwd Pkts/s",
    "Bwd Pkts/s",
    "Flow IAT Mean",
]

RF_MODEL_PATH = "rf_bot_model.pkl"
RF_SCALER_PATH = "rf_bot_scaler.pkl"
ISO_MODEL_PATH = "isolation_forest_bot_model.pkl"
ISO_SCALER_PATH = "isolation_forest_bot_scaler.pkl"

app = FastAPI(
    title="Bot Detection API",
    description="Detects bot/attack traffic using supervised RandomForest and unsupervised IsolationForest models.",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model storage
models = {
    "rf": {"model": None, "scaler": None},
    "iso": {"model": None, "scaler": None},
}


# ==============================
# Pydantic Models
# ==============================
class TrafficFlow(BaseModel):
    """Single traffic flow features."""
    flow_duration: float
    flow_byts_s: float
    flow_pkts_s: float
    pkt_len_mean: float
    pkt_len_std: float
    fwd_pkts_s: float
    bwd_pkts_s: float
    flow_iat_mean: float

    class Config:
        schema_extra = {
            "example": {
                "flow_duration": 1234.5,
                "flow_byts_s": 512.3,
                "flow_pkts_s": 25.1,
                "pkt_len_mean": 64.2,
                "pkt_len_std": 18.5,
                "fwd_pkts_s": 15.0,
                "bwd_pkts_s": 10.1,
                "flow_iat_mean": 45.3,
            }
        }


class BatchPredictionRequest(BaseModel):
    """Batch prediction request with multiple flows."""
    flows: list[TrafficFlow]
    model_type: str = "rf"  # 'rf' or 'iso'

    class Config:
        schema_extra = {
            "example": {
                "model_type": "rf",
                "flows": [
                    {
                        "flow_duration": 1234.5,
                        "flow_byts_s": 512.3,
                        "flow_pkts_s": 25.1,
                        "pkt_len_mean": 64.2,
                        "pkt_len_std": 18.5,
                        "fwd_pkts_s": 15.0,
                        "bwd_pkts_s": 10.1,
                        "flow_iat_mean": 45.3,
                    }
                ],
            }
        }


class PredictionResponse(BaseModel):
    """Prediction response."""
    prediction: int  # 0: normal, 1: bot/attack (-1 for iso anomaly)
    prediction_label: str  # "Normal" or "Bot/Attack"
    confidence: float
    model_type: str


class BatchPredictionResponse(BaseModel):
    """Batch prediction response."""
    predictions: list[PredictionResponse]
    total: int


# ==============================
# Model Loading
# ==============================
def load_models():
    """Load trained models and scalers at startup."""
    global models

    # Load supervised RandomForest
    if os.path.exists(RF_MODEL_PATH) and os.path.exists(RF_SCALER_PATH):
        try:
            models["rf"]["model"] = joblib.load(RF_MODEL_PATH)
            models["rf"]["scaler"] = joblib.load(RF_SCALER_PATH)
            print(f"✅ Loaded supervised RandomForest model from {RF_MODEL_PATH}")
        except Exception as e:
            print(f"⚠️  Failed to load RF model: {e}")
    else:
        print(f"⚠️  RF model files not found ({RF_MODEL_PATH}, {RF_SCALER_PATH})")

    # Load unsupervised IsolationForest
    if os.path.exists(ISO_MODEL_PATH) and os.path.exists(ISO_SCALER_PATH):
        try:
            models["iso"]["model"] = joblib.load(ISO_MODEL_PATH)
            models["iso"]["scaler"] = joblib.load(ISO_SCALER_PATH)
            print(f"✅ Loaded unsupervised IsolationForest model from {ISO_MODEL_PATH}")
        except Exception as e:
            print(f"⚠️  Failed to load ISO model: {e}")
    else:
        print(f"⚠️  ISO model files not found ({ISO_MODEL_PATH}, {ISO_SCALER_PATH})")


# ==============================
# Helper Functions
# ==============================
def _traffic_flow_to_array(flow: TrafficFlow) -> np.ndarray:
    """Convert TrafficFlow to numpy array with correct feature order."""
    return np.array([[
        flow.flow_duration,
        flow.flow_byts_s,
        flow.flow_pkts_s,
        flow.pkt_len_mean,
        flow.pkt_len_std,
        flow.fwd_pkts_s,
        flow.bwd_pkts_s,
        flow.flow_iat_mean,
    ]])


def _predict_rf(flow: TrafficFlow) -> Dict:
    """Predict using RandomForest model."""
    if models["rf"]["model"] is None or models["rf"]["scaler"] is None:
        raise HTTPException(status_code=503, detail="RandomForest model not loaded")

    X = _traffic_flow_to_array(flow)
    X_scaled = models["rf"]["scaler"].transform(X)
    pred = models["rf"]["model"].predict(X_scaled)[0]
    
    # Get probability for confidence
    proba = models["rf"]["model"].predict_proba(X_scaled)[0]
    confidence = float(np.max(proba))

    return {
        "prediction": int(pred),
        "prediction_label": "Bot/Attack" if pred == 1 else "Normal",
        "confidence": confidence,
        "model_type": "rf",
    }


def _predict_iso(flow: TrafficFlow) -> Dict:
    """Predict using IsolationForest model."""
    if models["iso"]["model"] is None or models["iso"]["scaler"] is None:
        raise HTTPException(status_code=503, detail="IsolationForest model not loaded")

    X = _traffic_flow_to_array(flow)
    X_scaled = models["iso"]["scaler"].transform(X)
    pred = models["iso"]["model"].predict(X_scaled)[0]
    
    # Get anomaly score
    anomaly_score = models["iso"]["model"].decision_function(X_scaled)[0]
    confidence = float(np.abs(anomaly_score))

    return {
        "prediction": int(pred),  # 1: normal, -1: anomaly
        "prediction_label": "Bot/Attack" if pred == -1 else "Normal",
        "confidence": confidence,
        "model_type": "iso",
    }


# ==============================
# Health Check Endpoints
# ==============================
@app.get("/health", tags=["Health"])
def health_check():
    """Check API health and model availability."""
    return {
        "status": "ok",
        "rf_loaded": models["rf"]["model"] is not None,
        "iso_loaded": models["iso"]["model"] is not None,
    }


# ==============================
# Single Prediction Endpoints
# ==============================
@app.post("/predict/supervised", response_model=PredictionResponse, tags=["Prediction"])
def predict_supervised(flow: TrafficFlow):
    """
    Predict using supervised RandomForest model.
    
    Returns:
    - prediction: 0 (Normal) or 1 (Bot/Attack)
    - prediction_label: Human-readable label
    - confidence: Probability score (0-1)
    - model_type: "rf"
    """
    return _predict_rf(flow)


@app.post("/predict/unsupervised", response_model=PredictionResponse, tags=["Prediction"])
def predict_unsupervised(flow: TrafficFlow):
    """
    Predict using unsupervised IsolationForest model.
    
    Returns:
    - prediction: 1 (Normal) or -1 (Anomaly/Bot)
    - prediction_label: Human-readable label
    - confidence: Anomaly score magnitude
    - model_type: "iso"
    """
    return _predict_iso(flow)


# ==============================
# Batch Prediction Endpoint
# ==============================
@app.post("/predict/batch", response_model=BatchPredictionResponse, tags=["Prediction"])
def predict_batch(request: BatchPredictionRequest):
    """
    Batch prediction endpoint.
    
    Parameters:
    - flows: List of traffic flows
    - model_type: "rf" (supervised) or "iso" (unsupervised)
    
    Returns:
    - predictions: List of predictions
    - total: Number of flows predicted
    """
    predictions = []
    
    for flow in request.flows:
        if request.model_type == "rf":
            result = _predict_rf(flow)
        elif request.model_type == "iso":
            result = _predict_iso(flow)
        else:
            raise HTTPException(status_code=400, detail="model_type must be 'rf' or 'iso'")
        
        predictions.append(PredictionResponse(**result))
    
    return BatchPredictionResponse(predictions=predictions, total=len(predictions))


# ==============================
# Root Endpoint
# ==============================
@app.get("/", tags=["Info"])
def root():
    """API root with documentation."""
    return {
        "name": "Bot Detection API",
        "version": "1.0.0",
        "description": "Detects bot/attack traffic using ML models",
        "endpoints": {
            "health": "GET /health",
            "predict_supervised": "POST /predict/supervised",
            "predict_unsupervised": "POST /predict/unsupervised",
            "predict_batch": "POST /predict/batch",
            "docs": "/docs (Swagger UI)",
            "redoc": "/redoc (ReDoc)",
        },
    }


# ==============================
# Startup
# ==============================
@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    load_models()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
