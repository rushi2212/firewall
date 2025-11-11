import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, Bidirectional, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

# ==============================
# CONFIG
# ==============================
DATA_PATH = "XSS_dataset.csv"       # your CSV file with Sentence, Label
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

MAX_LEN = 300
EMB_DIM = 64
EPOCHS = 10
BATCH_SIZE = 32
THRESHOLD = 0.5

# ==============================
# STEP 1 — LOAD DATA
# ==============================
df = pd.read_csv(DATA_PATH)
df.columns = [c.strip() for c in df.columns]
df = df.rename(columns={"Sentence": "payload", "Label": "label"})
df = df.dropna()
df["payload"] = df["payload"].astype(str)
df["label"] = df["label"].astype(int)

print("✅ Dataset loaded. Shape:", df.shape)
print(df.head())

# ==============================
# STEP 2 — CHAR-LEVEL TOKENIZATION
# ==============================
tokenizer = Tokenizer(char_level=True, oov_token='[UNK]')
tokenizer.fit_on_texts(df["payload"])
sequences = tokenizer.texts_to_sequences(df["payload"])
X = pad_sequences(sequences, maxlen=MAX_LEN, padding='post', truncating='post')
y = df["label"].values

print("🔤 Vocabulary size:", len(tokenizer.word_index))

# ==============================
# STEP 3 — TRAIN/TEST SPLIT
# ==============================
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# ==============================
# STEP 4 — BUILD MODEL
# ==============================
model = Sequential([
    Embedding(input_dim=len(tokenizer.word_index) + 1, output_dim=EMB_DIM, input_length=MAX_LEN),
    Bidirectional(LSTM(128, return_sequences=False, dropout=0.2, recurrent_dropout=0.1)),
    Dropout(0.3),
    Dense(64, activation='relu'),
    Dropout(0.2),
    Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
model.summary()

# ==============================
# STEP 5 — TRAIN MODEL
# ==============================
history = model.fit(
    X_train, y_train,
    validation_split=0.1,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    verbose=1
)

# ==============================
# STEP 6 — EVALUATE MODEL
# ==============================
y_pred_prob = model.predict(X_test).ravel()
y_pred = (y_pred_prob >= THRESHOLD).astype(int)

print("\n=== Evaluation Results ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred, digits=4))

# ==============================
# STEP 7 — SAVE MODEL & TOKENIZER
# ==============================
model.save(os.path.join(MODEL_DIR, "xss_bilstm_model.h5"))
with open(os.path.join(MODEL_DIR, "xss_tokenizer.pkl"), "wb") as f:
    pickle.dump({'tokenizer': tokenizer, 'maxlen': MAX_LEN}, f)

print("🎯 Model saved at models/xss_bilstm_model.h5")
print("🔖 Tokenizer saved at models/xss_tokenizer.pkl")
