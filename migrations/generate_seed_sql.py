"""
generate_seed_sql.py
Tạo file seed SQL phong phú và nhất quán cho Cloudflare D1
"""

import random
import os

def generate_seed():
    random.seed(2026)
    
    vietnamese_first = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh"]
    vietnamese_mid = ["Văn", "Thị", "Đức", "Minh", "Thanh", "Ngọc", "Quang", "Hải", "Tuấn", "Phương", "Anh", "Hoàng"]
    vietnamese_last = ["An", "Bình", "Cường", "Dũng", "Hà", "Hải", "Hùng", "Hương", "Khánh", "Linh", "Long", "Mai", "Nam", "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Tùng", "Vinh", "Khoa", "Đạt"]
    
    classes = ["K19-CNTT01", "K19-CNTT02", "K19-KTPM01", "K19-HTTT01"]
    
    courses = [
        ("CLOUD_101", "Điện toán đám mây", "Học kỳ 1 - 2026"),
        ("WEB_201", "Phát triển Ứng dụng Web", "Học kỳ 1 - 2026"),
        ("DB_301", "Cơ sở dữ liệu phân tán", "Học kỳ 1 - 2026"),
        ("DSA_102", "Cấu trúc dữ liệu & Giải thuật", "Học kỳ 1 - 2026")
    ]
    
    cloud_topics = [
        "Kiến trúc Serverless & Edge Computing",
        "Lưu trữ Object Storage (R2)",
        "Cơ sở dữ liệu SQL phân tán (D1)",
        "API Gateway & Workers Routing",
        "Machine Learning Inference trên Edge",
        "Bảo mật, IAM & Giới hạn tài nguyên"
    ]
    
    resources_data = [
        ("Kiến trúc Serverless & Edge Computing", "Nhập môn Serverless và Cloudflare Workers", "https://developers.cloudflare.com/workers/get-started/guide/", "Cơ bản"),
        ("Kiến trúc Serverless & Edge Computing", "Thiết kế hệ thống micro-edge với Pages và Workers", "https://developers.cloudflare.com/pages/framework-guides/", "Trung bình"),
        ("Kiến trúc Serverless & Edge Computing", "Tối ưu hóa hiệu năng và Cold Start trên Cloudflare", "https://developers.cloudflare.com/workers/runtime-apis/", "Nâng cao"),
        
        ("Lưu trữ Object Storage (R2)", "Tổng quan Cloudflare R2 & Kết nối S3 API", "https://developers.cloudflare.com/r2/api/s3/api/", "Cơ bản"),
        ("Lưu trữ Object Storage (R2)", "Xây dựng pipeline upload và xử lý file CSV trên R2", "https://developers.cloudflare.com/r2/examples/", "Trung bình"),
        ("Lưu trữ Object Storage (R2)", "Kiểm soát truy cập và Pre-signed URLs trong R2", "https://developers.cloudflare.com/r2/data-security/", "Nâng cao"),
        
        ("Cơ sở dữ liệu SQL phân tán (D1)", "Bắt đầu với Cloudflare D1 và SQLite", "https://developers.cloudflare.com/d1/get-started/", "Cơ bản"),
        ("Cơ sở dữ liệu SQL phân tán (D1)", "Thiết kế Schema và Quản lý Migrations D1", "https://developers.cloudflare.com/d1/platform/migrations/", "Trung bình"),
        ("Cơ sở dữ liệu SQL phân tán (D1)", "Indexing và Tối ưu hóa truy vấn Read-heavy trên D1", "https://developers.cloudflare.com/d1/platform/client-api/", "Nâng cao"),
        
        ("API Gateway & Workers Routing", "Xây dựng RESTful API chuẩn trên Cloudflare Workers", "https://developers.cloudflare.com/workers/examples/rest-api/", "Cơ bản"),
        ("API Gateway & Workers Routing", "Xử lý CORS, Authentication và Rate Limiting", "https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/", "Trung bình"),
        ("API Gateway & Workers Routing", "Orchestration & tích hợp đa dịch vụ với Bindings", "https://developers.cloudflare.com/workers/configuration/bindings/", "Chuyên sâu"),
        
        ("Machine Learning Inference trên Edge", "Giới thiệu Workers AI và mô hình nhúng", "https://developers.cloudflare.com/workers-ai/", "Cơ bản"),
        ("Machine Learning Inference trên Edge", "Chuyển giao trọng số mô hình ML vào Edge Worker", "https://developers.cloudflare.com/workers-ai/models/", "Trung bình"),
        ("Machine Learning Inference trên Edge", "Tối ưu hóa độ trễ Inference dưới 5ms", "https://developers.cloudflare.com/workers-ai/configuration/", "Chuyên sâu"),
        
        ("Bảo mật, IAM & Giới hạn tài nguyên", "Quản lý Secrets và Environment Variables an toàn", "https://developers.cloudflare.com/workers/configuration/secrets/", "Cơ bản"),
        ("Bảo mật, IAM & Giới hạn tài nguyên", "Tích hợp Cloudflare Turnstile chống Spam", "https://developers.cloudflare.com/turnstile/", "Trung bình"),
        ("Bảo mật, IAM & Giới hạn tài nguyên", "Mô hình phòng thủ đa tầng Zero Trust cho Cloud App", "https://developers.cloudflare.com/cloudflare-one/", "Chuyên sâu")
    ]
    
    lines = []
    lines.append("-- ==============================================================================")
    lines.append("-- Cloudflare D1 Database Seed Data - EduInsight Learning Analytics")
    lines.append("-- File: migrations/0002_seed_data.sql")
    lines.append("-- ==============================================================================\n")
    
    # 1. Insert Courses
    lines.append("-- 1. Dữ liệu Khóa học (courses)")
    for cid, cname, sem in courses:
        lines.append(f"INSERT OR IGNORE INTO courses (course_id, course_name, semester) VALUES ('{cid}', '{cname}', '{sem}');")
    lines.append("")
    
    # 2. Insert Resources
    lines.append("-- 2. Dữ liệu Tài nguyên học tập (resources)")
    for topic, title, url, diff in resources_data:
        lines.append(f"INSERT OR IGNORE INTO resources (topic_name, title, resource_url, difficulty) VALUES ('{topic}', '{title}', '{url}', '{diff}');")
    lines.append("")
    
    # 3. Insert Students & Records
    lines.append("-- 3. Dữ liệu Sinh viên và Bản ghi học tập")
    students_count = 60
    
    for i in range(1, students_count + 1):
        sid = f"SV2026_{i:03d}"
        fname = f"{random.choice(vietnamese_first)} {random.choice(vietnamese_mid)} {random.choice(vietnamese_last)}"
        cname = random.choice(classes)
        lines.append(f"INSERT OR IGNORE INTO students (student_id, full_name, class_name) VALUES ('{sid}', '{fname}', '{cname}');")
        
        # Capability
        ability = random.betavariate(3.2, 2.5)
        cid = "CLOUD_101"
        att = round(min(1.0, max(0.5, ability * 0.85 + random.uniform(0.1, 0.2))), 2)
        hrs = round(min(25.0, max(2.0, ability * 18.0 + random.uniform(-2, 3))), 1)
        asg = round(min(10.0, max(2.0, ability * 8.5 + att * 1.2 + random.gauss(0, 0.4))), 2)
        quiz = round(min(10.0, max(1.5, ability * 8.8 + (hrs / 25.0) * 1.5 + random.gauss(0, 0.4))), 2)
        comp = round(min(1.0, max(0.35, ability * 0.80 + att * 0.15)), 2)
        prev = round(min(10.0, max(2.5, ability * 8.5 + 1.0 + random.gauss(0, 0.5))), 2)
        
        final_val = round(min(10.0, max(1.0, 0.15*(att*10) + 0.2*asg + 0.25*quiz + 0.15*(comp*10) + 0.25*prev + random.gauss(0, 0.3))), 2)
        
        lines.append(
            f"INSERT OR IGNORE INTO learning_records (student_id, course_id, attendance_rate, study_hours, assignment_score, quiz_score, completion_rate, previous_score, final_score) "
            f"VALUES ('{sid}', '{cid}', {att}, {hrs}, {asg}, {quiz}, {comp}, {prev}, {final_val});"
        )
        
        # Risk level
        if final_val < 5.0:
            risk = "Cao"
        elif final_val < 7.0:
            risk = "Trung bình"
        else:
            risk = "Thấp"
            
        pred_score = round(final_val + random.gauss(0, 0.2), 2)
        pred_score = max(0.0, min(10.0, pred_score))
        lines.append(
            f"INSERT OR IGNORE INTO predictions (student_id, course_id, predicted_score, risk_level, model_version) "
            f"VALUES ('{sid}', '{cid}', {pred_score}, '{risk}', 'v1.2.0-rf');"
        )
        
        # Topic results
        for topic in cloud_topics:
            t_score = round(min(10.0, max(1.5, ability * 8.5 + random.gauss(0, 1.2))), 1)
            lines.append(
                f"INSERT OR IGNORE INTO topic_results (student_id, course_id, topic_name, score) "
                f"VALUES ('{sid}', '{cid}', '{topic}', {t_score});"
            )
            
            # Recommendation logic:
            # Topic score < 5: Ưu tiên cao (Học lại kiến thức cơ bản)
            # 5 <= score < 7: Ưu tiên trung bình (Luyện tập bổ sung)
            # 7 <= score < 8.5: Ưu tiên thấp (Học nội dung nâng cao)
            # score >= 8.5: Mở rộng (Chuyên đề mở rộng)
            if t_score < 5.0:
                prio = "Ưu tiên cao"
                status = "Chưa hoàn thành"
                url = "https://developers.cloudflare.com/workers/get-started/guide/"
            elif t_score < 7.0:
                prio = "Ưu tiên trung bình"
                status = "Chưa hoàn thành"
                url = "https://developers.cloudflare.com/d1/platform/migrations/"
            elif t_score < 8.5:
                prio = "Ưu tiên thấp"
                status = "Đang học"
                url = "https://developers.cloudflare.com/workers/runtime-apis/"
            else:
                prio = "Mở rộng"
                status = "Đã hoàn thành"
                url = "https://developers.cloudflare.com/workers-ai/models/"
                
            lines.append(
                f"INSERT OR IGNORE INTO learning_paths (student_id, course_id, topic_name, priority, resource_url, status) "
                f"VALUES ('{sid}', '{cid}', '{topic}', '{prio}', '{url}', '{status}');"
            )
            
    # Sample import history
    lines.append("\n-- 4. Dữ liệu Lịch sử Import mẫu")
    lines.append("INSERT OR IGNORE INTO import_history (filename, total_records, valid_records, invalid_records, r2_key) VALUES ('k19_cntt_hk1_scores.csv', 60, 60, 0, 'raw/imports/2026/11/k19_cntt_hk1_scores.csv');")
    lines.append("INSERT OR IGNORE INTO import_history (filename, total_records, valid_records, invalid_records, r2_key) VALUES ('student_performance_batch_02.csv', 45, 43, 2, 'raw/imports/2026/11/student_performance_batch_02.csv');")
    
    out_path = "migrations/0002_seed_data.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] Đã tạo thành công {out_path} ({len(lines)} dòng SQL)")

if __name__ == "__main__":
    generate_seed()
