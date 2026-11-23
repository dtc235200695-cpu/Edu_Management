"""
ml/generate_dataset.py
Sinh dữ liệu học tập mô phỏng (dựa trên cấu trúc tập dữ liệu UCI Student Performance).
Được thiết kế cho đề tài: Phân tích dữ liệu học tập và ứng dụng ML trên Cloudflare.
LƯU Ý: Dữ liệu này là dữ liệu mô phỏng phục vụ nghiên cứu và kiểm thử hệ thống.
"""

import os
import random
import csv

def generate_dataset(num_records=450, output_path=None):
    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "student_learning_data.csv")
    
    random.seed(2026)
    
    records = []
    
    for i in range(1, num_records + 1):
        student_id = f"SV2026_{i:03d}"
        
        # Tiềm năng / mức độ siêng năng tiềm ẩn của sinh viên (Beta distribution: 0.1 - 1.0)
        ability = random.betavariate(3.2, 2.5)
        
        # 1. Tỷ lệ chuyên cần (0.45 - 1.00)
        attendance_rate = round(min(1.0, max(0.45, ability * 0.85 + random.uniform(0.1, 0.25))), 2)
        
        # 2. Số giờ tự học mỗi tuần (2.0 - 25.0 giờ)
        study_hours = round(min(25.0, max(2.0, ability * 18.0 + random.uniform(-2.5, 4.0))), 1)
        
        # 3. Điểm bài tập trong kỳ (1.5 - 10.0)
        assignment_noise = random.gauss(0, 0.6)
        assignment_score = round(min(10.0, max(1.5, ability * 8.5 + (attendance_rate * 1.2) + assignment_noise)), 2)
        
        # 4. Điểm kiểm tra định kỳ (1.0 - 10.0)
        quiz_noise = random.gauss(0, 0.7)
        quiz_score = round(min(10.0, max(1.0, ability * 8.8 + (study_hours / 25.0) * 1.5 + quiz_noise)), 2)
        
        # 5. Tỷ lệ hoàn thành tài liệu/bài giảng (0.30 - 1.00)
        completion_rate = round(min(1.0, max(0.30, ability * 0.80 + (attendance_rate * 0.15) + random.uniform(-0.05, 0.1))), 2)
        
        # 6. Điểm trung bình các kỳ trước (2.0 - 10.0)
        prev_noise = random.gauss(0, 0.8)
        previous_score = round(min(10.0, max(2.0, ability * 8.5 + prev_noise + 1.0)), 2)
        
        # Nhãn mục tiêu: Điểm thi cuối kỳ (final_score: 0.0 - 10.0)
        # Điểm được xác định bởi các nhân tố học tập xuyên suốt kỳ học + yếu tố thi cử
        true_score = (
            0.15 * (attendance_rate * 10) +
            0.20 * assignment_score +
            0.25 * quiz_score +
            0.15 * (completion_rate * 10) +
            0.25 * previous_score +
            random.gauss(0, 0.35) # Biến động ngày thi
        )
        final_score = round(min(10.0, max(1.0, true_score)), 2)
        
        # Phân loại mức độ rủi ro (risk_level)
        if final_score < 5.0:
            risk_level = "Cao"         # Nguy cơ trượt môn (High Risk)
        elif final_score < 7.0:
            risk_level = "Trung bình"  # Nguy cơ trung bình / Cần cải thiện (Medium Risk)
        else:
            risk_level = "Thấp"        # An toàn / Kết quả tốt (Low Risk)
            
        records.append({
            "student_id": student_id,
            "attendance_rate": attendance_rate,
            "study_hours": study_hours,
            "assignment_score": assignment_score,
            "quiz_score": quiz_score,
            "completion_rate": completion_rate,
            "previous_score": previous_score,
            "final_score": final_score,
            "risk_level": risk_level
        })
        
    fieldnames = [
        "student_id", "attendance_rate", "study_hours", "assignment_score",
        "quiz_score", "completion_rate", "previous_score", "final_score", "risk_level"
    ]
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
    print(f"[OK] Đã sinh {len(records)} bản ghi dữ liệu mô phỏng tại: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_dataset()
