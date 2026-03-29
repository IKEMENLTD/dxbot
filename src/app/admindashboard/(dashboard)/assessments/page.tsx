'use client';

import { useState, useEffect, useCallback } from 'react';

interface AxisScores {
  a1: number;
  a2: number;
  b: number;
  c: number;
  d: number;
}

interface CompanyInfo {
  employeeCount: string;
  role: string;
  challenges: string[];
  email: string;
}

interface AssessmentResponse {
  id: string;
  created_at: string;
  name: string;
  company_name: string;
  industry: string;
  exact_level: number;
  level_band: string;
  precision_score: number;
  axis_scores: AxisScores;
  line_user_id: string | null;
  company_info: CompanyInfo | null;
}

interface ApiResponse {
  data: AssessmentResponse[];
  total: number;
}

const BAND_LABELS: Record<string, string> = {
  lv_01_10: 'Lv.1-10',
  lv_11_20: 'Lv.11-20',
  lv_21_30: 'Lv.21-30',
  lv_31_40: 'Lv.31-40',
  lv_41_50: 'Lv.41-50',
};

const BAND_COLORS: Record<string, string> = {
  lv_01_10: '#6b7280',
  lv_11_20: '#3b82f6',
  lv_21_30: '#10b981',
  lv_31_40: '#f59e0b',
  lv_41_50: '#8b5cf6',
};

export default function AssessmentsPage() {
  const [rows, setRows] = useState<AssessmentResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((signal: AbortSignal) => {
    setLoading(true);
    fetch('/api/assessment/list', { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((json) => {
        setRows(json.data ?? []);
        setTotal(json.total ?? 0);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[Assessments] データ取得エラー:', err);
        setError('データの取得に失敗しました');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">DXレベル診断 回答一覧</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">全 {total} 件</p>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/assessment"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            診断フォームを開く
          </a>
          <a
            href="/api/assessment/export"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            CSV出力
          </a>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full" />
        </div>
      )}

      {/* エラー */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* テーブル */}
      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">診断日時</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">氏名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">会社名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">業種</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">従業員数</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">役職</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">DXレベル</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">バンド</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">スコア</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">軸別スコア</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">LINE連携</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-gray-400 py-12">
                      診断回答がまだありません
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap max-w-[160px] truncate">
                        {row.company_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {row.industry}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {row.company_info?.employeeCount ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {row.company_info?.role ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-2xl font-bold text-gray-900">{row.exact_level}</span>
                        <span className="text-xs text-gray-400"> /50</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                          style={{ background: BAND_COLORS[row.level_band] ?? '#6b7280' }}
                        >
                          {BAND_LABELS[row.level_band] ?? row.level_band}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 font-mono">
                        {row.precision_score}
                        <span className="text-gray-400 text-xs"> /150</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-xs text-gray-500 whitespace-nowrap">
                          <span title="売上管理">A1:{row.axis_scores?.a1 ?? '-'}</span>
                          <span title="連絡管理">A2:{row.axis_scores?.a2 ?? '-'}</span>
                          <span title="自動化">B:{row.axis_scores?.b ?? '-'}</span>
                          <span title="データ経営">C:{row.axis_scores?.c ?? '-'}</span>
                          <span title="ITツール">D:{row.axis_scores?.d ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.line_user_id ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 8L6.5 11.5L13 5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
