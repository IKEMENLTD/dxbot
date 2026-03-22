-- ===================================================================
-- 001_chat.sql
-- チャットページ用: メッセージ、タグマスター、ユーザータグ
-- ===================================================================

-- ENUMs
CREATE TYPE tag_color AS ENUM ('green', 'orange', 'gray');
CREATE TYPE chat_sender AS ENUM ('user', 'admin');

-- ===================================================================
-- tags マスターテーブル
-- id は TEXT（users.tags の 'tag-1' 等と照合するため）
-- ===================================================================
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color tag_color NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tags IS 'タグマスター: ユーザーに付与できるタグの定義';
COMMENT ON COLUMN tags.label IS 'タグの表示名（例: 高確度、補助金候補）';
COMMENT ON COLUMN tags.color IS '表示色: green=ポジティブ, orange=注意, gray=情報';
COMMENT ON COLUMN tags.sort_order IS '表示順（昇順）';

CREATE INDEX idx_tags_sort_order ON tags (sort_order);

-- ===================================================================
-- user_tags テーブル（多対多リレーション）
-- ===================================================================
CREATE TABLE user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_tags IS 'ユーザー×タグの多対多リレーション';

CREATE UNIQUE INDEX idx_user_tags_unique ON user_tags (user_id, tag_id);
CREATE INDEX idx_user_tags_user_id ON user_tags (user_id);
CREATE INDEX idx_user_tags_tag_id ON user_tags (tag_id);

-- ===================================================================
-- chat_messages テーブル
-- ===================================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender chat_sender NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  media_attachments JSONB NOT NULL DEFAULT '[]',
  -- media_attachments の構造:
  -- [{ "id": "...", "type": "image"|"video", "url": "...", "name": "...", "size": 12345, "mimeType": "image/png" }]
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE chat_messages IS '1:1チャットメッセージ: 管理者⇔ユーザー間のやり取り';
COMMENT ON COLUMN chat_messages.sender IS 'user=ユーザー側, admin=管理者側';
COMMENT ON COLUMN chat_messages.media_attachments IS '添付メディア（JSONB配列）';
COMMENT ON COLUMN chat_messages.read IS '既読フラグ（管理者視点）';

CREATE INDEX idx_chat_messages_user_id ON chat_messages (user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages (created_at DESC);
CREATE INDEX idx_chat_messages_user_created ON chat_messages (user_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages (user_id, read) WHERE read = FALSE;

-- ===================================================================
-- VIEW: contact_list_view
-- tags.id は TEXT、users.tags も TEXT[] なので直接照合可能
-- ===================================================================
CREATE OR REPLACE VIEW contact_list_view AS
SELECT
  u.id AS user_id,
  u.preferred_name,
  u.company_name,
  u.customer_status,
  u.recommended_exit,
  u.score,
  u.last_action_at,
  lm.last_message_content,
  lm.last_message_time,
  lm.last_message_sender,
  COALESCE(unread.unread_count, 0) AS unread_count,
  COALESCE(tg.tags, '[]'::JSONB) AS tags
FROM users u
LEFT JOIN LATERAL (
  SELECT cm.content AS last_message_content, cm.created_at AS last_message_time, cm.sender AS last_message_sender
  FROM chat_messages cm WHERE cm.user_id = u.id ORDER BY cm.created_at DESC LIMIT 1
) lm ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS unread_count FROM chat_messages cm2
  WHERE cm2.user_id = u.id AND cm2.sender = 'user' AND cm2.read = FALSE
) unread ON TRUE
LEFT JOIN LATERAL (
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', t.id, 'label', t.label, 'color', t.color) ORDER BY t.sort_order) AS tags
  FROM tags t WHERE t.id = ANY(u.tags)
) tg ON TRUE
ORDER BY lm.last_message_time DESC NULLS LAST;

COMMENT ON VIEW contact_list_view IS 'チャットコンタクト一覧: ユーザー+最新メッセージ+未読数+タグ';

-- ===================================================================
-- RLS
-- ===================================================================
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_insert" ON tags FOR INSERT WITH CHECK (true);
CREATE POLICY "tags_update" ON tags FOR UPDATE USING (true);
CREATE POLICY "tags_delete" ON tags FOR DELETE USING (true);

CREATE POLICY "user_tags_select" ON user_tags FOR SELECT USING (true);
CREATE POLICY "user_tags_insert" ON user_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "user_tags_delete" ON user_tags FOR DELETE USING (true);

CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE USING (true);

-- ===================================================================
-- 初期データ: タグマスター（id を TEXT で明示指定）
-- ===================================================================
INSERT INTO tags (id, label, color, sort_order) VALUES
  ('tag-1',  '高確度',           'green',  1),
  ('tag-2',  '補助金候補',       'green',  2),
  ('tag-3',  'フォロー必要',     'orange', 3),
  ('tag-4',  '要再アプローチ',   'orange', 4),
  ('tag-5',  'IT苦手',           'gray',   5),
  ('tag-6',  '決裁者',           'green',  6),
  ('tag-7',  '紹介可能',         'green',  7),
  ('tag-8',  '予算あり',         'green',  8),
  ('tag-9',  '繁忙期',           'orange', 9),
  ('tag-10', 'インボイス対応済', 'gray',  10);
