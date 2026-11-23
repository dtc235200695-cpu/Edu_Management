-- ==============================================================================
-- Cloudflare D1 Database Schema - EduInsight Learning Analytics Platform
-- File: migrations/0001_initial_schema.sql
-- ==============================================================================

-- 1. Bảng Sinh viên (students)
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Khóa học (courses)
CREATE TABLE IF NOT EXISTS courses (
    course_id TEXT PRIMARY KEY,
    course_name TEXT NOT NULL,
    semester TEXT NOT NULL
);

-- 3. Bảng Bản ghi học tập (learning_records)
CREATE TABLE IF NOT EXISTS learning_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    attendance_rate REAL NOT NULL,
    study_hours REAL NOT NULL,
    assignment_score REAL NOT NULL,
    quiz_score REAL NOT NULL,
    completion_rate REAL NOT NULL,
    previous_score REAL NOT NULL,
    final_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 4. Bảng Kết quả theo chủ đề (topic_results)
CREATE TABLE IF NOT EXISTS topic_results (
    topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 5. Bảng Dự đoán kết quả Machine Learning (predictions)
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    predicted_score REAL NOT NULL,
    risk_level TEXT NOT NULL, -- 'Thấp', 'Trung bình', 'Cao'
    model_version TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 6. Bảng Lộ trình học tập cá nhân hóa (learning_paths)
CREATE TABLE IF NOT EXISTS learning_paths (
    path_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    priority TEXT NOT NULL, -- 'Ưu tiên cao', 'Ưu tiên trung bình', 'Ưu tiên thấp', 'Mở rộng'
    resource_url TEXT NOT NULL,
    status TEXT DEFAULT 'Chưa hoàn thành', -- 'Chưa hoàn thành', 'Đang học', 'Đã hoàn thành'
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 7. Bảng Tài nguyên học tập (resources)
CREATE TABLE IF NOT EXISTS resources (
    resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_name TEXT NOT NULL,
    title TEXT NOT NULL,
    resource_url TEXT NOT NULL,
    difficulty TEXT NOT NULL -- 'Cơ bản', 'Trung bình', 'Nâng cao', 'Chuyên sâu'
);

-- 8. Bảng Lịch sử nhập dữ liệu & lưu trữ R2 (import_history)
CREATE TABLE IF NOT EXISTS import_history (
    import_id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    valid_records INTEGER NOT NULL,
    invalid_records INTEGER NOT NULL,
    r2_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_records_student ON learning_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_course ON learning_records(course_id);
CREATE INDEX IF NOT EXISTS idx_topic_results_student ON topic_results(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_results_course ON topic_results(course_id);
CREATE INDEX IF NOT EXISTS idx_predictions_student ON predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_student ON learning_paths(student_id);
CREATE INDEX IF NOT EXISTS idx_resources_topic ON resources(topic_name);
