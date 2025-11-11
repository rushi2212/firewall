import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import os

# ==============================
# STEP 1 — LOAD AND CLEAN DATA
# ==============================
excel_path = "Dataa.xlsx"
csv_path = "Dataa.csv"


def load_data(excel_path=excel_path, csv_path=csv_path):
    """Try to load Excel via pandas. If the Excel engine is missing,
    provide a helpful message and fall back to CSV if available."""
    try:
        return pd.read_excel(excel_path)
    except Exception as e:
        msg = str(e)
        # pandas raises ImportError mentioning openpyxl when the engine is missing
        if "openpyxl" in msg or "Missing optional dependency 'openpyxl'" in msg or "No module named 'openpyxl'" in msg:
            print(
                "\n⚠️  Missing optional dependency 'openpyxl'. pandas needs this to read .xlsx files.")
            print(
                "Install it by running in your terminal (PowerShell):\n    python -m pip install openpyxl\n")
        else:
            print("\n⚠️  Error while reading Excel file:", msg)

        # Attempt CSV fallback if available
        if os.path.exists(csv_path):
            print(f"Falling back to CSV at '{csv_path}'")
            return pd.read_csv(csv_path)
        else:
            raise


df = load_data()

# Keep relevant columns
df = df[['sessn_id', 'Event', 'geo_cntry',
         'page_name', 'browser_type', 'traffic_source']]

# Convert to string and fill missing
df = df.fillna('Unknown').astype(str)

# ==============================
# STEP 2 — COMBINE FEATURES INTO USER ACTIONS
# ==============================
# Create a combined action token per event (Event + Page + Browser)
df['action_token'] = df['Event'] + "_" + \
    df['page_name'] + "_" + df['browser_type']

# Group by session — this forms each user's sequence of actions
sessions = df.groupby('sessn_id')['action_token'].apply(list).reset_index()

# For training labels — since your dataset doesn’t have a label,
# we'll assign synthetic labels (you can replace this with real ones)
sessions['label'] = sessions['action_token'].apply(
    lambda x: 1 if any("Click" in a for a in x) else 0)

print("✅ Total sessions:", len(sessions))

# ==============================
# STEP 3 — ENCODE ACTION TOKENS
# ==============================
actions = [a for seq in sessions['action_token'] for a in seq]
encoder = LabelEncoder()
encoder.fit(actions)

encoded_sequences = [encoder.transform(seq)
                     for seq in sessions['action_token']]
X = pad_sequences(encoded_sequences, maxlen=20,
                  padding='post')  # adjust maxlen as needed
y = np.array(sessions['label'])

# ==============================
# STEP 4 — TRAIN/TEST SPLIT
# ==============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y)

# ==============================
# STEP 5 — BUILD LSTM MODEL
# ==============================
model = Sequential([
    Embedding(input_dim=len(encoder.classes_) +
              1, output_dim=64, input_length=20),
    LSTM(128, return_sequences=False),
    Dropout(0.3),
    Dense(64, activation='relu'),
    Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy',
              metrics=['accuracy'])
model.summary()

# ==============================
# STEP 6 — TRAIN MODEL
# ==============================
history = model.fit(X_train, y_train, validation_split=0.2,
                    epochs=8, batch_size=32)

# ==============================
# STEP 7 — EVALUATE
# ==============================
loss, acc = model.evaluate(X_test, y_test)
print(f"\n✅ Test Accuracy: {acc:.2f}")

# ==============================
# STEP 8 — SAVE MODEL AND ENCODER
# ==============================
model.save("behavior_lstm_model.h5")
with open("action_encoder.pkl", "wb") as f:
    pickle.dump(encoder, f)

print("🎯 Model saved as behavior_lstm_model.h5")
