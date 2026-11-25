ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN student_id TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN password_email_sent_at TEXT;
ALTER TABLE users ADD COLUMN password_email_claimed_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id
ON users(upper(student_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
ON users(google_sub);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
