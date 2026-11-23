import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from generate_dataset import FEATURES, generate_dataset


ROOT = Path(__file__).resolve().parent
DATASET_PATH = ROOT / "student_learning_data.csv"
ARTIFACTS_PATH = ROOT / "artifacts"
METRICS_PATH = ROOT / "model_metrics.json"
REGRESSION_MODEL_PATH = ARTIFACTS_PATH / "score_regressor.joblib"
CLASSIFICATION_MODEL_PATH = ARTIFACTS_PATH / "risk_classifier.joblib"
RISK_CLASSES = ("Cao", "Trung bình", "Thấp")


def load_dataset(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    if not path.exists():
        generate_dataset(output_path=path)

    with path.open(newline="", encoding="utf-8") as dataset_file:
        rows = list(csv.DictReader(dataset_file))

    required_columns = {*FEATURES, "final_score", "risk_level"}
    if not rows or not required_columns.issubset(rows[0]):
        raise ValueError(f"Dataset must contain these columns: {', '.join(sorted(required_columns))}")

    features = np.asarray([[float(row[name]) for name in FEATURES] for row in rows])
    scores = np.asarray([float(row["final_score"]) for row in rows])
    risks = np.asarray([row["risk_level"] for row in rows])
    if not set(np.unique(risks)).issubset(RISK_CLASSES):
        raise ValueError("Dataset contains an unsupported risk_level.")

    return features, scores, risks


def train() -> dict:
    features, scores, risks = load_dataset(DATASET_PATH)
    indices = np.arange(len(scores))
    train_indices, test_indices = train_test_split(
        indices,
        test_size=0.2,
        random_state=42,
        stratify=risks,
    )
    train_features, test_features = features[train_indices], features[test_indices]
    train_scores, test_scores = scores[train_indices], scores[test_indices]
    train_risks, test_risks = risks[train_indices], risks[test_indices]

    regressor = RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    classifier = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    baseline = LinearRegression()
    regressor.fit(train_features, train_scores)
    classifier.fit(train_features, train_risks)
    baseline.fit(train_features, train_scores)

    score_predictions = regressor.predict(test_features)
    risk_predictions = classifier.predict(test_features)
    metrics = {
        "is_demo": True,
        "demo_notice": (
            "Metrics được huấn luyện trên dữ liệu mô phỏng, chỉ phục vụ demo; "
            "không phản ánh năng lực học tập của sinh viên thực tế."
        ),
        "model_name": "EduInsight Synthetic Learning Model",
        "algorithm_regression": "Random Forest Regressor",
        "algorithm_classification": "Random Forest Classifier",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_version": "demo-1.0",
        "total_training_samples": int(len(train_indices)),
        "features": list(FEATURES),
        "regression_metrics": {
            "mae": round(float(mean_absolute_error(test_scores, score_predictions)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(test_scores, score_predictions))), 4),
            "r2_score": round(float(r2_score(test_scores, score_predictions)), 4),
            "linear_baseline_r2": round(
                float(r2_score(test_scores, baseline.predict(test_features))),
                4,
            ),
        },
        "classification_metrics": {
            "accuracy": round(float(accuracy_score(test_risks, risk_predictions)), 4),
            "macro_precision": round(
                float(precision_score(test_risks, risk_predictions, labels=RISK_CLASSES, average="macro", zero_division=0)),
                4,
            ),
            "macro_recall": round(
                float(recall_score(test_risks, risk_predictions, labels=RISK_CLASSES, average="macro", zero_division=0)),
                4,
            ),
            "macro_f1": round(
                float(f1_score(test_risks, risk_predictions, labels=RISK_CLASSES, average="macro", zero_division=0)),
                4,
            ),
            "classes": list(RISK_CLASSES),
            "confusion_matrix": confusion_matrix(
                test_risks,
                risk_predictions,
                labels=RISK_CLASSES,
            ).tolist(),
        },
        "feature_importances": {
            name: round(float(importance), 6)
            for name, importance in zip(FEATURES, regressor.feature_importances_)
        },
        "dataset_info": {
            "name": DATASET_PATH.name,
            "record_count": int(len(scores)),
            "train_test_split": "80/20",
            "random_seed": 42,
        },
    }

    ARTIFACTS_PATH.mkdir(parents=True, exist_ok=True)
    joblib.dump(regressor, REGRESSION_MODEL_PATH)
    joblib.dump(classifier, CLASSIFICATION_MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Trained on {len(train_indices)} rows; evaluated on {len(test_indices)} rows.")
    print(f"Metrics: {METRICS_PATH}")
    print(f"Models: {REGRESSION_MODEL_PATH}, {CLASSIFICATION_MODEL_PATH}")
    return metrics


if __name__ == "__main__":
    train()
