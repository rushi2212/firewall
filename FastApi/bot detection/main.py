import argparse
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
import joblib


# ==============================
# 1️⃣ Default Features
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


# ==============================
# 2️⃣ Data Loading
# ==============================
def load_and_label(normal_path: str, attack_path: str) -> pd.DataFrame:
    """Load and label normal + attack traffic CSVs."""
    normal_df = pd.read_csv(normal_path)
    attack_df = pd.read_csv(attack_path)

    normal_df["label"] = 0
    attack_df["label"] = 1

    df = pd.concat([normal_df, attack_df], ignore_index=True)
    df = df.replace([np.inf, -np.inf], np.nan)
    return df


# ==============================
# 3️⃣ Feature Preparation
# ==============================
def prepare_features(df: pd.DataFrame, features: list) -> pd.DataFrame:
    """Select and clean features."""
    df_features = df.reindex(columns=features)
    df_clean = df_features.dropna()
    return df_clean


# ==============================
# 4️⃣ Supervised Training (RandomForest)
# ==============================
def train_supervised(X, y, test_size=0.2, random_state=42):
    """Train RandomForest classifier."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    rf = RandomForestClassifier(
        n_estimators=100, random_state=random_state, class_weight="balanced"
    )
    rf.fit(X_train_scaled, y_train)

    # Evaluate
    preds = rf.predict(X_test_scaled)
    metrics = {
        "accuracy": accuracy_score(y_test, preds),
        "precision": precision_score(y_test, preds, zero_division=0),
        "recall": recall_score(y_test, preds, zero_division=0),
        "f1": f1_score(y_test, preds, zero_division=0),
        "report": classification_report(y_test, preds, zero_division=0),
    }

    return rf, scaler, metrics, (X_test, y_test, X_test_scaled)


# ==============================
# 5️⃣ Unsupervised Training (IsolationForest)
# ==============================
def train_unsupervised(normal_df, features, contamination=0.02, random_state=42):
    """Train IsolationForest on normal data only."""
    X = prepare_features(normal_df, features)
    imputer = SimpleImputer(strategy="median")
    X_imputed = pd.DataFrame(imputer.fit_transform(X), columns=X.columns)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    iso = IsolationForest(
        n_estimators=100, contamination=contamination, random_state=random_state
    )
    iso.fit(X_scaled)

    return iso, scaler


# ==============================
# 6️⃣ Save Models
# ==============================
def save_model(model, scaler, prefix: str):
    joblib.dump(model, f"{prefix}_model.pkl")
    joblib.dump(scaler, f"{prefix}_scaler.pkl")
    print(f"✅ Saved {prefix} model and scaler.")


# ==============================
# 7️⃣ Main Training Flow
# ==============================
def main(normal_csv, attack_csv, features=DEFAULT_FEATURES):
    print("🚀 Loading data...")
    df = load_and_label(normal_csv, attack_csv)

    # Prepare supervised dataset
    print("🧹 Preparing features...")
    X = prepare_features(df, features)
    imputer = SimpleImputer(strategy="median")
    X_imputed = pd.DataFrame(imputer.fit_transform(X), columns=X.columns)
    y = df.loc[X_imputed.index, "label"]

    # -------------------------------
    # Train Supervised Model (RandomForest)
    # -------------------------------
    print("\n🎯 Training Supervised RandomForest model...")
    rf, scaler_rf, metrics, (X_test, y_test, X_test_scaled) = train_supervised(X_imputed, y)

    print("\n📊 Supervised Model Metrics:")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall: {metrics['recall']:.4f}")
    print(f"F1 Score: {metrics['f1']:.4f}")
    print("\nDetailed Report:\n", metrics["report"])

    save_model(rf, scaler_rf, "rf_bot")

    # -------------------------------
    # Train Unsupervised Model (IsolationForest)
    # -------------------------------
    print("\n🤖 Training Unsupervised IsolationForest model...")
    normal_df = pd.read_csv(normal_csv)
    iso, scaler_iso = train_unsupervised(normal_df, features)

    save_model(iso, scaler_iso, "isolation_forest_bot")

    print("\n✅ Both models trained and saved successfully!")
    print("   • Supervised model: rf_bot_model.pkl")
    print("   • Unsupervised model: isolation_forest_bot_model.pkl")


# ==============================
# 8️⃣ CLI Entry
# ==============================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train both supervised and unsupervised bot detection models")
    parser.add_argument("--normal", type=str, default="CTU13_Normal_Traffic.csv", help="Path to normal traffic CSV")
    parser.add_argument("--attack", type=str, default="CTU13_Attack_Traffic.csv", help="Path to attack traffic CSV")
    args = parser.parse_args()

    main(normal_csv=args.normal, attack_csv=args.attack)
