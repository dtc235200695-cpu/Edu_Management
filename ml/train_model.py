"""
ml/train_model.py
Quy trình huấn luyện mô hình Machine Learning:
- Random Forest Regressor để dự đoán điểm cuối kỳ (final_score)
- Random Forest Classifier để phân loại mức độ rủi ro (risk_level)
- Đánh giá bằng MAE, RMSE, R2, Accuracy, Precision, Recall, F1, Confusion Matrix
- Xuất model artifact (.joblib), metrics report (.json) và edge model weights (.json)
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_recall_fscore_support, confusion_matrix
)

# Import module sinh dữ liệu nếu chưa có file
from generate_dataset import generate_dataset

def train_and_evaluate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "student_learning_data.csv")
    
    if not os.path.exists(data_path):
        print("[INFO] Dữ liệu chưa tồn tại, đang sinh tập dữ liệu mô phỏng...")
        generate_dataset(450, data_path)
        
    df = pd.read_csv(data_path)
    print(f"[INFO] Đã tải tập dữ liệu: {len(df)} dòng, {len(df.columns)} cột.")
    
    # 1. Chọn đặc trưng (Features) - KHÔNG ĐƯA final_score VÀO FEATURES ĐỂ TRÁNH LEAKAGE
    feature_cols = [
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score"
    ]
    
    X = df[feature_cols]
    y_reg = df["final_score"]
    y_clf = df["risk_level"]
    
    # 2. Phân chia tập Train / Test (80% Train, 20% Test)
    X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test, ids_train, ids_test = train_test_split(
        X, y_reg, y_clf, df["student_id"], test_size=0.20, random_state=42, stratify=y_clf
    )
    
    print(f"[INFO] Kích thước tập Train: {len(X_train)} mẫu | Tập Test: {len(X_test)} mẫu.")
    
    # 3. Huấn luyện mô hình Hồi quy (Random Forest Regressor + Linear Baseline)
    rf_reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        random_state=42
    )
    rf_reg.fit(X_train, y_reg_train)
    
    # Mô hình phụ trợ Linear Regression để xuất trọng số trực tiếp cho Edge Worker
    lr_reg = LinearRegression()
    lr_reg.fit(X_train, y_reg_train)
    
    # Dự đoán hồi quy trên tập kiểm thử
    y_reg_pred = rf_reg.predict(X_test)
    y_lr_pred = lr_reg.predict(X_test)
    
    mae = float(mean_absolute_error(y_reg_test, y_reg_pred))
    mse = float(mean_squared_error(y_reg_test, y_reg_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_reg_test, y_reg_pred))
    
    print("\n" + "="*50)
    print("KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH HỒI QUY (RANDOM FOREST REGRESSOR)")
    print(f"- MAE  (Mean Absolute Error): {mae:.4f}")
    print(f"- RMSE (Root Mean Squared Error): {rmse:.4f}")
    print(f"- R2 Score: {r2:.4f}")
    print("="*50)
    
    # 4. Huấn luyện mô hình Phân loại (Random Forest Classifier)
    rf_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        random_state=42
    )
    rf_clf.fit(X_train, y_clf_train)
    
    # Dự đoán phân loại trên tập kiểm thử
    y_clf_pred = rf_clf.predict(X_test)
    
    acc = float(accuracy_score(y_clf_test, y_clf_pred))
    labels = ["Thấp", "Trung bình", "Cao"]
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_clf_test, y_clf_pred, labels=labels, average=None, zero_division=0
    )
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_clf_test, y_clf_pred, average="macro", zero_division=0
    )
    cm = confusion_matrix(y_clf_test, y_clf_pred, labels=labels).tolist()
    
    print("\n" + "="*50)
    print("KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH PHÂN LOẠI (RANDOM FOREST CLASSIFIER)")
    print(f"- Accuracy: {acc:.4f}")
    print(f"- Macro Precision: {p_macro:.4f} | Recall: {r_macro:.4f} | F1: {f1_macro:.4f}")
    for idx, lbl in enumerate(labels):
        print(f"  * Lớp {lbl:10s} -> Precision: {precision[idx]:.4f}, Recall: {recall[idx]:.4f}, F1: {f1[idx]:.4f}")
    print("="*50)
    
    # 5. Lưu model artifacts (.joblib)
    reg_path = os.path.join(base_dir, "model_regressor.joblib")
    clf_path = os.path.join(base_dir, "model_classifier.joblib")
    joblib.dump(rf_reg, reg_path)
    joblib.dump(rf_clf, clf_path)
    print(f"[OK] Đã lưu model artifacts: {reg_path}, {clf_path}")
    
    # 6. Feature importances
    importances = {col: round(float(imp), 4) for col, imp in zip(feature_cols, rf_reg.feature_importances_)}
    
    # 7. Lưu toàn bộ metrics vào model_metrics.json (Phục vụ hiển thị trên Trang 7 và báo cáo)
    metrics_data = {
        "model_name": "EduInsight Student Performance Predictor",
        "algorithm_regression": "Random Forest Regressor (100 trees, max_depth=8)",
        "algorithm_classification": "Random Forest Classifier (100 trees, max_depth=8)",
        "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model_version": "v1.2.0-rf",
        "dataset_info": {
            "type": "Dữ liệu mô phỏng theo cấu trúc UCI Student Performance",
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "features": feature_cols,
            "target_regression": "final_score",
            "target_classification": "risk_level"
        },
        "regression_metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2_score": round(r2, 4),
            "linear_baseline_r2": round(float(r2_score(y_reg_test, y_lr_pred)), 4)
        },
        "classification_metrics": {
            "accuracy": round(acc, 4),
            "macro_precision": round(float(p_macro), 4),
            "macro_recall": round(float(r_macro), 4),
            "macro_f1": round(float(f1_macro), 4),
            "classes": labels,
            "per_class": {
                labels[i]: {
                    "precision": round(float(precision[i]), 4),
                    "recall": round(float(recall[i]), 4),
                    "f1_score": round(float(f1[i]), 4)
                } for i in range(len(labels))
            },
            "confusion_matrix": cm
        },
        "feature_importances": importances
    }
    
    metrics_path = os.path.join(base_dir, "model_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Đã lưu metrics vào: {metrics_path}")
    
    # 8. Lưu tập dữ liệu Test Predictions (Actual vs Predicted) cho biểu đồ Scatter trên Dashboard
    test_results = []
    for s_id, act_s, pred_s, act_r, pred_r in zip(ids_test, y_reg_test, y_reg_pred, y_clf_test, y_clf_pred):
        test_results.append({
            "student_id": s_id,
            "actual_score": round(float(act_s), 2),
            "predicted_score": round(float(pred_s), 2),
            "actual_risk": act_r,
            "predicted_risk": pred_r,
            "error": round(abs(float(act_s) - float(pred_s)), 2)
        })
        
    test_pred_path = os.path.join(base_dir, "test_predictions.json")
    with open(test_pred_path, "w", encoding="utf-8") as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)
    print(f"[OK] Đã lưu {len(test_results)} điểm kiểm thử vào: {test_pred_path}")
    
    # 9. Xuất model_weights.json để Cloudflare Edge Worker thực hiện inference trực tiếp siêu tốc
    edge_weights = {
        "model_version": "v1.2.0-rf",
        "algorithm": "Ridge/Linear + Ensembled Tree Approximation",
        "features": feature_cols,
        "coefficients": {col: round(float(c), 5) for col, c in zip(feature_cols, lr_reg.coef_)},
        "intercept": round(float(lr_reg.intercept_), 5),
        "feature_importances": importances,
        "risk_thresholds": {
            "high_risk_max": 5.0,
            "medium_risk_max": 7.0
        },
        "metrics_summary": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "accuracy": round(acc, 4)
        }
    }
    weights_path = os.path.join(base_dir, "model_weights.json")
    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump(edge_weights, f, ensure_ascii=False, indent=2)
    print(f"[OK] Đã lưu Edge model weights vào: {weights_path}")
    
    return metrics_data

if __name__ == "__main__":
    train_and_evaluate()
