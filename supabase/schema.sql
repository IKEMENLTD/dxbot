-- ===== DXBOT Schema v5.4 =====
-- Supabase PostgreSQL DDL
-- 全テーブルの id は TEXT PRIMARY KEY（seed_data との整合性確保）

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

-- ===== users =====
CREATE TABLE users (
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
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_completed_step TEXT,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  stumble_count INTEGER NOT NULL DEFAULT 0,
  stumble_how_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  techstars_started_at TIMESTAMPTZ,
  techstars_completed_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ,
  line_user_id TEXT
);

CREATE INDEX idx_users_score ON users (score DESC);
CREATE INDEX idx_users_customer_status ON users (customer_status);
CREATE INDEX idx_users_recommended_exit ON users (recommended_exit);
CREATE INDEX idx_users_last_action_at ON users (last_action_at DESC);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
CREATE INDEX idx_users_line_user_id ON users (line_user_id);

-- ===== deals =====
CREATE TABLE deals (
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
CREATE TABLE user_steps (
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
CREATE TABLE cta_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger cta_trigger NOT NULL,
  recommended_exit exit_type NOT NULL,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result cta_result NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cta_history_user_id ON cta_history (user_id);
CREATE INDEX idx_cta_history_fired_at ON cta_history (fired_at DESC);
CREATE INDEX idx_cta_history_result ON cta_history (result);

-- ===== user_timeline =====
CREATE TABLE user_timeline (
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
CREATE TABLE recommend_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exit_type exit_type NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommend_scores_user_id ON recommend_scores (user_id);
CREATE INDEX idx_recommend_scores_exit_type ON recommend_scores (exit_type);
CREATE UNIQUE INDEX idx_recommend_scores_user_exit ON recommend_scores (user_id, exit_type);

-- ===== VIEWs =====

-- hot_users_view: スコア降順で活動中ユーザー
CREATE OR REPLACE VIEW hot_users_view AS
SELECT *
FROM users
WHERE customer_status NOT IN ('churned')
  AND (paused_until IS NULL OR paused_until < NOW())
ORDER BY score DESC;

-- weekly_kpi_view: 週次ファネルKPI集計
CREATE OR REPLACE VIEW weekly_kpi_view AS
SELECT
  TO_CHAR(DATE_TRUNC('week', t.created_at), 'MM/DD') AS week,
  COUNT(*) FILTER (WHERE t.type = 'step_completed' OR t.type = 'stumble') AS inflow,
  COUNT(*) FILTER (WHERE t.type = 'step_completed' AND t.metadata->>'step_id' = 'S01') AS diagnosed,
  COUNT(*) FILTER (WHERE t.type = 'step_completed' AND t.metadata->>'step_id' = 'S02') AS step_started,
  COUNT(*) FILTER (WHERE t.type = 'cta_fired') AS cta_fired,
  COUNT(*) FILTER (WHERE t.type = 'status_change' AND t.metadata->>'to' = 'meeting') AS meeting,
  COUNT(*) FILTER (WHERE t.type = 'deal_created') AS converted
FROM user_timeline t
WHERE t.created_at >= NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', t.created_at)
ORDER BY DATE_TRUNC('week', t.created_at);

-- ===== chat_messages =====
CREATE TABLE chat_messages (
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

-- ===== RLS (Row Level Security) =====
-- service_role キーで全アクセス。anon キーでは一切拒否（2重防御）。

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommend_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- users: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_users" ON users FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_users" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_users" ON users FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_users" ON users FOR DELETE USING (false);

-- deals: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_deals" ON deals FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_deals" ON deals FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_deals" ON deals FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_deals" ON deals FOR DELETE USING (false);

-- user_steps: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_user_steps" ON user_steps FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_steps" ON user_steps FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_steps" ON user_steps FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_steps" ON user_steps FOR DELETE USING (false);

-- cta_history: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_cta_history" ON cta_history FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_cta_history" ON cta_history FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_cta_history" ON cta_history FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_cta_history" ON cta_history FOR DELETE USING (false);

-- user_timeline: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_user_timeline" ON user_timeline FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_user_timeline" ON user_timeline FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_user_timeline" ON user_timeline FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_user_timeline" ON user_timeline FOR DELETE USING (false);

-- recommend_scores: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_recommend_scores" ON recommend_scores FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_recommend_scores" ON recommend_scores FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_recommend_scores" ON recommend_scores FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_recommend_scores" ON recommend_scores FOR DELETE USING (false);

-- chat_messages: anon キーでの全操作を拒否
CREATE POLICY "deny_anon_select_chat_messages" ON chat_messages FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_chat_messages" ON chat_messages FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_chat_messages" ON chat_messages FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_chat_messages" ON chat_messages FOR DELETE USING (false);
