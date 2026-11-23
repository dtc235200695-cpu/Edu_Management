"""
ml/evaluate_model.py
Đánh giá chi tiết mô hình Random Forest Regressor & Classifier
Kiểm tra tính toàn vẹn của model artifacts và xuất báo cáo kiểm thử.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    classification_report, confusion_matrix
)

def evaluate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    reg_path = os.path.join(base_dir, "model_regressor.joblib")
    clf_path = os.path.join(base_dir, "model_classifier.joblib")
    data_path = os.path.join(base_dir, "student_learning_data.csv")
    
    if not (os.path.exists(reg_path) and os.path.exists(clf_path)):
        print("[LỖI] Chưa tìm thấy file mô hình .joblib. Vui lòng chạy train_model.py trước.")
        return
        
    print("[INFO] Đang tải mô hình đã lưu...")
    rf_reg = joblib.load(reg_path)
    rf_clf = joblib.load(clf_path)
    
    df = pd.read_csv(data_path)
    feature_cols = [
        "attendance_rate", "study_hours", "assignment_score",
        "quiz_score", "completion_rate", "previous_score"
    ]
    
    X = df[feature_cols]
    y_reg = df["final_score"]
    y_clf = df["risk_level"]
    
    # Đánh giá trên toàn bộ tập dữ liệu mẫu
    y_pred_reg = rf_reg.predict(X)
    y_pred_clf = rf_clf.predict(X)
    
    mae = mean_absolute_error(y_reg, y_pred_reg)
    rmse = np.sqrt(mean_squared_error(y_reg, y_pred_reg))
    r2 = r2_score(y_reg, y_pred_reg)
    
    print("\n" + "="*60)
    print("BÁO CÁO ĐÁNH GIÁ MÔ HÌNH HỌC MÁY (MACHINE LEARNING EVALUATION)")
    print("="*60)
    print(f"1. MÔ HÌNH HỒI QUY: Random Forest Regressor (Dự đoán final_score)")
    print(f"   - Sai số tuyệt đối trung bình (MAE) : {mae:.4f}")
    print(f"   - Căn bậc hai sai số toàn phương (RMSE): {rmse:.4f}")
    print(f"   - Hệ số xác định (R² Score)         : {r2:.4f}")
    print("\n2. MÔ HÌNH PHÂN LOẠI: Random Forest Classifier (Phân loại risk_level)")
    print(classification_report(y_clf, y_pred_clf, digits=4))
    print("3. MA TRẬN NHẦM LẪN (CONFUSION MATRIX):")
    labels = ["Thấp", "Trung bình", "Cao"]
    cm = confusion_matrix(y_clf, y_pred_clf, labels=labels)
    print(f"   Nhãn: {labels}")
    for row in cm:
        print(f"   {row}")
    print("="*60)

if __name__ == "__main__":
    evaluate()
