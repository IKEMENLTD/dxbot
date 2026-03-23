-- ===================================================================
-- 005_chat_messages_line_columns.sql
-- chat_messages に LINE 連携用カラムを追加
-- direction / line_user_id / line_message_id / message_type / sent_at / read_at
-- ===================================================================

-- direction: inbound(LINE->管理画面) / outbound(管理画面->LINE)
-- 既存の sender カラム (user/admin) と対応させるため、
-- sender='user' -> direction='inbound', sender='admin' -> direction='outbound'
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS line_user_id TEXT,
  ADD COLUMN IF NOT EXISTS line_message_id TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'sticker', 'postback')),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 既存データのdirection を sender から移行
UPDATE chat_messages SET direction = 'inbound' WHERE sender = 'user';
UPDATE chat_messages SET direction = 'outbound' WHERE sender = 'admin';

-- 既存データの sent_at を created_at からコピー
UPDATE chat_messages SET sent_at = created_at WHERE sent_at IS NULL OR sent_at = created_at;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON chat_messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_line_user_id ON chat_messages (line_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_direction ON chat_messages (direction);

COMMENT ON COLUMN chat_messages.direction IS 'inbound=LINE受信, outbound=管理者送信';
COMMENT ON COLUMN chat_messages.line_user_id IS 'LINEユーザーID（Uxxxxxxxxxx）';
COMMENT ON COLUMN chat_messages.line_message_id IS 'LINEメッセージID';
COMMENT ON COLUMN chat_messages.message_type IS 'メッセージ種別: text/image/sticker/postback';
COMMENT ON COLUMN chat_messages.sent_at IS '送信日時（LINEタイムスタンプ or 管理者送信日時）';
COMMENT ON COLUMN chat_messages.read_at IS '既読日時';
