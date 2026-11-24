CREATE TABLE IF NOT EXISTS demo_learning_path_status (
    student_id TEXT NOT NULL,
    path_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('Chưa hoàn thành', 'Đang học', 'Đã hoàn thành')
    ),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, path_id)
);
