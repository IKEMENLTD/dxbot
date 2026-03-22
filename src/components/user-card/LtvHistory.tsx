"use client";

import type { Deal } from "@/lib/types";
import { EXIT_CONFIG } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LtvHistoryProps {
  deals: Deal[];
}

const DEAL_STATUS_LABEL: Record<string, string> = {
  active: "進行中",
  completed: "完了",
  cancelled: "キャンセル",
};

const DEAL_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-50", text: "text-green-600" },
  completed: { bg: "bg-gray-100", text: "text-gray-700" },
  cancelled: { bg: "bg-orange-50", text: "text-orange-600" },
};

export default function LtvHistory({ deals }: LtvHistoryProps) {
  const totalLtv = deals
    .filter((d) => d.status !== "cancelled")
    .reduce((sum, d) => sum + d.deal_amount, 0);

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          成約 / LTV
        </h3>
        <span className="text-3xl font-bold text-gray-900">
          {formatCurrency(totalLtv)}
        </span>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">成約履歴はまだありません</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const exitConfig = EXIT_CONFIG[deal.exit_type];
            return (
              <div
                key={deal.id}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${exitConfig.bgClass} ${exitConfig.colorClass}`}
                    >
                      {exitConfig.label}
                    </span>
                    {(() => {
                      const statusStyle = DEAL_STATUS_STYLE[deal.status] ?? { bg: "bg-gray-50", text: "text-gray-500" };
                      return (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {DEAL_STATUS_LABEL[deal.status]}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-base font-semibold text-gray-900">
                      {formatCurrency(deal.deal_amount)}
                    </span>
                    {deal.subsidy_amount > 0 && (
                      <span className="text-xs text-gray-500">
                        (補助金: {formatCurrency(deal.subsidy_amount)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                    <span>Stage {deal.deal_stage}</span>
                    <span>{formatDateTime(deal.started_at)}</span>
                    {deal.completed_at && (
                      <span className="text-gray-900">
                        完了: {formatDateTime(deal.completed_at)}
                      </span>
                    )}
                  </div>

                  {deal.note && (
                    <p className="text-xs text-gray-500 mt-2">{deal.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
