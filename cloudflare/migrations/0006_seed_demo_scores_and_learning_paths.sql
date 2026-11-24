CREATE TABLE IF NOT EXISTS demo_course_records (
    student_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    attendance_rate REAL NOT NULL CHECK (attendance_rate BETWEEN 0 AND 1),
    study_hours REAL NOT NULL CHECK (study_hours BETWEEN 0 AND 40),
    assignment_score REAL NOT NULL CHECK (assignment_score BETWEEN 0 AND 10),
    quiz_score REAL NOT NULL CHECK (quiz_score BETWEEN 0 AND 10),
    completion_rate REAL NOT NULL CHECK (completion_rate BETWEEN 0 AND 1),
    previous_score REAL NOT NULL CHECK (previous_score BETWEEN 0 AND 10),
    final_score REAL NOT NULL CHECK (final_score BETWEEN 0 AND 10),
    predicted_score REAL NOT NULL CHECK (predicted_score BETWEEN 0 AND 10),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Cao', 'Trung bình', 'Thấp')),
    is_seed_data INTEGER NOT NULL DEFAULT 1 CHECK (is_seed_data = 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);

WITH RECURSIVE
student_numbers(student_number) AS (
    SELECT 1
    UNION ALL
    SELECT student_number + 1 FROM student_numbers WHERE student_number < 60
),
course_definitions(course_number, course_id, course_name) AS (
    VALUES
        (1, 'DEMO-CS101', 'Cơ sở lập trình'),
        (2, 'DEMO-CS102', 'Cấu trúc dữ liệu'),
        (3, 'DEMO-CS103', 'Cơ sở dữ liệu'),
        (4, 'DEMO-CS104', 'Phân tích dữ liệu')
),
inputs AS (
    SELECT
        student_numbers.student_number,
        course_definitions.course_number,
        course_definitions.course_id,
        course_definitions.course_name,
        CASE ((student_numbers.student_number - 1) % 5)
            WHEN 0 THEN 'K20-CNTT-01'
            WHEN 1 THEN 'K21-KTPM-01'
            WHEN 2 THEN 'K22-KHMT-01'
            WHEN 3 THEN 'K23-TTĐPT-01'
            ELSE 'K24-KTĐT-01'
        END AS class_name,
        0.55 + ((student_numbers.student_number * 13 + course_definitions.course_number * 7) % 46) / 100.0 AS attendance_value,
        2 + ((student_numbers.student_number * 7 + course_definitions.course_number * 11) % 180) / 10.0 AS study_hours_value,
        3 + ((student_numbers.student_number * 17 + course_definitions.course_number * 13) % 71) / 10.0 AS assignment_value,
        3 + ((student_numbers.student_number * 29 + course_definitions.course_number * 19) % 71) / 10.0 AS quiz_value,
        0.45 + ((student_numbers.student_number * 11 + course_definitions.course_number * 17) % 56) / 100.0 AS completion_value,
        3 + ((student_numbers.student_number * 23 + course_definitions.course_number * 5) % 71) / 10.0 AS previous_value
    FROM student_numbers
    CROSS JOIN course_definitions
),
rounded_inputs AS (
    SELECT
        *,
        CAST(attendance_value * 10 + 0.5 AS INTEGER) / 10.0 AS attendance_rate,
        CAST(study_hours_value * 10 + 0.5 AS INTEGER) / 10.0 AS study_hours,
        CAST(assignment_value * 10 + 0.5 AS INTEGER) / 10.0 AS assignment_score,
        CAST(quiz_value * 10 + 0.5 AS INTEGER) / 10.0 AS quiz_score,
        CAST(completion_value * 10 + 0.5 AS INTEGER) / 10.0 AS completion_rate,
        CAST(previous_value * 10 + 0.5 AS INTEGER) / 10.0 AS previous_score
    FROM inputs
),
scored AS (
    SELECT
        *,
        CAST((
            assignment_value * 0.25 +
            quiz_value * 0.25 +
            previous_value * 0.2 +
            completion_value * 10 * 0.15 +
            attendance_value * 10 * 0.15
        ) * 10 + 0.5 AS INTEGER) / 10.0 AS final_score
    FROM rounded_inputs
),
predictions AS (
    SELECT
        *,
        CAST((
            final_score * 0.6 +
            attendance_value * 10 * 0.2 +
            completion_value * 10 * 0.2
        ) * 10 + 0.5 AS INTEGER) / 10.0 AS predicted_score
    FROM scored
)
INSERT INTO demo_course_records (
    student_id, full_name, class_name, course_id, course_name,
    attendance_rate, study_hours, assignment_score, quiz_score,
    completion_rate, previous_score, final_score, predicted_score, risk_level
)
SELECT
    printf('DEMO-%04d', student_number),
    printf('Sinh viên DEMO %03d', student_number),
    class_name,
    course_id,
    course_name,
    attendance_rate,
    study_hours,
    assignment_score,
    quiz_score,
    completion_rate,
    previous_score,
    final_score,
    predicted_score,
    CASE
        WHEN predicted_score < 5.5 OR attendance_value < 0.65 THEN 'Cao'
        WHEN predicted_score < 7 THEN 'Trung bình'
        ELSE 'Thấp'
    END
FROM predictions
WHERE 1
ON CONFLICT(student_id, course_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_demo_course_records_class
ON demo_course_records(class_name);

CREATE TABLE IF NOT EXISTS demo_learning_paths (
    path_id INTEGER PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (
        priority IN ('Ưu tiên cao', 'Ưu tiên trung bình', 'Ưu tiên thấp', 'Mở rộng')
    ),
    resource_url TEXT NOT NULL,
    current_score REAL NOT NULL CHECK (current_score BETWEEN 0 AND 10),
    target_goal TEXT NOT NULL,
    learning_materials TEXT NOT NULL,
    practice_exercises TEXT NOT NULL,
    UNIQUE (student_id, course_id),
    FOREIGN KEY (student_id, course_id)
        REFERENCES demo_course_records(student_id, course_id)
);

WITH topic_definitions(course_number, topic_name, resource_url, learning_materials, practice_exercises) AS (
    VALUES
        (1, 'Thuật toán cơ bản và hàm', 'https://docs.python.org/3/tutorial/', 'Ôn kiểu dữ liệu, biểu thức, rẽ nhánh, vòng lặp và cách chia chương trình thành hàm.', 'Viết hàm kiểm tra số nguyên tố, tính tổng dãy số và xử lý danh sách đầu vào.'),
        (2, 'Danh sách, ngăn xếp và hàng đợi', 'https://runestone.academy/ns/books/published/pythonds3/index.html', 'Học cách cài đặt danh sách liên kết, ngăn xếp, hàng đợi và phân tích độ phức tạp cơ bản.', 'Cài đặt stack/queue và giải bài toán dấu ngoặc cân bằng, hàng đợi tác vụ.'),
        (3, 'Truy vấn SQL, JOIN và lọc dữ liệu', 'https://sqlbolt.com/', 'Ôn SELECT, WHERE, GROUP BY, JOIN và cách kết hợp dữ liệu từ nhiều bảng.', 'Viết truy vấn thống kê điểm trung bình theo lớp và tìm sinh viên chưa hoàn thành bài.'),
        (4, 'Làm sạch dữ liệu và phân tích khám phá', 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/', 'Thực hành đọc dữ liệu, xử lý giá trị thiếu, kiểm tra ngoại lệ và tóm tắt dữ liệu.', 'Dùng pandas làm sạch một bảng CSV nhỏ và tạo thống kê mô tả cho các cột số.')
)
INSERT INTO demo_learning_paths (
    path_id, student_id, course_id, topic_name, priority, resource_url,
    current_score, target_goal, learning_materials, practice_exercises
)
SELECT
    CAST(substr(records.student_id, 6) AS INTEGER) * 10 + topics.course_number,
    records.student_id,
    records.course_id,
    topics.topic_name,
    CASE
        WHEN records.final_score < 5 THEN 'Ưu tiên cao'
        WHEN records.final_score < 7 THEN 'Ưu tiên trung bình'
        WHEN records.final_score < 8.5 THEN 'Ưu tiên thấp'
        ELSE 'Mở rộng'
    END,
    topics.resource_url,
    records.final_score,
    'Mục tiêu: đạt ít nhất 7/10 ở chủ đề này.',
    topics.learning_materials,
    topics.practice_exercises
FROM demo_course_records AS records
JOIN topic_definitions AS topics
    ON topics.course_number = CAST(substr(records.course_id, 8) AS INTEGER) - 100
WHERE 1
ON CONFLICT(path_id) DO NOTHING;
