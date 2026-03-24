"use client";

import type { Deal, User } from "@/lib/types";
import { EXIT_CONFIG } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface LtvTrackerProps {
  users: User[];
  deals: Deal[];
}

export default function LtvTracker({ users, deals }: LtvTrackerProps) {
  const techstarsGrads = users.filter(
    (u) => u.techstars_completed_at !== null
  );

  const gradUserIds = new Set(techstarsGrads.map((u) => u.id));
  const gradDeals = deals.filter((d) => gradUserIds.has(d.user_id));
  const totalLtv = gradDeals.reduce((sum, d) => sum + d.deal_amount, 0);

  const gradFlows = techstarsGrads.map((user) => {
    const userDeals = deals
      .filter((d) => d.user_id === user.id)
      .sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
    return { user, deals: userDeals };
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          研修から始まった顧客のLTV合計
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {formatCurrency(totalLtv)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          TECHSTARS修了者 {techstarsGrads.length}名
        </p>
      </div>

      {gradFlows.map(({ user, deals: userDeals }) => (
        <div key={user.id} className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-900 font-medium mb-2">
            {user.preferred_name}
            <span className="text-xs text-gray-400 ml-2">{user.company_name}</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {userDeals.map((deal, index) => {
              const config = EXIT_CONFIG[deal.exit_type] ?? { label: deal.exit_type ?? '未設定', color: '#6b7280', colorClass: 'text-gray-500', bgClass: 'bg-gray-100' };
              return (
                <div key={deal.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-gray-300 text-xs">→</span>
                  )}
                  <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-500">{config.label}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(deal.deal_amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
