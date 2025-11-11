import os
import json
import pickle
import logging
from typing import List, Union, Optional, Dict

import numpy as np
import hashlib
import math
from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

# TensorFlow / Keras may be optional at import time for some endpoints
try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.preprocessing.text import tokenizer_from_json, Tokenizer
    TF_AVAILABLE = True
except Exception:
    TF_AVAILABLE = False

# scikit / joblib for bot detection
try:
    import joblib
except Exception:
    joblib = None

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Combined FastAPI Models",
              description="Combined endpoints for BILSTM, Bot Detection, User Behaviour and XSS models",
              version="1.0")

# --- feature-extractor dynamic imports (paths contain a hyphen so import by filepath)
import importlib.util
_FEAT_DIR = os.path.join(os.path.dirname(__file__), "feature-extractor")

def _load_feature_funcs():
    get_geoip = None
    get_ip_reputation = None
    tokenize_payload = None

    # geoip_utils.py
    try:
        geo_path = os.path.join(_FEAT_DIR, "geoip_utils.py")
        if os.path.exists(geo_path):
            spec = importlib.util.spec_from_file_location("feat_geoip", geo_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            get_geoip = getattr(mod, "get_geoip", None)
    except Exception as e:
        logger.warning(f"Failed to load geoip_utils: {e}")

    # reputation_api.py
    try:
        rep_path = os.path.join(_FEAT_DIR, "reputation_api.py")
        if os.path.exists(rep_path):
            spec = importlib.util.spec_from_file_location("feat_rep", rep_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            get_ip_reputation = getattr(mod, "get_ip_reputation", None)
    except Exception as e:
        logger.warning(f"Failed to load reputation_api: {e}")

    # tokenizer/payload_tokenizer.py
    try:
        tok_path = os.path.join(_FEAT_DIR, "tokenizer", "payload_tokenizer.py")
        if os.path.exists(tok_path):
            spec = importlib.util.spec_from_file_location("feat_tok", tok_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            tokenize_payload = getattr(mod, "tokenize_payload", None)
    except Exception as e:
        logger.warning(f"Failed to load payload_tokenizer: {e}")

    # Fallbacks
    if get_geoip is None:
        def get_geoip(ip):
            return {"ip": ip, "country": "Unknown", "city": "Unknown", "latitude": None, "longitude": None}

    if get_ip_reputation is None:
        def get_ip_reputation(ip):
            return 0

    if tokenize_payload is None:
        def tokenize_payload(payload: str):
            return []

    return get_geoip, get_ip_reputation, tokenize_payload

get_geoip, get_ip_reputation, tokenize_payload = _load_feature_funcs()

############################
# BILSTM Payload Detector
############################
bil_router = APIRouter(prefix="/bilstm", tags=["BILSTM"])

BIL_MODEL_PATH = os.path.join("BiLstm", "bilstm_payload_detector.h5")
BIL_TOKENIZER_PATH = os.path.join("BiLstm", "tokenizer.json")
BIL_WORD_INDEX = os.path.join("BiLstm", "word_index.json")
BIL_MAX_LEN = 100

bil_model = None
bil_tokenizer = None


class BilPredictRequest(BaseModel):
    text: Union[str, List[str]]


def bil_preprocess_text(text: str) -> str:
    return " ".join(text.lower().strip().split())


def bil_load_tokenizer(path: str):
    if not TF_AVAILABLE:
        logger.error("TensorFlow not available - BILSTM endpoints will fail at runtime")
        return None

    if os.path.exists(path) and os.path.getsize(path) > 10:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = f.read()
            tok = tokenizer_from_json(raw)
            logger.info(f"Loaded tokenizer from {path}")
            return tok
        except Exception as e:
            logger.warning(f"Failed to load tokenizer_from_json: {e}")

    if os.path.exists(BIL_WORD_INDEX) and os.path.getsize(BIL_WORD_INDEX) > 10:
        try:
            with open(BIL_WORD_INDEX, "r", encoding="utf-8") as f:
                wi = json.load(f)
            tok = Tokenizer()
            tok.word_index = wi
            tok.index_word = {int(v): k for k, v in wi.items()}
            logger.info(f"Reconstructed tokenizer from {BIL_WORD_INDEX}")
            return tok
        except Exception as e:
            logger.warning(f"Failed to reconstruct tokenizer from word_index.json: {e}")

    logger.error("No usable tokenizer found for BILSTM")
    return None


def bil_startup_load():
    global bil_model, bil_tokenizer
    if not TF_AVAILABLE:
        bil_model = None
        bil_tokenizer = None
        return

    model_path = BIL_MODEL_PATH if os.path.exists(BIL_MODEL_PATH) else os.path.join("BiLstm", os.path.basename(BIL_MODEL_PATH))
    if not os.path.exists(model_path):
        logger.warning(f"BILSTM model not found at {model_path}")
        bil_model = None
    else:
        try:
            bil_model = tf.keras.models.load_model(model_path)
            logger.info(f"Loaded BILSTM model from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load BILSTM model: {e}")
            bil_model = None

    bil_tokenizer = bil_load_tokenizer(BIL_TOKENIZER_PATH)


@bil_router.post("/predict")
def bil_predict(req: BilPredictRequest):
    if bil_model is None:
        raise HTTPException(status_code=500, detail="BILSTM model not loaded")
    if bil_tokenizer is None:
        raise HTTPException(status_code=500, detail="BILSTM tokenizer not available")

    texts = req.text
    if isinstance(texts, str):
        texts = [texts]
    if not isinstance(texts, list) or len(texts) == 0:
        raise HTTPException(status_code=400, detail="`text` must be a non-empty string or list of strings")

    processed = [bil_preprocess_text(t) for t in texts]
    try:
        sequences = bil_tokenizer.texts_to_sequences(processed)
    except Exception as e:
        logger.error(f"Error converting texts to sequences: {e}")
        raise HTTPException(status_code=500, detail="Tokenizer failed to convert texts to sequences")

    pad = pad_sequences(sequences, maxlen=BIL_MAX_LEN, padding='post', truncating='post')

    try:
        preds = bil_model.predict(pad)
    except Exception as e:
        logger.error(f"Model prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Model prediction failed")

    preds = np.array(preds).reshape(-1)
    results = []
    for i, txt in enumerate(texts):
        conf = float(preds[i])
        label = "sql_injection" if conf > 0.5 else "safe"
        results.append({"input": txt, "label": label, "confidence": round(conf, 6)})

    return {"results": results}


############################
# Bot Detection
############################
bot_router = APIRouter(prefix="/bot", tags=["BotDetection"])

RF_MODEL_PATH = os.path.join("bot detection", "rf_bot_model.pkl")
RF_SCALER_PATH = os.path.join("bot detection", "rf_bot_scaler.pkl")
ISO_MODEL_PATH = os.path.join("bot detection", "isolation_forest_bot_model.pkl")
ISO_SCALER_PATH = os.path.join("bot detection", "isolation_forest_bot_scaler.pkl")

models_store: Dict[str, Dict] = {"rf": {"model": None, "scaler": None}, "iso": {"model": None, "scaler": None}}


class TrafficFlow(BaseModel):
    flow_duration: float
    flow_byts_s: float
    flow_pkts_s: float
    pkt_len_mean: float
    pkt_len_std: float
    fwd_pkts_s: float
    bwd_pkts_s: float
    flow_iat_mean: float


class BatchPredictionRequest(BaseModel):
    flows: List[TrafficFlow]
    model_type: str = "rf"


class PredictionResponse(BaseModel):
    prediction: int
    prediction_label: str
    confidence: float
    model_type: str


def bot_load_models():
    global models_store
    # RandomForest
    if joblib is None:
        logger.warning("joblib not available - bot detection models won't load")
        return

    if os.path.exists(RF_MODEL_PATH) and os.path.exists(RF_SCALER_PATH):
        try:
            models_store["rf"]["model"] = joblib.load(RF_MODEL_PATH)
            models_store["rf"]["scaler"] = joblib.load(RF_SCALER_PATH)
            logger.info(f"Loaded RF model from {RF_MODEL_PATH}")
        except Exception as e:
            logger.warning(f"Failed to load RF model: {e}")
    else:
        logger.info("RF model files not found for bot detection")

    if os.path.exists(ISO_MODEL_PATH) and os.path.exists(ISO_SCALER_PATH):
        try:
            models_store["iso"]["model"] = joblib.load(ISO_MODEL_PATH)
            models_store["iso"]["scaler"] = joblib.load(ISO_SCALER_PATH)
            logger.info(f"Loaded ISO model from {ISO_MODEL_PATH}")
        except Exception as e:
            logger.warning(f"Failed to load ISO model: {e}")
    else:
        logger.info("ISO model files not found for bot detection")


def _traffic_flow_to_array(flow: TrafficFlow) -> np.ndarray:
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
    if models_store["rf"]["model"] is None or models_store["rf"]["scaler"] is None:
        raise HTTPException(status_code=503, detail="RandomForest model not loaded")

    X = _traffic_flow_to_array(flow)
    X_scaled = models_store["rf"]["scaler"].transform(X)
    pred = models_store["rf"]["model"].predict(X_scaled)[0]
    proba = models_store["rf"]["model"].predict_proba(X_scaled)[0]
    confidence = float(np.max(proba))
    return {"prediction": int(pred), "prediction_label": "Bot/Attack" if pred == 1 else "Normal", "confidence": confidence, "model_type": "rf"}


def _predict_iso(flow: TrafficFlow) -> Dict:
    if models_store["iso"]["model"] is None or models_store["iso"]["scaler"] is None:
        raise HTTPException(status_code=503, detail="IsolationForest model not loaded")

    X = _traffic_flow_to_array(flow)
    X_scaled = models_store["iso"]["scaler"].transform(X)
    pred = models_store["iso"]["model"].predict(X_scaled)[0]
    anomaly_score = models_store["iso"]["model"].decision_function(X_scaled)[0]
    confidence = float(abs(anomaly_score))
    return {"prediction": int(pred), "prediction_label": "Bot/Attack" if pred == -1 else "Normal", "confidence": confidence, "model_type": "iso"}


@bot_router.get("/health")
def bot_health():
    return {"status": "ok", "rf_loaded": models_store["rf"]["model"] is not None, "iso_loaded": models_store["iso"]["model"] is not None}


@bot_router.post("/predict/supervised", response_model=PredictionResponse)
def predict_supervised(flow: TrafficFlow):
    return _predict_rf(flow)


@bot_router.post("/predict/unsupervised", response_model=PredictionResponse)
def predict_unsupervised(flow: TrafficFlow):
    return _predict_iso(flow)


@bot_router.post("/predict/batch")
def predict_batch(request: BatchPredictionRequest):
    predictions = []
    for flow in request.flows:
        if request.model_type == "rf":
            result = _predict_rf(flow)
        elif request.model_type == "iso":
            result = _predict_iso(flow)
        else:
            raise HTTPException(status_code=400, detail="model_type must be 'rf' or 'iso'")
        predictions.append(result)
    return {"predictions": predictions, "total": len(predictions)}


############################
# User Behaviour (Behavior LSTM)
############################
beh_router = APIRouter(prefix="/behaviour", tags=["UserBehaviour"])

BEH_MODEL_PATH = os.path.join("User_Behaviour", "behavior_lstm_model.h5")
BEH_ENCODER_PATH = os.path.join("User_Behaviour", "action_encoder.pkl")
BEH_MAXLEN = 20

beh_model = None
beh_label_to_index = None
beh_unknown_idx = None


class EventItem(BaseModel):
    Event: str
    page_name: str
    browser_type: str


class SessionInput(BaseModel):
    sessn_id: str
    events: List[EventItem]


class PredictSessionsRequest(BaseModel):
    sessions: List[SessionInput]


def beh_combine_token(e: EventItem) -> str:
    return f"{e.Event}_{e.page_name}_{e.browser_type}"


def beh_load_artifacts():
    global beh_model, beh_label_to_index, beh_unknown_idx
    if not TF_AVAILABLE:
        logger.error("TensorFlow not available - Behaviour endpoints will fail")
        beh_model = None
        return

    if not os.path.exists(BEH_MODEL_PATH) or not os.path.exists(BEH_ENCODER_PATH):
        logger.warning("Behaviour model or encoder missing")
        beh_model = None
        return

    beh_model = tf.keras.models.load_model(BEH_MODEL_PATH)
    with open(BEH_ENCODER_PATH, "rb") as f:
        encoder_obj = pickle.load(f)
    classes = list(encoder_obj.classes_)
    beh_label_to_index = {label: idx for idx, label in enumerate(classes)}
    beh_unknown_idx = len(classes)


def beh_encode_session(events: List[EventItem]) -> List[int]:
    tokens = [beh_combine_token(e) for e in events]
    indices = [beh_label_to_index.get(tok, beh_unknown_idx) for tok in tokens]
    return indices


@beh_router.post("/predict")
def beh_predict(req: PredictSessionsRequest):
    if beh_model is None:
        raise HTTPException(status_code=500, detail="Behaviour model not loaded")
    if not req.sessions:
        raise HTTPException(status_code=400, detail="No sessions provided")

    seqs = [beh_encode_session(s.events) if s.events else [] for s in req.sessions]
    X = pad_sequences(seqs, maxlen=BEH_MAXLEN, padding="post", value=0)
    probs = beh_model.predict(X).reshape(-1)
    labels = (probs >= 0.5).astype(int)

    predictions = [{"sessn_id": s.sessn_id, "probability": float(p), "label": int(l)} for s, p, l in zip(req.sessions, probs, labels)]
    return {"predictions": predictions}


############################
# XSS Detector
############################
xss_router = APIRouter(prefix="/xss", tags=["XSS"])

XSS_MODEL_CANDIDATES = [os.path.join("XSS", "xss_bilstm_model.h5"), os.path.join("XSS", "models", "xss_bilstm_model.h5"), os.getenv("XSS_MODEL_PATH")]
XSS_TOKENIZER_CANDIDATES = [os.path.join("XSS", "xss_tokenizer.pkl"), os.path.join("XSS", "models", "xss_tokenizer.pkl"), os.getenv("XSS_TOKENIZER_PATH")]

xss_model = None
xss_tokenizer = None
xss_saved_maxlen: Optional[int] = None


class XssPredictRequest(BaseModel):
    payload: str = Field(..., description="Input string to classify for XSS risk")


class XssPredictBatchRequest(BaseModel):
    payloads: List[str]


def _first_existing(paths: List[Optional[str]]) -> Optional[str]:
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def xss_load_model_and_tokenizer():
    global xss_model, xss_tokenizer, xss_saved_maxlen
    if not TF_AVAILABLE:
        logger.error("TensorFlow not available - XSS endpoints will fail")
        xss_model = None
        xss_tokenizer = None
        return

    model_path = _first_existing(XSS_MODEL_CANDIDATES)
    tok_path = _first_existing(XSS_TOKENIZER_CANDIDATES)
    if not model_path or not tok_path:
        logger.warning("XSS model or tokenizer not found")
        xss_model = None
        xss_tokenizer = None
        return

    xss_model = tf.keras.models.load_model(model_path)
    data = pickle.load(open(tok_path, "rb"))
    if isinstance(data, dict) and "tokenizer" in data:
        xss_tokenizer = data["tokenizer"]
        xss_saved_maxlen = data.get("maxlen")
    else:
        xss_tokenizer = data
        xss_saved_maxlen = None


def xss_prepare_X(payloads: List[str], maxlen: Optional[int]):
    seqs = xss_tokenizer.texts_to_sequences(payloads)
    if maxlen is None:
        lengths = [len(s) for s in seqs]
        maxlen = min(max(lengths) if lengths else 200, 200)
    X = pad_sequences(seqs, maxlen=maxlen, padding="post", truncating="post")
    return X, maxlen


@xss_router.get("/")
def xss_root():
    return {"name": "XSS Detector (mounted)", "endpoints": {"predict": "/xss/predict", "predict_batch": "/xss/predict/batch"}}


@xss_router.get("/health")
def xss_health():
    ok = xss_model is not None and xss_tokenizer is not None
    return {"status": "ok" if ok else "missing-artifacts", "maxlen": xss_saved_maxlen}


@xss_router.post("/predict")
def xss_predict(req: XssPredictRequest, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    if xss_model is None or xss_tokenizer is None:
        raise HTTPException(status_code=500, detail="XSS model or tokenizer not loaded")
    payloads = [req.payload or ""]
    X, used_maxlen = xss_prepare_X(payloads, xss_saved_maxlen)
    probs = xss_model.predict(X, batch_size=1).ravel().astype(float)
    prob = float(probs[0])
    pred = int(prob >= threshold)
    return {"payload": req.payload, "prob_malicious": prob, "pred_label": pred, "threshold": threshold}


@xss_router.post("/predict/batch")
def xss_predict_batch(req: XssPredictBatchRequest, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    if xss_model is None or xss_tokenizer is None:
        raise HTTPException(status_code=500, detail="XSS model or tokenizer not loaded")
    payloads = [p or "" for p in req.payloads]
    if len(payloads) == 0:
        raise HTTPException(status_code=400, detail="payloads must be a non-empty list")
    X, used_maxlen = xss_prepare_X(payloads, xss_saved_maxlen)
    probs = xss_model.predict(X, batch_size=min(len(payloads), 128)).ravel().astype(float)
    results = [{"payload": payloads[i], "prob_malicious": float(probs[i]), "pred_label": int(probs[i] >= threshold), "threshold": threshold} for i in range(len(payloads))]
    return {"results": results, "threshold": threshold}


############################
# App startup: load all artifacts
############################

@app.on_event("startup")
def app_startup():
    # BILSTM
    bil_startup_load()
    # Bot detection
    bot_load_models()
    # Behaviour
    beh_load_artifacts()
    # XSS
    xss_load_model_and_tokenizer()


# include routers
app.include_router(bil_router)
app.include_router(bot_router)
app.include_router(beh_router)
app.include_router(xss_router)

############################
# Feature Extractor (from FastApi/feature-extractor/app.py)
############################
feat_router = APIRouter(prefix="/feature", tags=["FeatureExtractor"])


@feat_router.post("/extract_features")
async def extract_features(request: Request):
    """
    Extracts tokens, entropy, GeoIP, and IP reputation from incoming payload.
    """
    data = await request.json()
    payload = data.get("payload", "")
    ip = data.get("ip", "")
    ua = data.get("ua", "")

    # --- Tokenize payload ---
    tokens = tokenize_payload(payload)

    # --- Calculate entropy ---
    def calculate_entropy(s):
        if not s:
            return 0.0
        probabilities = [float(s.count(c)) / len(s) for c in dict.fromkeys(list(s))]
        entropy = - sum([p * math.log(p, 2) for p in probabilities])
        return round(entropy, 3)

    entropy = calculate_entropy(payload) if payload else 0.0

    # --- GeoIP Lookup ---
    geo = get_geoip(ip)

    # --- IP Reputation ---
    reputation_score = get_ip_reputation(ip)

    # --- Hash the payload for uniqueness ---
    payload_hash = hashlib.md5(payload.encode()).hexdigest()

    # --- Response ---
    response = {
        "payload_hash": payload_hash,
        "tokens": tokens,
        "entropy": entropy,
        "geo": geo,
        "reputation_score": reputation_score,
        "user_agent": ua
    }
    return response

app.include_router(feat_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")
