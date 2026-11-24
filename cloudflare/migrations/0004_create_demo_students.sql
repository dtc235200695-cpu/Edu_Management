CREATE TABLE IF NOT EXISTS demo_students (
    student_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    attendance_rate REAL NOT NULL,
    study_hours REAL NOT NULL,
    assignment_score REAL NOT NULL,
    quiz_score REAL NOT NULL,
    completion_rate REAL NOT NULL,
    previous_score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_demo_students_class
ON demo_students(class_name);
