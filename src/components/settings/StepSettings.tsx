"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import type { AxisScores } from "@/lib/types";

// ===== 型定義（step-master.tsのStepDefinitionと同一構造） =====

interface StepDefinition {
  id: string;
  name: string;
  description: string;
  axis: keyof AxisScores;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
}

// ===== 定数 =====

const FETCH_TIMEOUT_MS = 20_000;
const SAVE_TIMEOUT_MS = 30_000;

const AXIS_LABELS: Record<keyof AxisScores, string> = {
  a1: "A1: 売上・請求管理",
  a2: "A2: 連絡・記録管理",
  b: "B: 繰り返し作業",
  c: "C: データ経営",
  d: "D: ツール習熟",
};

const AXIS_ORDER: (keyof AxisScores)[] = ["a1", "a2", "b", "c", "d"];

const DIFFICULTY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "1 (易)" },
  { value: 2, label: "2 (中)" },
  { value: 3, label: "3 (難)" },
];

// ===== ヘルパー =====

function groupByAxis(steps: StepDefinition[]): Record<keyof AxisScores, StepDefinition[]> {
  const result: Record<keyof AxisScores, StepDefinition[]> = {
    a1: [],
    a2: [],
    b: [],
    c: [],
    d: [],
  };
  for (const step of steps) {
    if (result[step.axis]) {
      result[step.axis].push(step);
    }
  }
  return result;
}

// ===== コンポーネント =====

export default function StepSettings() {
  const { addToast } = useToast();

  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ----- 初期ロード -----
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch("/api/settings/app?key=steps", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: StepDefinition[] | null }>;
      })
      .then(async (json) => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setSteps(json.data);
        } else {
          // DBになければstep-masterのデフォルトをdynamic importで読み込み
          const mod = await import("@/lib/step-master");
          setSteps(mod.getAllSteps());
        }
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          console.error("[StepSettings] 読み込みエラー:", err);
          addToast("error", "ステップ設定の読み込みに失敗しました");
        }
        // エラー時もデフォルトをフォールバック
        import("@/lib/step-master").then((mod) => {
          setSteps(mod.getAllSteps());
        }).catch(() => {
          // フォールバックも失敗した場合は空
        });
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [addToast]);

  // ----- フィールド変更 -----
  const updateStep = useCallback(
    (stepId: string, field: keyof StepDefinition, value: string | number) => {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.id !== stepId) return s;
          if (field === "name") return { ...s, name: value as string };
          if (field === "description") return { ...s, description: value as string };
          if (field === "difficulty") return { ...s, difficulty: value as 1 | 2 | 3 };
          if (field === "estimatedMinutes") return { ...s, estimatedMinutes: value as number };
          return s;
        })
      );
      setHasChanges(true);
    },
    []
  );

  // ----- 一括保存 -----
  const handleSave = useCallback(async () => {
    if (saving) return;

    // バリデーション: 空名チェック
    const emptyNameSteps = steps.filter((s) => s.name.trim() === "");
    if (emptyNameSteps.length > 0) {
      const ids = emptyNameSteps.map((s) => s.id).join(", ");
      addToast("error", `ステップ名が空です: ${ids}`);
      return;
    }

    setSaving(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "steps", value: steps }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "不明なエラー" })) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setHasChanges(false);
      addToast("success", "ステップ設定を保存しました");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        addToast("error", "保存がタイムアウトしました。再試行してください。");
      } else {
        const msg = err instanceof Error ? err.message : "保存に失敗しました";
        addToast("error", `ステップ設定の保存に失敗しました: ${msg}`);
      }
    } finally {
      clearTimeout(timer);
      setSaving(false);
    }
  }, [saving, steps, addToast]);

  // ----- デフォルトに戻す -----
  const handleResetToDefault = useCallback(async () => {
    if (!window.confirm("全ステップをデフォルト値に戻しますか？ 変更内容は失われます。")) {
      return;
    }
    try {
      const mod = await import("@/lib/step-master");
      setSteps(mod.getAllSteps());
      setHasChanges(true);
      addToast("info", "デフォルト値に戻しました。保存ボタンで反映してください。");
    } catch {
      addToast("error", "デフォルト値の読み込みに失敗しました");
    }
  }, [addToast]);

  // ----- ローディング表示 -----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const grouped = groupByAxis(steps);

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">
            ステップ管理（全{steps.length}件）
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            各ステップの名前・説明・難易度・所要時間を編集できます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            デフォルトに戻す
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                保存中...
              </>
            ) : (
              "一括保存"
            )}
          </button>
        </div>
      </div>

      {/* 変更通知 */}
      {hasChanges && (
        <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
          未保存の変更があります
        </div>
      )}

      {/* 軸ごとのグループテーブル */}
      <div className="space-y-6">
        {AXIS_ORDER.map((axis) => {
          const axisSteps = grouped[axis];
          if (axisSteps.length === 0) return null;

          return (
            <div key={axis}>
              <h3 className="text-xs font-medium text-gray-600 mb-2 px-1">
                {AXIS_LABELS[axis]}
              </h3>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-16">ID</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-40">名前</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500">説明</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-24">難易度</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 w-24">所要時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {axisSteps.map((step) => (
                      <StepRow
                        key={step.id}
                        step={step}
                        onUpdate={updateStep}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== 行コンポーネント =====

interface StepRowProps {
  step: StepDefinition;
  onUpdate: (stepId: string, field: keyof StepDefinition, value: string | number) => void;
}

function StepRow({ step, onUpdate }: StepRowProps) {
  return (
    <tr className="border-b border-gray-100">
      {/* ID（変更不可） */}
      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{step.id}</td>

      {/* 名前（インライン編集） */}
      <td className="px-3 py-2.5">
        <input
          type="text"
          value={step.name}
          onChange={(e) => onUpdate(step.id, "name", e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
        />
      </td>

      {/* 説明（インライン編集） */}
      <td className="px-3 py-2.5">
        <input
          type="text"
          value={step.description}
          onChange={(e) => onUpdate(step.id, "description", e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
        />
      </td>

      {/* 難易度（セレクト） */}
      <td className="px-3 py-2.5">
        <select
          value={step.difficulty}
          onChange={(e) => onUpdate(step.id, "difficulty", Number(e.target.value) as 1 | 2 | 3)}
          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
        >
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      {/* 所要時間（数値入力） */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={999}
            value={step.estimatedMinutes}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= 999) {
                onUpdate(step.id, "estimatedMinutes", val);
              }
            }}
            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 text-right focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
          />
          <span className="text-xs text-gray-400">分</span>
        </div>
      </td>
    </tr>
  );
}
