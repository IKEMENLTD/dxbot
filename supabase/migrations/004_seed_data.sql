-- ===================================================================
-- 004_seed_data.sql
-- 初期データ: モックユーザー10名、成約4件、CTA5件、タイムライン、stumble
-- ===================================================================

-- ===================================================================
-- モックユーザー10名
-- ===================================================================
INSERT INTO users (
  id, preferred_name, company_name, industry,
  level, score, recommended_exit, customer_status, lead_source, lead_note,
  axis_scores, prev_scores, weak_axis, badges,
  last_action_at, last_completed_step, steps_completed,
  stumble_count, stumble_how_count, created_at,
  techstars_started_at, techstars_completed_at, paused_until, tags
) VALUES
  ('u-001', '田中太郎', '田中建設株式会社', '建設業', 42, 87, 'veteran_ai', 'meeting', 'apo',
   '請求管理がExcelで限界。インボイス対応が急務。',
   '{"a1":3,"a2":8,"b":12,"c":6,"d":15}', NULL, 'a1', ARRAY['cta_fired','action_boost'],
   '2026-03-21T14:30:00Z', 'S11 - 請求書テンプレート作成', 18, 3, 1, '2026-02-15T09:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-1','tag-2','tag-6']),

  ('u-002', '鈴木花子', '鈴木デザイン事務所', 'デザイン', 28, 65, 'taskmate', 'prospect', 'threads',
   NULL,
   '{"a1":10,"a2":6,"b":5,"c":8,"d":12}', NULL, 'b', ARRAY['new_this_week'],
   '2026-03-20T10:15:00Z', 'S06 - タスク整理', 8, 2, 0, '2026-03-17T11:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-7']),

  ('u-003', '山田一郎', '山田製作所', '製造業', 8, 22, 'techstars', 'prospect', 'apo',
   'うちの社員はパソコンが苦手で…紙の台帳中心。',
   '{"a1":4,"a2":5,"b":6,"c":4,"d":3}', NULL, 'd', ARRAY[]::TEXT[],
   '2026-03-18T16:00:00Z', 'S02 - PC基本操作', 2, 5, 4, '2026-03-10T08:30:00Z',
   NULL, NULL, NULL, ARRAY['tag-5','tag-3']),

  ('u-004', '佐藤美咲', '佐藤不動産', '不動産', 55, 92, 'custom_dev', 'contacted', 'apo',
   '物件管理を一気にシステム化したい。予算は補助金で。',
   '{"a1":12,"a2":14,"b":8,"c":10,"d":13}', NULL, 'b', ARRAY['cta_fired','action_boost'],
   '2026-03-22T09:00:00Z', 'S20 - 業務フロー可視化', 24, 1, 0, '2026-01-20T10:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-1','tag-8','tag-2']),

  ('u-005', '高橋健太', '高橋運送', '運送業', 35, 58, 'veteran_ai', 'techstars_grad', 'apo',
   '研修後にベテランAI導入を検討中',
   '{"a1":5,"a2":9,"b":10,"c":7,"d":14}', '{"a1":3,"a2":5,"b":6,"c":4,"d":2}', 'a1',
   ARRAY['techstars_grad','action_boost'],
   '2026-03-21T11:30:00Z', 'S14 - 売上管理シート', 15, 2, 1, '2025-12-01T09:00:00Z',
   '2026-01-10T09:00:00Z', '2026-03-10T09:00:00Z', NULL, ARRAY['tag-4','tag-9']),

  ('u-006', '伊藤裕子', 'イトウ会計事務所', '会計', 20, 45, 'veteran_ai', 'prospect', 'x',
   NULL,
   '{"a1":4,"a2":10,"b":11,"c":9,"d":11}', NULL, 'a1', ARRAY['inactive_30d'],
   '2026-02-18T15:00:00Z', 'S08 - 請求フロー確認', 6, 3, 2, '2026-02-01T10:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-3']),

  ('u-007', '渡辺誠', '渡辺飲食グループ', '飲食', 15, 38, 'taskmate', 'prospect', 'instagram',
   NULL,
   '{"a1":8,"a2":7,"b":4,"c":6,"d":13}', NULL, 'b', ARRAY[]::TEXT[],
   '2026-03-19T13:00:00Z', 'S05 - 業務棚卸し', 5, 1, 0, '2026-03-05T14:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-9']),

  ('u-008', '中村拓也', '中村電気工事', '電気工事', 5, 18, 'techstars', 'techstars_active', 'apo',
   '社長本人がスマホしか使えない。社員もIT苦手。',
   '{"a1":3,"a2":3,"b":4,"c":3,"d":2}', NULL, 'd', ARRAY[]::TEXT[],
   '2026-03-15T09:00:00Z', NULL, 1, 4, 3, '2026-03-01T09:00:00Z',
   '2026-03-15T09:00:00Z', NULL, '2026-06-15T09:00:00Z', ARRAY['tag-5','tag-3']),

  ('u-009', '小林真理', '小林美容室チェーン', '美容', 48, 78, 'veteran_ai', 'customer', 'referral',
   '3店舗の売上管理をベテランAIで一元化。補助金申請中。',
   '{"a1":6,"a2":12,"b":14,"c":11,"d":15}', NULL, 'a1', ARRAY['cta_fired'],
   '2026-03-22T08:00:00Z', 'S22 - 売上レポート自動化', 22, 1, 0, '2026-01-05T09:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-1','tag-6','tag-2','tag-7']),

  ('u-010', '加藤健一', '加藤物流', '物流', 31, 52, 'taskmate', 'contacted', 'apo',
   '配車管理を効率化したいが予算感が合わなかった',
   '{"a1":9,"a2":8,"b":5,"c":7,"d":11}', NULL, 'b', ARRAY[]::TEXT[],
   '2026-03-20T16:30:00Z', 'S10 - スケジュール管理', 10, 2, 1, '2026-02-20T11:00:00Z',
   NULL, NULL, NULL, ARRAY['tag-4'])
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- 成約 4件
-- ===================================================================
INSERT INTO deals (id, user_id, exit_type, deal_amount, subsidy_amount, deal_stage, status, started_at, completed_at, note) VALUES
  ('d-001', 'u-005', 'techstars',  150000,  0,       1, 'completed', '2026-01-10T09:00:00Z', '2026-03-10T09:00:00Z', 'TECHSTARS研修3ヶ月コース修了'),
  ('d-002', 'u-009', 'veteran_ai', 5500000, 4400000, 1, 'active',    '2026-03-01T09:00:00Z', NULL,                   'インボイス枠 MAX補助550万。24ヶ月契約。'),
  ('d-003', 'u-004', 'custom_dev', 3000000, 2000000, 1, 'active',    '2026-03-15T09:00:00Z', NULL,                   '物件管理システム受託。通常枠補助金申請中。'),
  ('d-004', 'u-008', 'techstars',  100000,  0,       1, 'active',    '2026-03-15T09:00:00Z', NULL,                   'TECHSTARS研修受講中')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- CTA履歴 5件
-- ===================================================================
INSERT INTO cta_history (id, user_id, trigger, recommended_exit, fired_at, result, message) VALUES
  ('c-001', 'u-001', 'invoice_stumble', 'veteran_ai', '2026-03-18T10:00:00Z', 'clicked',   '請求まわり、まとめて解決できます'),
  ('c-002', 'u-004', 'action_boost',    'custom_dev', '2026-03-12T14:00:00Z', 'converted', '次フェーズは受託開発が最適'),
  ('c-003', 'u-009', 'subsidy_timing',  'veteran_ai', '2026-02-25T09:00:00Z', 'converted', '補助金始まります。ベテランAIが対象'),
  ('c-004', 'u-003', 'it_literacy',     'techstars',  '2026-03-15T11:00:00Z', 'pending',   'まずスタッフさんのスキルアップから'),
  ('c-005', 'u-005', 'action_boost',    'veteran_ai', '2026-03-19T15:00:00Z', 'clicked',   '研修の成果を活かしてベテランAIへ')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- タイムライン (u-001用)
-- ===================================================================
INSERT INTO user_timeline (id, user_id, type, description, metadata, created_at) VALUES
  ('t-001', 'u-001', 'step_completed', 'S11 - 請求書テンプレート作成 完了',            '{"step_id":"S11"}',                               '2026-03-21T14:30:00Z'),
  ('t-002', 'u-001', 'stumble',        'S10 - インボイス設定 でつまずき（how）',         '{"step_id":"S10","type":"how"}',                   '2026-03-20T11:00:00Z'),
  ('t-003', 'u-001', 'cta_fired',      'CTA発火: 請求まわり、まとめて解決できます',      '{"trigger":"invoice_stumble","exit":"veteran_ai"}', '2026-03-18T10:00:00Z'),
  ('t-004', 'u-001', 'step_completed', 'S09 - 経費管理 完了',                          '{"step_id":"S09"}',                               '2026-03-16T15:00:00Z'),
  ('t-005', 'u-001', 'step_completed', 'S08 - 請求フロー確認 完了',                    '{"step_id":"S08"}',                               '2026-03-14T10:00:00Z'),
  ('t-006', 'u-001', 'stumble',        'S07 - メール連携 でつまずき（time）',            '{"step_id":"S07","type":"time"}',                   '2026-03-12T09:00:00Z'),
  ('t-007', 'u-001', 'status_change',  'ステータス変更: prospect → contacted',           '{"from":"prospect","to":"contacted"}',             '2026-03-05T14:00:00Z'),
  ('t-008', 'u-001', 'note_added',     '営業メモ: 次回面談3/25に設定',                   '{}',                                             '2026-03-04T16:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- つまずき記録 (u-001用)
-- ===================================================================
INSERT INTO user_steps (id, user_id, step_id, step_name, status, stumble_type, completed_at, created_at) VALUES
  ('st-001', 'u-001', 'S10', 'インボイス設定', 'in_progress', 'how',  NULL,                   '2026-03-20T11:00:00Z'),
  ('st-002', 'u-001', 'S07', 'メール連携',     'completed',   'time', '2026-03-13T10:00:00Z', '2026-03-12T09:00:00Z'),
  ('st-003', 'u-001', 'S03', 'クラウド保存',   'completed',   'how',  '2026-03-02T10:00:00Z', '2026-02-28T10:00:00Z')
ON CONFLICT (user_id, step_id) DO NOTHING;
