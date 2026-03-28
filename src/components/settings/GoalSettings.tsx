"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { formatCurrency } from "@/lib/utils";

interface MonthlyGoal {
  month: string;
  targetConverted: number;
  targetRevenue: number;
}

interface MonthlyGoalApiResponse {
  data?: {
    month: string;
    targetConverted: number;
    targetRevenue: number;
  };
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

function formatMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

export default function GoalSettings() {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editConverted, setEditConverted] = useState("");
  const [editRevenue, setEditRevenue] = useState("");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const convertedInputRef = useRef<HTMLInputElement>(null);

  // Fetch goals for recent 6 months
  const fetchGoals = useCallback(async () => {
    const controller = new AbortController();
    const months = getRecentMonths(6);

    try {
      const results = await Promise.all(
        months.map((month) =>
          fetch(`/api/monthly-goals?month=${month}`, {
            signal: controller.signal,
          })
            .then((res) =>
              res.ok
                ? (res.json() as Promise<MonthlyGoalApiResponse>)
                : null
            )
            .catch(() => null)
        )
      );

      const loadedGoals: MonthlyGoal[] = months.map((month, i) => {
        const data = results[i]?.data;
        return {
          month,
          targetConverted: data?.targetConverted ?? 3,
          targetRevenue: data?.targetRevenue ?? 5000000,
        };
      });

      setGoals(loadedGoals);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[GoalSettings] 取得エラー:", err);
      addToast("error", "月間目標の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (editingMonth && convertedInputRef.current) {
      convertedInputRef.current.focus();
    }
  }, [editingMonth]);

  const handleEdit = useCallback((goal: MonthlyGoal) => {
    setEditingMonth(goal.month);
    setEditConverted(String(goal.targetConverted));
    setEditRevenue(String(goal.targetRevenue));
  }, []);

  const handleCancel = useCallback(() => {
    setEditingMonth(null);
    setEditConverted("");
    setEditRevenue("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingMonth) return;

    const converted = parseInt(editConverted, 10);
    const revenue = parseInt(editRevenue, 10);

    if (isNaN(converted) || isNaN(revenue) || converted < 0 || revenue < 0) {
      addToast("error", "0以上の整数を入力してください。");
      return;
    }

    setSaving(true);
    const controller = new AbortController();

    try {
      const res = await fetch("/api/monthly-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          month: editingMonth,
          targetConverted: converted,
          targetRevenue: revenue,
        }),
      });

      if (!res.ok) {
        addToast("error", "保存に失敗しました。");
        return;
      }

      setGoals((prev) =>
        prev.map((g) =>
          g.month === editingMonth
            ? { ...g, targetConverted: converted, targetRevenue: revenue }
            : g
        )
      );
      setEditingMonth(null);
      setEditConverted("");
      setEditRevenue("");
      addToast("success", `${formatMonth(editingMonth)}の目標を保存しました。`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[GoalSettings] 保存エラー:", err);
      addToast("error", "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMonth, editConverted, editRevenue]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                月
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                成約目標
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                売上目標
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => {
              const isEditing = editingMonth === goal.month;
              const isCurrent =
                goal.month === getRecentMonths(1)[0];

              return (
                <tr
                  key={goal.month}
                  className={`border-b border-gray-100 last:border-0 ${
                    isCurrent ? "bg-green-50/50" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className="text-gray-900 font-medium">
                      {formatMonth(goal.month)}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 text-xs text-green-600 font-semibold">
                        当月
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <input
                        ref={convertedInputRef}
                        type="number"
                        min="0"
                        value={editConverted}
                        onChange={(e) => setEditConverted(e.target.value)}
                        disabled={saving}
                        className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                    ) : (
                      <span className="text-gray-900">
                        {goal.targetConverted}件
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editRevenue}
                        onChange={(e) => setEditRevenue(e.target.value)}
                        disabled={saving}
                        className="w-32 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                    ) : (
                      <span className="text-gray-900">
                        {formatCurrency(goal.targetRevenue)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        {/* Save button */}
                        <button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-50"
                          aria-label="保存"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M3 8L6.5 11.5L13 4.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {/* Cancel button */}
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={saving}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          aria-label="キャンセル"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 4L12 12M12 4L4 12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEdit(goal)}
                        className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
                        aria-label={`${formatMonth(goal.month)}の目標を編集`}
                      >
                        {/* Pen icon */}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
