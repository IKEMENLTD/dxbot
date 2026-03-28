"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface GoalProgressProps {
  currentMonthConverted: number;
  currentMonthRevenue: number;
  targetConverted: number;
  targetRevenue: number;
  month?: string;
  onGoalUpdate?: (targetConverted: number, targetRevenue: number) => void;
}

type EditField = "converted" | "revenue" | null;

export default function GoalProgress({
  currentMonthConverted,
  currentMonthRevenue,
  targetConverted,
  targetRevenue,
  month,
  onGoalUpdate,
}: GoalProgressProps) {
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  const handleEdit = useCallback((field: EditField, currentValue: number) => {
    setEditField(field);
    setEditValue(String(currentValue));
  }, []);

  const handleCancel = useCallback(() => {
    setEditField(null);
    setEditValue("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editField) return;

    const numericValue = parseInt(editValue, 10);
    if (isNaN(numericValue) || numericValue < 0) return;

    const newConverted = editField === "converted" ? numericValue : targetConverted;
    const newRevenue = editField === "revenue" ? numericValue : targetRevenue;

    setSaving(true);
    const controller = new AbortController();

    try {
      const currentMonth = month || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();

      const res = await fetch("/api/monthly-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          month: currentMonth,
          targetConverted: newConverted,
          targetRevenue: newRevenue,
        }),
      });

      if (res.ok) {
        onGoalUpdate?.(newConverted, newRevenue);
        setEditField(null);
        setEditValue("");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[GoalProgress] 保存エラー:", err);
    } finally {
      setSaving(false);
    }
  }, [editField, editValue, targetConverted, targetRevenue, month, onGoalUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        void handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const goals = [
    {
      key: "converted" as const,
      label: "月間成約数",
      current: currentMonthConverted,
      target: targetConverted,
      display: `${currentMonthConverted} / ${targetConverted}件`,
      rawPercent:
        targetConverted > 0
          ? (currentMonthConverted / targetConverted) * 100
          : 0,
    },
    {
      key: "revenue" as const,
      label: "月間売上",
      current: currentMonthRevenue,
      target: targetRevenue,
      display: `${formatCurrency(currentMonthRevenue)} / ${formatCurrency(targetRevenue)}`,
      rawPercent:
        targetRevenue > 0
          ? (currentMonthRevenue / targetRevenue) * 100
          : 0,
    },
  ];

  return (
    <div className="space-y-5">
      {goals.map((goal) => {
        const achieved = goal.rawPercent >= 100;
        const barPercent = Math.min(goal.rawPercent, 100);
        const isEditing = editField === goal.key;

        return (
          <div
            key={goal.label}
            className="py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm text-gray-600">{goal.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {goal.rawPercent.toFixed(0)}% 達成
                  {achieved && (
                    <span className="ml-2 text-green-600 font-semibold">
                      達成!
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={saving}
                      className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                    {/* Save button (checkmark SVG) */}
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
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
                    {/* Cancel button (x SVG) */}
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                  <>
                    <p className="text-lg font-semibold text-gray-900">
                      {goal.display}
                    </p>
                    {/* Edit button (pen SVG) */}
                    <button
                      type="button"
                      onClick={() => handleEdit(goal.key, goal.target)}
                      className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                      aria-label={`${goal.label}の目標を編集`}
                    >
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
                  </>
                )}
              </div>
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
