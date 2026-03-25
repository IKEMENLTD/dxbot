"use client";

import { formatCurrency } from "@/lib/utils";

interface GoalProgressProps {
  currentMonthConverted: number;
  currentMonthRevenue: number;
  targetConverted?: number;
  targetRevenue?: number;
}

export default function GoalProgress({
  currentMonthConverted,
  currentMonthRevenue,
  targetConverted = 3,
  targetRevenue = 5000000,
}: GoalProgressProps) {
  const goals = [
    {
      label: "月間成約数",
      current: currentMonthConverted,
      target: targetConverted,
      display: `${currentMonthConverted} / ${targetConverted}件`,
      rawPercent: targetConverted > 0 ? (currentMonthConverted / targetConverted) * 100 : 0,
    },
    {
      label: "月間売上",
      current: currentMonthRevenue,
      target: targetRevenue,
      display: `${formatCurrency(currentMonthRevenue)} / ${formatCurrency(targetRevenue)}`,
      rawPercent: targetRevenue > 0 ? (currentMonthRevenue / targetRevenue) * 100 : 0,
    },
  ];

  return (
    <div className="space-y-5">
      {goals.map((goal) => {
        const achieved = goal.rawPercent >= 100;
        const barPercent = Math.min(goal.rawPercent, 100);

        return (
          <div key={goal.label} className="py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm text-gray-600">{goal.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {goal.rawPercent.toFixed(0)}% 達成
                  {achieved && (
                    <span className="ml-2 text-green-600 font-semibold">達成!</span>
                  )}
                </p>
              </div>
              <p className="text-lg font-semibold text-gray-900">{goal.display}</p>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  achieved ? "bg-green-500" : "bg-green-400"
                }`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
