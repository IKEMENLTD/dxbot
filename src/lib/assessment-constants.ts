// ===== アセスメント共通定数 =====

export const INDUSTRIES = [
  '製造業', '建設業', '卸売業・小売業', '飲食・宿泊業', '医療・福祉',
  '情報通信業', '不動産業', '運輸業', '教育・学習支援', 'サービス業（他に分類されないもの）', 'その他',
] as const;

export const EMPLOYEE_COUNTS = ['1-5名', '6-20名', '21-50名', '51-100名', '101名以上'] as const;
export const ROLES = ['経営者・役員', '管理職', '一般社員', 'IT担当', 'その他'] as const;
export const CHALLENGES = ['売上管理', '顧客管理', '業務効率化', 'データ活用', 'ITツール導入', '人材育成', 'その他'] as const;
