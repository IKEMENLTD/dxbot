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
      percent: Math.min((currentMonthConverted / targetConverted) * 100, 100),
    },
    {
      label: "月間売上",
      current: currentMonthRevenue,
      target: targetRevenue,
      display: `${formatCurrency(currentMonthRevenue)} / ${formatCurrency(targetRevenue)}`,
      percent: Math.min((currentMonthRevenue / targetRevenue) * 100, 100),
    },
  ];

  return (
    <div className="space-y-5">
      {goals.map((goal) => (
        <div key={goal.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
          <div>
            <p className="text-sm text-gray-600">{goal.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{goal.percent.toFixed(0)}% 達成</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">{goal.display}</p>
        </div>
      ))}
    </div>
  );
}
