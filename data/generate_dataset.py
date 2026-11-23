"""
Dataset Generator for Learning Analytics Project
Based on UCI Student Performance dataset principles and Chapter 4 of the project report.
Generates realistic, pseudonymized learning data for Cloudflare Learning Analytics system.
"""

import random
import csv
import os

def generate_student_dataset(num_records=300, output_path="data/dataset_learning_analytics.csv"):
    random.seed(42)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    courses = [
        {"id": "CLOUD_101", "name": "Điện toán đám mây"},
        {"id": "WEB_201", "name": "Phát triển Ứng dụng Web"},
        {"id": "DB_301", "name": "Cơ sở dữ liệu nâng cao"},
        {"id": "DSA_102", "name": "Cấu trúc dữ liệu và Giải thuật"}
    ]
    
    vietnamese_first_names = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"]
    vietnamese_middle_names = ["Văn", "Thị", "Đức", "Minh", "Thanh", "Ngọc", "Quang", "Hải", "Tuấn", "Phương"]
    vietnamese_last_names = ["An", "Bình", "Cường", "Dũng", "Hà", "Hải", "Hùng", "Hương", "Khánh", "Linh", "Long", "Mai", "Nam", "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Tùng", "Vinh"]
    
    records = []
    
    for i in range(1, num_records + 1):
        student_id = f"SV2026_{i:03d}"
        display_name = f"{random.choice(vietnamese_first_names)} {random.choice(vietnamese_middle_names)} {random.choice(vietnamese_last_names)}"
        course = random.choice(courses)
        course_id = course["id"]
        
        # Latent student capability / diligence factor (0.2 to 1.0)
        capability = random.betavariate(3, 2)  # bell-ish curve biased towards average/good
        
        # Attendance rate (50% to 100%)
        attendance_rate = round(min(1.0, max(0.45, capability * 0.9 + random.uniform(0.05, 0.2))), 2)
        
        # Study hours per week (2 to 25 hours)
        study_hours = round(min(25.0, max(2.0, capability * 18.0 + random.uniform(-2, 4))), 1)
        
        # Previous term GPA (scale 0-10)
        previous_score = round(min(10.0, max(2.0, capability * 9.5 + random.uniform(-1.0, 1.0))), 2)
        
        # Assignment score (scale 0-10)
        assignment_score = round(min(10.0, max(1.5, capability * 9.2 + attendance_rate * 0.8 + random.uniform(-0.8, 0.8))), 2)
        
        # Quiz score (scale 0-10)
        quiz_score = round(min(10.0, max(1.0, capability * 9.0 + (study_hours / 25.0) * 1.5 + random.uniform(-1.0, 1.0))), 2)
        
        # Course materials completion rate (30% to 100%)
        completion_rate = round(min(1.0, max(0.30, capability * 0.85 + (study_hours / 25.0) * 0.2 + random.uniform(-0.05, 0.1))), 2)
        
        # Target variable: Final Score (0 to 10)
        # Weighted combination of continuous learning activities + previous ability + stochastic exam noise
        raw_final = (
            0.15 * (attendance_rate * 10) +
            0.20 * assignment_score +
            0.25 * quiz_score +
            0.15 * (completion_rate * 10) +
            0.25 * previous_score +
            random.gauss(0, 0.35)  # Exam day factor
        )
        final_score = round(min(10.0, max(1.0, raw_final)), 2)
        
        # Risk level categorization
        if final_score < 5.0:
            risk_level = "Cao"         # High Risk (Fail / At risk)
        elif final_score < 7.0:
            risk_level = "Trung bình"  # Medium Risk (Borderline / Average)
        else:
            risk_level = "Thấp"        # Low Risk (Good / Excellent)
            
        records.append({
            "student_id": student_id,
            "display_name": display_name,
            "course_id": course_id,
            "attendance_rate": attendance_rate,
            "study_hours": study_hours,
            "assignment_score": assignment_score,
            "quiz_score": quiz_score,
            "completion_rate": completion_rate,
            "previous_score": previous_score,
            "final_score": final_score,
            "risk_level": risk_level
        })
        
    # Write dataset to CSV
    fieldnames = [
        "student_id", "display_name", "course_id", "attendance_rate", 
        "study_hours", "assignment_score", "quiz_score", "completion_rate", 
        "previous_score", "final_score", "risk_level"
    ]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
    print(f"Generated {len(records)} records in {output_path}")
    
    # Also create a sample import CSV (30 records) for testing upload feature
    sample_path = "data/sample_import.csv"
    with open(sample_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records[:30])
    print(f"Generated sample import file with 30 records in {sample_path}")

if __name__ == "__main__":
    generate_student_dataset(300)
