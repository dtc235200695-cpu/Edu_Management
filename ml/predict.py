"""
ml/predict.py
Module và CLI dự đoán điểm và nguy cơ học tập bằng mô hình Random Forest
Được gọi từ CLI hoặc dùng làm module suy luận cho Backend/ML microservice.
"""

import os
import sys
import json
import argparse
import joblib
import pandas as pd
import numpy as np

def load_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    reg_path = os.path.join(base_dir, "model_regressor.joblib")
    clf_path = os.path.join(base_dir, "model_classifier.joblib")
    
    if not (os.path.exists(reg_path) and os.path.exists(clf_path)):
        raise FileNotFoundError("Mô hình chưa được huấn luyện. Vui lòng chạy ml/train_model.py trước.")
        
    rf_reg = joblib.load(reg_path)
    rf_clf = joblib.load(clf_path)
    return rf_reg, rf_clf

def predict_student_outcome(attendance_rate, study_hours, assignment_score, quiz_score, completion_rate, previous_score):
    rf_reg, rf_clf = load_models()
    
    feature_cols = [
        "attendance_rate", "study_hours", "assignment_score",
        "quiz_score", "completion_rate", "previous_score"
    ]
    
    input_df = pd.DataFrame([{
        "attendance_rate": float(attendance_rate),
        "study_hours": float(study_hours),
        "assignment_score": float(assignment_score),
        "quiz_score": float(quiz_score),
        "completion_rate": float(completion_rate),
        "previous_score": float(previous_score)
    }])[feature_cols]
    
    # 1. Dự đoán điểm cuối kỳ (Hồi quy)
    predicted_score = round(float(rf_reg.predict(input_df)[0]), 2)
    # Giới hạn thang điểm 0 - 10
    predicted_score = max(0.0, min(10.0, predicted_score))
    
    # 2. Phân loại mức độ rủi ro & xác suất
    predicted_risk = str(rf_clf.predict(input_df)[0])
    probabilities = rf_clf.predict_proba(input_df)[0]
    classes = list(rf_clf.classes_)
    prob_dict = {cls: round(float(p) * 100, 1) for cls, p in zip(classes, probabilities)}
    
    # 3. Phân tích các yếu tố học tập cần cải thiện
    weak_factors = []
    if attendance_rate < 0.75:
        weak_factors.append({
            "factor": "Chuyên cần",
            "current_value": f"{int(attendance_rate * 100)}%",
            "recommended": ">= 80%",
            "severity": "Cao" if attendance_rate < 0.6 else "Cảnh báo",
            "advice": "Tăng cường tham gia các buổi học trên lớp để không bỏ lỡ kiến thức cốt lõi."
        })
    if study_hours < 8.0:
        weak_factors.append({
            "factor": "Thời gian tự học",
            "current_value": f"{study_hours} giờ/tuần",
            "recommended": ">= 10 giờ/tuần",
            "severity": "Cao" if study_hours < 5 else "Cảnh báo",
            "advice": "Tăng thời lượng ôn tập và thực hành bài tập lập trình hàng tuần."
        })
    if quiz_score < 6.0:
        weak_factors.append({
            "factor": "Điểm kiểm tra định kỳ",
            "current_value": f"{quiz_score}/10",
            "recommended": ">= 7.0/10",
            "severity": "Cao" if quiz_score < 5 else "Cảnh báo",
            "advice": "Ôn lại các câu hỏi trắc nghiệm lý thuyết và bài kiểm tra các tuần trước."
        })
    if assignment_score < 6.0:
        weak_factors.append({
            "factor": "Điểm bài tập",
            "current_value": f"{assignment_score}/10",
            "recommended": ">= 7.0/10",
            "severity": "Cao" if assignment_score < 5 else "Cảnh báo",
            "advice": "Hoàn thành đầy đủ các bài lab thực hành và nộp đúng hạn."
        })
    if completion_rate < 0.70:
        weak_factors.append({
            "factor": "Tiến độ học tập",
            "current_value": f"{int(completion_rate * 100)}%",
            "recommended": ">= 85%",
            "severity": "Cao" if completion_rate < 0.5 else "Cảnh báo",
            "advice": "Xem các video bài giảng và hoàn thành tài liệu số trên hệ thống."
        })
        
    # 4. Gợi ý hành động
    if predicted_risk == "Cao":
        action_advice = "Cần gặp giảng viên cố vấn học tập ngay để lập kế hoạch phụ đạo kiến thức cơ bản."
    elif predicted_risk == "Trung bình":
        action_advice = "Cần tăng cường làm thêm bài tập củng cố và tham gia nhóm học tập để cải thiện điểm số."
    else:
        action_advice = "Duy trì phong độ học tập tốt, khuyến khích tìm hiểu các chuyên đề nâng cao và đồ án thực tế."
        
    return {
        "status": "success",
        "predicted_score": predicted_score,
        "risk_level": predicted_risk,
        "pass_probability": round((100.0 - prob_dict.get("Cao", 0.0)), 1),
        "risk_probabilities": prob_dict,
        "model_version": "v1.2.0-rf",
        "weak_factors": weak_factors,
        "action_advice": action_advice
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduInsight Student Prediction")
    parser.add_argument("--attendance", type=float, default=0.85, help="Tỷ lệ chuyên cần (0.0 - 1.0)")
    parser.add_argument("--hours", type=float, default=12.0, help="Số giờ học/tuần")
    parser.add_argument("--assignment", type=float, default=7.5, help="Điểm bài tập (0 - 10)")
    parser.add_argument("--quiz", type=float, default=7.0, help="Điểm kiểm tra (0 - 10)")
    parser.add_argument("--completion", type=float, default=0.80, help="Tỷ lệ hoàn thành (0.0 - 1.0)")
    parser.add_argument("--previous", type=float, default=7.2, help="Điểm kỳ trước (0 - 10)")
    
    args = parser.parse_args()
    try:
        res = predict_student_outcome(
            args.attendance, args.hours, args.assignment,
            args.quiz, args.completion, args.previous
        )
        print(json.dumps(res, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
