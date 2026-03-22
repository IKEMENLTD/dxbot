-- ===================================================================
-- 002_dashboard_carte.sql
-- 熱い人リスト + 個人カルテ用: カラム追加、メモ、VIEW、トリガー
-- ===================================================================

-- ===================================================================
-- users テーブルへのカラム追加
-- ===================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_line_user_id ON users (line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_tags ON users USING GIN (tags);

-- ===================================================================
-- user_notes テーブル（メモ履歴）
-- ===================================================================
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_notes IS '個人カルテのメモ履歴';

CREATE INDEX idx_user_notes_user_id ON user_notes (user_id);
CREATE INDEX idx_user_notes_created_at ON user_notes (created_at DESC);

-- RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_notes_select" ON user_notes FOR SELECT USING (true);
CREATE POLICY "user_notes_insert" ON user_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "user_notes_update" ON user_notes FOR UPDATE USING (true);
CREATE POLICY "user_notes_delete" ON user_notes FOR DELETE USING (true);

-- ===================================================================
-- 既存テーブルの不足RLSポリシー追加
-- schema.sql で定義済みのポリシーとは別名で追加
-- ===================================================================
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "user_steps_insert" ON user_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "user_steps_update" ON user_steps FOR UPDATE USING (true);
CREATE POLICY "cta_history_insert" ON cta_history FOR INSERT WITH CHECK (true);
CREATE POLICY "cta_history_update" ON cta_history FOR UPDATE USING (true);
CREATE POLICY "recommend_scores_insert" ON recommend_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "recommend_scores_update" ON recommend_scores FOR UPDATE USING (true);

-- ===================================================================
-- トリガー: users.updated_at 自動更新
-- ===================================================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ===================================================================
-- トリガー: ステータス変更時にタイムライン自動記録
-- ===================================================================
CREATE OR REPLACE FUNCTION log_status_change_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.customer_status IS DISTINCT FROM NEW.customer_status THEN
    INSERT INTO user_timeline (id, user_id, type, description, metadata)
    VALUES (
      'tl-auto-' || gen_random_uuid(),
      NEW.id,
      'status_change',
      'ステータス変更: ' || OLD.customer_status || ' → ' || NEW.customer_status,
      JSONB_BUILD_OBJECT('from', OLD.customer_status, 'to', NEW.customer_status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_status_change
  AFTER UPDATE OF customer_status ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change_to_timeline();

-- ===================================================================
-- トリガー: メモ保存時にタイムライン自動記録
-- ===================================================================
CREATE OR REPLACE FUNCTION log_note_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_timeline (id, user_id, type, description, metadata)
  VALUES (
    'tl-note-' || gen_random_uuid(),
    NEW.user_id,
    'note_added',
    '営業メモ: ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    JSONB_BUILD_OBJECT('note_id', NEW.id, 'created_by', NEW.created_by)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_note_added
  AFTER INSERT ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_note_to_timeline();

-- ===================================================================
-- VIEW: hot_users_view（改善版）
-- tags.id は TEXT、users.tags も TEXT[] なので直接照合
-- ===================================================================
DROP VIEW IF EXISTS hot_users_view;

CREATE OR REPLACE VIEW hot_users_view AS
SELECT
  u.*,
  COALESCE(
    (SELECT ARRAY_AGG(t.label ORDER BY t.label) FROM tags t WHERE t.id = ANY(u.tags)),
    '{}'
  ) AS tag_labels,
  (u.customer_status = 'techstars_grad') AS is_techstars_grad,
  EXTRACT(DAY FROM NOW() - u.last_action_at)::INTEGER AS days_since_action
FROM users u
WHERE u.customer_status != 'churned'
  AND (u.paused_until IS NULL OR u.paused_until < NOW())
ORDER BY u.score DESC;

COMMENT ON VIEW hot_users_view IS '熱い人リスト用ビュー（タグ情報・経過日数付き）';

-- ===================================================================
-- VIEW: user_detail_view（個人カルテ用）
-- ===================================================================
CREATE OR REPLACE VIEW user_detail_view AS
SELECT
  u.*,
  COALESCE(
    (SELECT ARRAY_AGG(t.label ORDER BY t.label) FROM tags t WHERE t.id = ANY(u.tags)),
    '{}'
  ) AS tag_labels,
  COALESCE(
    (SELECT JSONB_OBJECT_AGG(rs.exit_type, JSONB_BUILD_OBJECT('score', rs.score, 'reason', rs.reason))
     FROM recommend_scores rs WHERE rs.user_id = u.id),
    '{}'::JSONB
  ) AS recommend_results,
  (SELECT COUNT(*) FROM deals d WHERE d.user_id = u.id AND d.status != 'cancelled')::INTEGER AS deal_count,
  COALESCE((SELECT SUM(d.deal_amount) FROM deals d WHERE d.user_id = u.id AND d.status != 'cancelled'), 0)::INTEGER AS total_ltv,
  COALESCE((SELECT SUM(d.subsidy_amount) FROM deals d WHERE d.user_id = u.id AND d.status != 'cancelled'), 0)::INTEGER AS total_subsidy,
  (SELECT un.content FROM user_notes un WHERE un.user_id = u.id ORDER BY un.created_at DESC LIMIT 1) AS latest_note,
  (SELECT COUNT(*) FROM user_notes un WHERE un.user_id = u.id)::INTEGER AS note_count
FROM users u;

COMMENT ON VIEW user_detail_view IS '個人カルテ用ビュー（レコメンド・LTV・メモ統計付き）';
