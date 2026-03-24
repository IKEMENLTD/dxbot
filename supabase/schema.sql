-- ===== DXBOT Schema v5.5 =====
-- Supabase PostgreSQL DDL
-- 全テーブルの id は TEXT PRIMARY KEY（seed_data との整合性確保）
-- マイグレーション 001_chat / 002_dashboard_carte / 003_funnel_settings_line を統合

-- ENUMs
CREATE TYPE exit_type AS ENUM ('techstars', 'taskmate', 'veteran_ai', 'custom_dev');
CREATE TYPE customer_status AS ENUM ('prospect', 'contacted', 'meeting', 'customer', 'churned', 'techstars_active', 'techstars_grad');
CREATE TYPE lead_source AS ENUM ('apo', 'threads', 'x', 'instagram', 'referral', 'other');
CREATE TYPE stumble_type AS ENUM ('how', 'motivation', 'time');
CREATE TYPE deal_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE cta_trigger AS ENUM ('action_boost', 'apo_early', 'subsidy_timing', 'lv40_reached', 'invoice_stumble', 'it_literacy');
CREATE TYPE cta_result AS ENUM ('pending', 'clicked', 'converted', 'ignored');
CREATE TYPE timeline_type AS ENUM ('step_completed', 'stumble', 'step_skipped', 'cta_fired', 'status_change', 'techstars_start', 'techstars_complete', 'rediagnosis', 'deal_created', 'note_added', 'reminder_sent');
CREATE TYPE step_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE chat_sender AS ENUM ('user', 'admin');
CREATE TYPE tag_color AS ENUM ('green', 'orange', 'gray');

-- ===== users =====
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  preferred_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  recommended_exit exit_type NOT NULL DEFAULT 'techstars',
  customer_status customer_status NOT NULL DEFAULT 'prospect',
  lead_source lead_source NOT NULL DEFAULT 'other',
  lead_note TEXT,
  axis_scores JSONB NOT NULL DEFAULT '{"a1":0,"a2":0,"b":0,"c":0,"d":0}',
  prev_scores JSONB,
  weak_axis TEXT NOT NULL DEFAULT '',
  badges TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_completed_step TEXT,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  stumble_count INTEGER NOT NULL DEFAULT 0,
  stumble_how_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  techstars_started_at TIMESTAMPTZ,
  techstars_completed_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ,
  line_user_id TEXT,
  profile_picture_url TEXT,
  status_message TEXT
);

CREATE INDEX idx_users_score ON users (score DESC);
CREATE INDEX idx_users_customer_status ON users (customer_status);
CREATE INDEX idx_users_recommended_exit ON users (recommended_exit);
CREATE INDEX idx_users_last_action_at ON users (last_action_at DESC);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
CREATE UNIQUE INDEX idx_users_line_user_id ON users (line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX idx_users_tags ON users USING GIN (tags);

-- ===== deals =====
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exit_type exit_type NOT NULL,
  deal_amount INTEGER NOT NULL DEFAULT 0,
  subsidy_amount INTEGER NOT NULL DEFAULT 0,
  deal_stage INTEGER NOT NULL DEFAULT 1,
  status deal_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_user_id ON deals (user_id);
CREATE INDEX idx_deals_status ON deals (status);
CREATE INDEX idx_deals_exit_type ON deals (exit_type);
CREATE INDEX idx_deals_started_at ON deals (started_at DESC);

-- ===== user_steps =====
CREATE TABLE IF NOT EXISTS user_steps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status step_status NOT NULL DEFAULT 'not_started',
  stumble_type stumble_type,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_steps_user_id ON user_steps (user_id);
CREATE INDEX idx_user_steps_step_id ON user_steps (step_id);
CREATE INDEX idx_user_steps_status ON user_steps (status);
CREATE UNIQUE INDEX idx_user_steps_user_step ON user_steps (user_id, step_id);

-- ===== cta_history =====
CREATE TABLE IF NOT EXISTS cta_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger cta_trigger NOT NULL,
  recommended_exit exit_type NOT NULL,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result cta_result NOT NULL DEFAULT 'pending',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cta_history_user_id ON cta_history (user_id);
CREATE INDEX idx_cta_history_fired_at ON cta_history (fired_at DESC);
CREATE INDEX idx_cta_history_result ON cta_history (result);

-- ===== user_timeline =====
CREATE TABLE IF NOT EXISTS user_timeline (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type timeline_type NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_timeline_user_id ON user_timeline (user_id);
CREATE INDEX idx_user_timeline_created_at ON user_timeline (created_at DESC);
CREATE INDEX idx_user_timeline_type ON user_timeline (type);

-- ===== recommend_scores =====
CREATE TABLE IF NOT EXISTS recommend_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exit_type exit_type NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommend_scores_user_id ON recommend_scores (user_id);
CREATE INDEX idx_recommend_scores_exit_type ON recommend_scores (exit_type);
CREATE UNIQUE INDEX idx_recommend_scores_user_exit ON recommend_scores (user_id, exit_type);

-- ===== tags =====
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color tag_color NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_sort_order ON tags (sort_order);

-- ===== user_tags =====
CREATE TABLE IF NOT EXISTS user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_tags_unique ON user_tags (user_id, tag_id);
CREATE INDEX idx_user_tags_user_id ON user_tags (user_id);
CREATE INDEX idx_user_tags_tag_id ON user_tags (tag_id);

-- ===== user_notes =====
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notes_user_id ON user_notes (user_id);
CREATE INDEX idx_user_notes_created_at ON user_notes (created_at DESC);

-- ===== monthly_goals =====
CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL UNIQUE,
  target_converted INTEGER NOT NULL DEFAULT 3,
  target_revenue INTEGER NOT NULL DEFAULT 5000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== templates =====
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_sort_order ON templates (sort_order);

-- ===== custom_lead_sources =====
CREATE TABLE IF NOT EXISTS custom_lead_sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_lead_sources_sort ON custom_lead_sources (sort_order);

-- ===== diagnosis_results =====
CREATE TABLE IF NOT EXISTS diagnosis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  axis_scores JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  band INTEGER NOT NULL,
  weak_axis TEXT NOT NULL,
  industry TEXT,
  diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnosis_results_user_id ON diagnosis_results (user_id);
CREATE INDEX idx_diagnosis_results_diagnosed_at ON diagnosis_results (diagnosed_at DESC);

-- ===== conversation_states =====
CREATE TABLE IF NOT EXISTS conversation_states (
  line_user_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  state JSONB NOT NULL DEFAULT '{"phase":"idle"}',
  preferred_name TEXT,
  industry TEXT,
  lead_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_states_user_id ON conversation_states (user_id);
CREATE INDEX idx_conversation_states_phase ON conversation_states ((state->>'phase'));

-- ===== chat_messages =====
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender chat_sender NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  media_attachments JSONB NOT NULL DEFAULT '[]',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  line_user_id TEXT,
  line_message_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'sticker', 'postback')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages (user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages (created_at DESC);
CREATE INDEX idx_chat_messages_user_created ON chat_messages (user_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages (user_id, read) WHERE read = FALSE;
CREATE INDEX idx_chat_messages_sent_at ON chat_messages (sent_at DESC);
CREATE INDEX idx_chat_messages_line_user_id ON chat_messages (line_user_id);
CREATE INDEX idx_chat_messages_direction ON chat_messages (direction);

-- ===== app_settings =====
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== tracking_links =====
CREATE TABLE IF NOT EXISTS tracking_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  lead_source TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_links_code ON tracking_links(code);
CREATE INDEX idx_tracking_links_active ON tracking_links(is_active);

-- ===== tracking_clicks =====
CREATE TABLE IF NOT EXISTS tracking_clicks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tracking_link_id TEXT NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  referer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  language TEXT,
  country TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tracking_clicks_link ON tracking_clicks(tracking_link_id);
CREATE INDEX idx_tracking_clicks_at ON tracking_clicks(clicked_at DESC);

-- users.tracking_link_id（流入元リンクとの紐付け）
ALTER TABLE users ADD COLUMN IF NOT EXISTS tracking_link_id TEXT REFERENCES tracking_links(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_tracking_link ON users(tracking_link_id);

-- ===== VIEWs =====

-- hot_users_view: スコア降順で活動中ユーザー（タグ情報・経過日数付き）
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

-- weekly_kpi_view: 週次ファネルKPI集計
CREATE OR REPLACE VIEW weekly_kpi_view AS
WITH weekly_inflow AS (
  SELECT DATE_TRUNC('week', u.created_at) AS week_start, COUNT(*) AS inflow
  FROM users u WHERE u.created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', u.created_at)
),
weekly_timeline AS (
  SELECT
    DATE_TRUNC('week', t.created_at) AS week_start,
    COUNT(*) FILTER (WHERE t.type = 'rediagnosis' OR (t.type = 'step_completed' AND t.metadata->>'step_id' = 'S01')) AS diagnosed,
    COUNT(DISTINCT t.user_id) FILTER (WHERE t.type = 'step_completed' AND t.metadata->>'step_id' != 'S01') AS step_started,
    COUNT(*) FILTER (WHERE t.type = 'cta_fired') AS cta_fired,
    COUNT(*) FILTER (WHERE t.type = 'status_change' AND t.metadata->>'to' = 'meeting') AS meeting,
    COUNT(*) FILTER (WHERE t.type = 'deal_created') AS converted
  FROM user_timeline t WHERE t.created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', t.created_at)
)
SELECT
  TO_CHAR(COALESCE(wi.week_start, wt.week_start), 'MM/DD') AS week,
  COALESCE(wi.inflow, 0)::INT AS inflow,
  COALESCE(wt.diagnosed, 0)::INT AS diagnosed,
  COALESCE(wt.step_started, 0)::INT AS step_started,
  COALESCE(wt.cta_fired, 0)::INT AS cta_fired,
  COALESCE(wt.meeting, 0)::INT AS meeting,
  COALESCE(wt.converted, 0)::INT AS converted
FROM weekly_inflow wi
FULL OUTER JOIN weekly_timeline wt ON wi.week_start = wt.week_start
ORDER BY COALESCE(wi.week_start, wt.week_start);

-- exit_metrics_view: 出口別成約サマリ
CREATE OR REPLACE VIEW exit_metrics_view AS
SELECT
  d.exit_type,
  COUNT(*)::INT AS count,
  COALESCE(SUM(d.deal_amount), 0)::INT AS revenue,
  COALESCE(SUM(d.subsidy_amount), 0)::INT AS subsidy_total
FROM deals d
WHERE d.status IN ('active', 'completed')
GROUP BY d.exit_type
ORDER BY count DESC;

-- contact_list_view: チャットコンタクト一覧
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

-- user_detail_view: 個人カルテ用
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

-- ===== RLS (Row Level Security) =====
-- service_role キーで全アクセス。anon キーでは一切拒否（2重防御）。

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommend_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "deny_anon_select_users" ON users FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_users" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_users" ON users FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_users" ON users FOR DELETE USING (false);

-- deals
CREATE POLICY "deny_anon_select_deals" ON deals FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_deals" ON deals FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_deals" ON deals FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_deals" ON deals FOR DELETE USING (false);

-- user_steps
CREATE POLICY "deny_anon_select_user_steps" ON user_steps FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_steps" ON user_steps FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_steps" ON user_steps FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_steps" ON user_steps FOR DELETE USING (false);

-- cta_history
CREATE POLICY "deny_anon_select_cta_history" ON cta_history FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_cta_history" ON cta_history FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_cta_history" ON cta_history FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_cta_history" ON cta_history FOR DELETE USING (false);

-- user_timeline
CREATE POLICY "deny_anon_select_user_timeline" ON user_timeline FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_timeline" ON user_timeline FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_timeline" ON user_timeline FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_timeline" ON user_timeline FOR DELETE USING (false);

-- recommend_scores
CREATE POLICY "deny_anon_select_recommend_scores" ON recommend_scores FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_recommend_scores" ON recommend_scores FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_recommend_scores" ON recommend_scores FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_recommend_scores" ON recommend_scores FOR DELETE USING (false);

-- tags
CREATE POLICY "deny_anon_select_tags" ON tags FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_tags" ON tags FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_tags" ON tags FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_tags" ON tags FOR DELETE USING (false);

-- user_tags
CREATE POLICY "deny_anon_select_user_tags" ON user_tags FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_tags" ON user_tags FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_tags" ON user_tags FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_tags" ON user_tags FOR DELETE USING (false);

-- user_notes
CREATE POLICY "deny_anon_select_user_notes" ON user_notes FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_notes" ON user_notes FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_notes" ON user_notes FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_notes" ON user_notes FOR DELETE USING (false);

-- monthly_goals
CREATE POLICY "deny_anon_select_monthly_goals" ON monthly_goals FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_monthly_goals" ON monthly_goals FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_monthly_goals" ON monthly_goals FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_monthly_goals" ON monthly_goals FOR DELETE USING (false);

-- templates
CREATE POLICY "deny_anon_select_templates" ON templates FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_templates" ON templates FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_templates" ON templates FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_templates" ON templates FOR DELETE USING (false);

-- custom_lead_sources
CREATE POLICY "deny_anon_select_custom_lead_sources" ON custom_lead_sources FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_custom_lead_sources" ON custom_lead_sources FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_custom_lead_sources" ON custom_lead_sources FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_custom_lead_sources" ON custom_lead_sources FOR DELETE USING (false);

-- diagnosis_results
CREATE POLICY "deny_anon_select_diagnosis_results" ON diagnosis_results FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_diagnosis_results" ON diagnosis_results FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_diagnosis_results" ON diagnosis_results FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_diagnosis_results" ON diagnosis_results FOR DELETE USING (false);

-- chat_messages
CREATE POLICY "deny_anon_select_chat_messages" ON chat_messages FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_chat_messages" ON chat_messages FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_chat_messages" ON chat_messages FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_chat_messages" ON chat_messages FOR DELETE USING (false);

-- conversation_states
CREATE POLICY "deny_anon_select_conversation_states" ON conversation_states FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_conversation_states" ON conversation_states FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_conversation_states" ON conversation_states FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_conversation_states" ON conversation_states FOR DELETE USING (false);

-- app_settings
CREATE POLICY "deny_anon_select_app_settings" ON app_settings FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_app_settings" ON app_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_app_settings" ON app_settings FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_app_settings" ON app_settings FOR DELETE USING (false);

-- tracking_clicks
CREATE POLICY "deny_anon_select_tracking_clicks" ON tracking_clicks FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_insert_tracking_clicks" ON tracking_clicks FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_tracking_clicks" ON tracking_clicks FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_tracking_clicks" ON tracking_clicks FOR DELETE TO anon USING (false);

-- tracking_links
CREATE POLICY "deny_anon_select_tracking_links" ON tracking_links FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_insert_tracking_links" ON tracking_links FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_tracking_links" ON tracking_links FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_tracking_links" ON tracking_links FOR DELETE TO anon USING (false);

-- ===== トリガー =====

-- users.updated_at 自動更新
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

-- ステータス変更時にタイムライン自動記録
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

-- メモ保存時にタイムライン自動記録
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

-- ===== ストアド関数 =====

-- 任意期間のファネルKPIを計算
CREATE OR REPLACE FUNCTION calculate_funnel_kpi(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (inflow INT, diagnosed INT, step_started INT, cta_fired INT, meeting INT, converted INT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM users u WHERE u.created_at >= p_start_date AND u.created_at < p_end_date),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND (t.type = 'rediagnosis' OR (t.type = 'step_completed' AND t.metadata->>'step_id' = 'S01'))),
    (SELECT COUNT(DISTINCT t.user_id)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND t.type = 'step_completed' AND t.metadata->>'step_id' != 'S01'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date AND t.type = 'cta_fired'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND t.type = 'status_change' AND t.metadata->>'to' = 'meeting'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date AND t.type = 'deal_created');
END;
$$;

-- レコメンドスコアのUPSERT
CREATE OR REPLACE FUNCTION update_recommendation(
  p_user_id TEXT, p_exit_type exit_type, p_score NUMERIC(5,2),
  p_reason TEXT DEFAULT '', p_confidence NUMERIC(5,2) DEFAULT 0, p_reasons JSONB DEFAULT '[]'
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO recommend_scores (id, user_id, exit_type, score, reason, confidence, reasons, calculated_at)
  VALUES ('rs-' || gen_random_uuid(), p_user_id, p_exit_type, p_score, p_reason, p_confidence, p_reasons, NOW())
  ON CONFLICT (user_id, exit_type)
  DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason,
    confidence = EXCLUDED.confidence, reasons = EXCLUDED.reasons, calculated_at = NOW();
END;
$$;
