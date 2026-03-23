-- users テーブルに line_user_id カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
