import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer, tokenizer_from_json
from tensorflow.keras.preprocessing.sequence import pad_sequences

# --- Configuration ---
MODEL_PATH = "bilstm_payload_detector.h5"
TOKENIZER_PATH = "tokenizer.json"
MAX_LEN = 100

# --- Load model and tokenizer ---
print("Loading model and tokenizer...")
model = tf.keras.models.load_model(MODEL_PATH)

with open(TOKENIZER_PATH, 'r', encoding='utf-8') as f:
    # tokenizer_from_json expects a JSON string, not a dict.
    # Use f.read() to get the raw JSON text, or json.dumps on a loaded dict.
    tokenizer_json = f.read()

tokenizer = tokenizer_from_json(tokenizer_json)


def preprocess_text(text):
    text = text.lower().strip()
    text = " ".join(text.split())
    return text


def predict_payload(texts):
    processed = [preprocess_text(t) for t in texts]
    seq = tokenizer.texts_to_sequences(processed)
    pad = pad_sequences(seq, maxlen=MAX_LEN, padding='post', truncating='post')

    preds = model.predict(pad)
    results = (preds > 0.5).astype(int)

    for i, txt in enumerate(texts):
        label = "⚠ SQL Injection Detected" if results[i] == 1 else "✅ Safe Query"
        print(
            f"\nInput: {txt}\nPrediction: {label} (Confidence: {preds[i][0]:.4f})")


# --- Example Testing ---
if __name__ == "__main__":
    test_samples = [
        "SELECT * FROM users WHERE username = 'admin' --",
        "DROP TABLE users;",
        "Hello, how are you?",
        "INSERT INTO accounts VALUES ('user', 'pass123');",
        "? or 1  =  1 --",
        "-6381%"" or 8571  =  8571--"
    ]
    predict_payload(test_samples)