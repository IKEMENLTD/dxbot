-- ===== Migration 015: 既読判定をread_atベースに統一 + seed keyの修正 =====

-- ---------------------------------------------------------------------------
-- 1. contact_list_view の未読カウントを read_at IS NULL に変更
--    既存: cm2.read = FALSE → 新APIは read_at のみ更新するため不整合
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW contact_list_view AS
SELECT
  u.id,
  u.preferred_name,
  u.company_name,
  u.industry,
  u.customer_status,
  u.profile_picture_url,
  u.tags,
  u.tracking_link_id,
  unread.unread_count,
  latest_msg.last_message,
  latest_msg.last_message_at,
  latest_msg.last_sender
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS unread_count FROM chat_messages cm2
  WHERE cm2.user_id = u.id AND cm2.sender = 'user' AND cm2.read_at IS NULL
) unread ON TRUE
LEFT JOIN LATERAL (
  SELECT
    cm3.content AS last_message,
    cm3.sent_at AS last_message_at,
    cm3.sender  AS last_sender
  FROM chat_messages cm3
  WHERE cm3.user_id = u.id
  ORDER BY cm3.sent_at DESC
  LIMIT 1
) latest_msg ON TRUE
WHERE EXISTS (
  SELECT 1 FROM chat_messages cm4 WHERE cm4.user_id = u.id
)
ORDER BY latest_msg.last_message_at DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 2. 既読APIが read_at を更新する際に read カラムも同期
--    contact_list_viewのfallback + 既存インデックス idx_chat_messages_unread 対応
-- ---------------------------------------------------------------------------

-- read_at が設定されたら read = TRUE、NULLなら read = FALSE に同期するトリガー
CREATE OR REPLACE FUNCTION sync_read_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read IS FALSE) THEN
    NEW.read := TRUE;
  ELSIF NEW.read_at IS NULL AND (OLD.read_at IS NOT NULL OR OLD.read IS TRUE) THEN
    NEW.read := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_read_columns ON chat_messages;
CREATE TRIGGER trg_sync_read_columns
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_read_columns();

-- 既存データの同期: read_at が設定されているのに read = FALSE のレコードを修正
UPDATE chat_messages SET read = TRUE WHERE read_at IS NOT NULL AND read = FALSE;
UPDATE chat_messages SET read = FALSE WHERE read_at IS NULL AND read = TRUE;

-- ---------------------------------------------------------------------------
-- 3. seed data のキー名修正: 'line.config' → 'line_config'
--    コード側は 'line_config' を参照するため不一致
-- ---------------------------------------------------------------------------

UPDATE app_settings SET key = 'line_config' WHERE key = 'line.config';

-- ---------------------------------------------------------------------------
-- 4. users.precision_score に CHECK 制約を追加（assessment_responsesとの統一）
-- ---------------------------------------------------------------------------

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_precision_score_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_precision_score_range'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_precision_score_range
      CHECK (precision_score IS NULL OR precision_score BETWEEN 30 AND 150);
  END IF;
END $$;
