-- ===== 011: ユーザープロフィール画像・ステータスメッセージ =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message TEXT;
