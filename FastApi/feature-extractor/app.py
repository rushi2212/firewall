from fastapi import FastAPI, Request
from geoip_utils import get_geoip
from reputation_api import get_ip_reputation
from tokenizer.payload_tokenizer import tokenize_payload
import hashlib
import math
import uvicorn

app = FastAPI(title="Feature Extractor Service", version="1.0")

@app.post("/extract_features")
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


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
