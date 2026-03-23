# ホスティング構成メモ

## 現在: Netlify × Supabase
- デプロイ: GitHub (IKEMENLTD/dxbot) → Netlify 自動デプロイ
- URL: https://dxbot.netlify.app
- Cron: 外部サービス（cron-job.org等）で GET /api/cron/reminders を毎日 JST 10:00 に実行
- 設定ファイル: netlify.toml

## 移行候補: Render × Supabase
- メリット: Cron内蔵、Next.jsネイティブ動作（プラグイン不要）、middleware問題なし
- 移行時の変更点:
  1. render.yaml 作成（netlify.toml の代替）
  2. Render Dashboard で Web Service 作成（Node.js, Build: npm run build, Start: npm start）
  3. 環境変数を移行（SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, CRON_SECRET, LINE_*）
  4. Render Cron Job 作成（/api/cron/reminders, 0 1 * * *）
  5. DNS/ドメイン切り替え
  6. netlify.toml 削除、@netlify/plugin-nextjs 削除
- 移行判断基準: Netlifyで互換性問題が2件以上発生したら切り替え
