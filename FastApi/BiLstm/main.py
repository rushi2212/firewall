# main.py
import os
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, Bidirectional, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.utils import class_weight

# --------- Config ----------
CSV_PATH = "payload_dataset.csv"
MODEL_PATH = "bilstm_payload_detector.h5"
TOKENIZER_PATH = "tokenizer.json"

NUM_WORDS = 10000
OOV_TOKEN = "<OOV>"
MAX_LEN = 100
EMBEDDING_DIM = 128
LSTM_UNITS = 128
BATCH_SIZE = 64
EPOCHS = 10
VALIDATION_SPLIT = 0.2
RANDOM_STATE = 42
# ---------------------------

def load_and_clean(csv_path):
    """
    Load CSV and perform robust cleaning to avoid NaNs or malformed rows.
    """
    # Use on_bad_lines='skip' to skip malformed lines (pandas >= 1.3)
    # If using an older pandas, replace with engine='python', error_bad_lines=False (deprecated).
    try:
        data = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines='skip')
    except TypeError:
        # fallback for older pandas versions where on_bad_lines isn't available
        data = pd.read_csv(csv_path, encoding="utf-8", engine='python')
    # Ensure header is correct: if an extra empty header column exists, try to fix common issues
    if 'Sentence' not in data.columns or 'Label' not in data.columns:
        # try to rename first two columns if possible
        cols = list(data.columns)
        if len(cols) >= 2:
            data = data.rename(columns={cols[0]: 'Sentence', cols[1]: 'Label'})
    # Drop rows with missing sentence or label
    data = data.dropna(subset=['Sentence', 'Label'])
    # Convert to string and int
    data['Sentence'] = data['Sentence'].astype(str)
    # strip BOMs and weird whitespace
    data['Sentence'] = data['Sentence'].apply(lambda s: s.replace('\ufeff', '').strip())
    # Convert Label to numeric (if it's like "1," or contains trailing commas, coerce to int)
    data['Label'] = pd.to_numeric(data['Label'], errors='coerce')
    data = data.dropna(subset=['Label'])
    data['Label'] = data['Label'].astype(int)
    data = data.reset_index(drop=True)
    return data

def simple_text_preprocess(text):
    """
    Basic cleaning: lowercase and collapse multiple spaces.
    Keep special characters because payloads may require them.
    """
    text = text.lower()
    text = " ".join(text.split())
    return text

def build_model():
    model = Sequential([
        Embedding(NUM_WORDS, EMBEDDING_DIM, input_length=MAX_LEN),
        Bidirectional(LSTM(LSTM_UNITS, dropout=0.3, recurrent_dropout=0.3)),
        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(1, activation='sigmoid')
    ])
    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model

def main():
    # 1) Load and clean
    print("Loading dataset...")
    data = load_and_clean(CSV_PATH)
    print(f"Loaded {len(data)} rows. Label distribution:\n{data['Label'].value_counts()}")

    # 2) Preprocess text
    data['Sentence'] = data['Sentence'].apply(simple_text_preprocess)

    X = data['Sentence'].values
    y = data['Label'].values

    # 3) Tokenize
    tokenizer = Tokenizer(num_words=NUM_WORDS, oov_token=OOV_TOKEN)
    tokenizer.fit_on_texts(X)
    X_seq = tokenizer.texts_to_sequences(X)
    X_pad = pad_sequences(X_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    # Save tokenizer for later inference
    tokenizer_json = tokenizer.to_json()
    with open(TOKENIZER_PATH, 'w', encoding='utf-8') as f:
        f.write(tokenizer_json)
    print(f"Tokenizer saved to {TOKENIZER_PATH}")

    # 4) Train-test split (handle single-class case)
    unique_labels = np.unique(y)
    if len(unique_labels) == 1:
        # can't stratify if single class — do a simple split
        X_train, X_test, y_train, y_test = train_test_split(
            X_pad, y, test_size=0.2, random_state=RANDOM_STATE)
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X_pad, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

    print("Train/test split:", X_train.shape, X_test.shape)

    # 5) Compute class weights (helps if imbalance)
    if len(unique_labels) > 1:
        cw = class_weight.compute_class_weight(
            class_weight='balanced', classes=np.unique(y_train), y=y_train)
        class_weights = {i: cw_i for i, cw_i in enumerate(cw)}
        print("Using class weights:", class_weights)
    else:
        class_weights = None

    # 6) Build model
    model = build_model()
    model.summary()

    # Callbacks
    es = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    mc = ModelCheckpoint(MODEL_PATH, monitor='val_loss', save_best_only=True)

    # 7) Train
    history = model.fit(
        X_train, y_train,
        validation_split=VALIDATION_SPLIT,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weights,
        callbacks=[es, mc],
        verbose=1
    )

    # 8) Evaluate
    print("Evaluating on test set...")
    loss, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test loss: {loss:.4f}  Test accuracy: {acc:.4f}")

    y_pred_probs = model.predict(X_test, batch_size=128)
    y_pred = (y_pred_probs > 0.5).astype("int32").reshape(-1)

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    # 9) Save final model (checkpoint already saved best)
    if not os.path.exists(MODEL_PATH):
        model.save(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    # Save token index for quick mapping if you want later
    with open("word_index.json", "w", encoding="utf-8") as f:
        json.dump(tokenizer.word_index, f)
    print("Word index saved to word_index.json")

if __name__ == "__main__":
    main()
