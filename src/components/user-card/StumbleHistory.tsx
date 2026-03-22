"use client";

import type { StumbleRecord, User } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface StumbleHistoryProps {
  stumbles: StumbleRecord[];
  user: User;
}

const STUMBLE_TYPE_LABEL: Record<string, string> = {
  how: "やり方",
  motivation: "モチベ",
  time: "時間",
};

const STUMBLE_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  how: { bg: "bg-orange-50", text: "text-orange-700" },
  motivation: { bg: "bg-orange-50", text: "text-orange-600" },
  time: { bg: "bg-green-50", text: "text-green-700" },
};

export default function StumbleHistory({ stumbles, user }: StumbleHistoryProps) {
  const howCount = stumbles.filter((s) => s.stumble_type === "how").length;
  const totalCount = stumbles.length;
  const howRatio = totalCount > 0 ? howCount / totalCount : 0;
  const isHowDominant = howRatio >= 0.5 && howCount >= 2;

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        つまずき履歴
      </h3>

      {isHowDominant && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700">
          <svg className="inline-block w-4 h-4 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 9v4m0 4h.01M12 2L2 22h20L12 2z" />
          </svg>
          TECHSTARS推奨根拠: how系つまずき {howCount}/{totalCount} ({Math.round(howRatio * 100)}%)
        </div>
      )}

      {stumbles.length === 0 ? (
        <p className="text-sm text-gray-400">つまずき記録なし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="text-left py-2.5 px-3 rounded-l-lg">ステップ</th>
                <th className="text-left py-2.5 px-3">タイプ</th>
                <th className="text-left py-2.5 px-3 rounded-r-lg">日時</th>
              </tr>
            </thead>
            <tbody>
              {stumbles.map((s) => {
                const style = STUMBLE_TYPE_STYLE[s.stumble_type] ?? { bg: "bg-gray-50", text: "text-gray-600" };
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3 text-gray-700 text-xs">
                      {s.step_id} - {s.step_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        {STUMBLE_TYPE_LABEL[s.stumble_type]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">
                      {formatDateTime(s.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary row */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span>合計: {totalCount}</span>
        <span className="text-orange-600 font-medium">how: {user.stumble_how_count}</span>
        <span>全体stumble: {user.stumble_count}</span>
      </div>
    </section>
  );
}
