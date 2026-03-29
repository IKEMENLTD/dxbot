// ===== アセスメント共通定数 =====

export const INDUSTRIES = [
  '製造業', '建設業', '卸売業・小売業', '飲食・宿泊業', '医療・福祉',
  '情報通信業', '不動産業', '運輸業', '教育・学習支援', 'サービス業（他に分類されないもの）', 'その他',
] as const;

export const EMPLOYEE_COUNTS = ['1-5名', '6-20名', '21-50名', '51-100名', '101名以上'] as const;
export const ROLES = ['経営者・役員', '管理職', '一般社員', 'IT担当', 'その他'] as const;
export const CHALLENGES = ['売上管理', '顧客管理', '業務効率化', 'データ活用', 'ITツール導入', '人材育成', 'その他'] as const;

// ===== STEP1: 困りごと選択肢 =====
export const PAIN_POINTS = [
  '月末の請求作業に時間がかかる',
  '顧客情報がバラバラに管理されている',
  '同じ作業を何度も手作業でやっている',
  '売上や利益をすぐに把握できない',
  '新しいツールの使い方がわからない',
  '社員がITツールを使ってくれない',
  '何から始めればいいかわからない',
] as const;

// ===== STEP2: 弱軸に応じた深掘り質問 =====
export const AXIS_DEEP_QUESTIONS: Record<string, { question: string; options: readonly string[] }> = {
  a1: {
    question: '請求書はどのように作成していますか？',
    options: ['手書き・紙', 'Excel', '会計ソフト（インストール型）', 'クラウドツール'],
  },
  a2: {
    question: '顧客情報はどこで管理していますか？',
    options: ['紙・名刺ファイル', 'Excel・スプレッドシート', '名刺アプリ', 'CRM・顧客管理ツール'],
  },
  b: {
    question: '最も手間に感じている定型作業は？',
    options: ['経費精算・交通費', '請求・入金管理', '日報・週報作成', '在庫・発注管理'],
  },
  c: {
    question: '売上の確認はどのくらいの頻度でしていますか？',
    options: ['月末のみ', '週に1回程度', '毎日確認', 'ほとんど見ていない'],
  },
  d: {
    question: '社内で最もよく使われているITツールは？',
    options: ['LINE・電話のみ', 'メール・Excel', 'Googleツール', '業務用クラウドツール'],
  },
};

// ===== STEP3: 導入意向 =====
export const BUDGET_OPTIONS = [
  'まずは無料で試したい',
  '月1万円くらいまで',
  '月5万円くらいまで',
  '月5万円以上もOK',
] as const;

export const DECISION_OPTIONS = [
  '自分で決められる',
  '上司・パートナーの承認が必要',
  'まだ検討段階',
] as const;
