"use client";

import { useState, useEffect, useCallback } from "react";
import type { DiagnosisConfig, DiagnosisAxis } from "@/lib/types";
import { PRECISION_QUESTIONS } from "@/lib/precision-interview";
import type { PrecisionQuestion } from "@/lib/precision-interview";
import { useToast } from "@/contexts/ToastContext";

/** デフォルト診断設定 */
const DEFAULT_DIAGNOSIS_CONFIG: DiagnosisConfig = {
  bandThresholds: [24, 44, 64],
  bandLabels: ["DX未着手", "部分的にDX", "DX進行中", "DX成熟"],
  questions: [
    { axis: "industry", question: "御社の業種を教えてください" },
    { axis: "a1", question: "売上管理・請求管理はどの程度できていますか？" },
    { axis: "a2", question: "顧客との連絡・記録管理はどうですか？" },
    { axis: "b", question: "繰り返し作業の自動化はどの程度ですか？" },
    { axis: "c", question: "データに基づく経営判断をしていますか？" },
    { axis: "d", question: "ITツールの活用度はどうですか？" },
  ],
  industries: ["建設", "製造", "飲食", "小売", "サービス", "その他"],
  scoreMultiplier: 3,
};

/** 軸ラベル（LINE bot用6問） */
const AXIS_LABELS: Record<DiagnosisAxis, string> = {
  industry: "業種",
  a1: "売上・請求管理",
  a2: "連絡・記録管理",
  b: "繰り返し作業の自動化",
  c: "データ経営",
  d: "ITツール活用",
};

/** 精密ヒアリング軸ラベル */
const PREC_AXIS_LABELS: Record<string, string> = {
  a1: "A1: 売上・請求管理（6問）",
  a2: "A2: 連絡・記録管理（6問）",
  b: "B: 繰り返し作業の自動化（6問）",
  c: "C: データ経営（6問）",
  d: "D: ITツール活用（6問）",
};

/** フェッチタイムアウト(ms) */
const FETCH_TIMEOUT_MS = 20000;

export default function DiagnosisSettings() {
  const [config, setConfig] = useState<DiagnosisConfig>(DEFAULT_DIAGNOSIS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIndustry, setNewIndustry] = useState("");
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const { addToast } = useToast();

  // 精密ヒアリング設問 state
  const [precisionQuestions, setPrecisionQuestions] = useState<PrecisionQuestion[]>(PRECISION_QUESTIONS);
  const [savingPrecision, setSavingPrecision] = useState(false);
  const [precisionLoading, setPrecisionLoading] = useState(true);

  const checkThresholds = useCallback((thresholds: [number, number, number]) => {
    if (thresholds[0] >= thresholds[1]) {
      setThresholdError('Band1上限はBand2上限より小さくしてください');
      return;
    }
    if (thresholds[1] >= thresholds[2]) {
      setThresholdError('Band2上限はBand3上限より小さくしてください');
      return;
    }
    setThresholdError(null);
  }, []);

  // 初期ロード: diagnosis_config
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch("/api/settings/app?key=diagnosis_config", { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { data: DiagnosisConfig | null }) => {
        if (json.data) {
          setConfig({ ...DEFAULT_DIAGNOSIS_CONFIG, ...json.data });
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn("[DiagnosisSettings] 読み込みタイムアウト");
        } else {
          console.error("[DiagnosisSettings] 読み込みエラー:", err);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // 初期ロード: precision_questions
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch("/api/settings/app?key=precision_questions", { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { data: PrecisionQuestion[] | null }) => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setPrecisionQuestions(json.data);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn("[DiagnosisSettings] 精密設問読み込みタイムアウト");
        } else {
          console.error("[DiagnosisSettings] 精密設問読み込みエラー:", err);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setPrecisionLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // 保存: diagnosis_config
  const handleSave = async () => {
    const [b1, b2, b3] = config.bandThresholds;
    if (b1 >= b2 || b2 >= b3) {
      addToast("error", "バンド閾値は昇順で設定してください（Band1 < Band2 < Band3）");
      return;
    }
    if (config.scoreMultiplier < 1) {
      addToast("error", "スコア倍率は1以上を設定してください");
      return;
    }

    setSaving(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "diagnosis_config", value: config }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "保存に失敗しました" }));
        const errMsg = typeof errBody.error === "string" ? errBody.error : "保存に失敗しました";
        addToast("error", errMsg);
        return;
      }

      addToast("success", "診断設定を保存しました");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        addToast("error", "保存がタイムアウトしました");
      } else {
        addToast("error", "保存中にエラーが発生しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  };

  // 保存: precision_questions
  const handleSavePrecision = async () => {
    // バリデーション: 空の設問がないか
    const hasEmpty = precisionQuestions.some((q) => !q.question.trim());
    if (hasEmpty) {
      addToast("error", "空の設問テキストがあります。すべての設問を入力してください。");
      return;
    }

    setSavingPrecision(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "precision_questions", value: precisionQuestions }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "保存に失敗しました" }));
        const errMsg = typeof errBody.error === "string" ? errBody.error : "保存に失敗しました";
        addToast("error", errMsg);
        return;
      }

      addToast("success", "精密ヒアリング設問を保存しました");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        addToast("error", "保存がタイムアウトしました");
      } else {
        addToast("error", "保存中にエラーが発生しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setSavingPrecision(false);
    }
  };

  // デフォルトに戻す
  const handleReset = () => {
    if (!window.confirm("診断設定をデフォルトに戻しますか？")) return;
    setConfig(DEFAULT_DIAGNOSIS_CONFIG);
  };

  // 精密ヒアリング設問をデフォルトに戻す
  const handleResetPrecision = () => {
    if (!window.confirm("精密ヒアリング設問をデフォルトに戻しますか？")) return;
    setPrecisionQuestions(PRECISION_QUESTIONS);
  };

  // バンド閾値変更
  const handleThresholdChange = (index: 0 | 1 | 2, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setConfig((prev) => {
      const newThresholds: [number, number, number] = [...prev.bandThresholds];
      newThresholds[index] = num;
      checkThresholds(newThresholds);
      return { ...prev, bandThresholds: newThresholds };
    });
  };

  // バンドラベル変更
  const handleBandLabelChange = (index: 0 | 1 | 2 | 3, value: string) => {
    setConfig((prev) => {
      const newLabels: [string, string, string, string] = [...prev.bandLabels];
      newLabels[index] = value;
      return { ...prev, bandLabels: newLabels };
    });
  };

  // 質問テキスト変更
  const handleQuestionChange = (index: number, value: string) => {
    setConfig((prev) => {
      const newQuestions = prev.questions.map((q, i) =>
        i === index ? { ...q, question: value } : q
      );
      return { ...prev, questions: newQuestions };
    });
  };

  // スコア倍率変更
  const handleMultiplierChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setConfig((prev) => ({ ...prev, scoreMultiplier: num }));
  };

  // 業種追加
  const handleAddIndustry = () => {
    const trimmed = newIndustry.trim();
    if (!trimmed) return;
    if (config.industries.includes(trimmed)) {
      addToast("error", "既に存在する業種です");
      return;
    }
    setConfig((prev) => ({ ...prev, industries: [...prev.industries, trimmed] }));
    setNewIndustry("");
  };

  // 業種削除
  const handleRemoveIndustry = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      industries: prev.industries.filter((_, i) => i !== index),
    }));
  };

  // 業種テキスト変更
  const handleIndustryChange = (index: number, value: string) => {
    setConfig((prev) => ({
      ...prev,
      industries: prev.industries.map((ind, i) => (i === index ? value : ind)),
    }));
  };

  // 精密ヒアリング設問テキスト変更
  const handlePrecisionQuestionChange = (questionIndex: number, value: string) => {
    setPrecisionQuestions((prev) =>
      prev.map((q) =>
        q.index === questionIndex ? { ...q, question: value } : q
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* バンド閾値設定 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">バンド閾値設定</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([0, 1, 2] as const).map((idx) => (
              <div key={idx}>
                <label className="block text-xs text-gray-500 mb-1">
                  Band{idx + 1}上限 ({config.bandLabels[idx]})
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.bandThresholds[idx]}
                  onChange={(e) => handleThresholdChange(idx, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            合計スコアがBand1上限以下ならBand1、Band2上限以下ならBand2...となります。Band3上限超えはBand4（{config.bandLabels[3]}）です。
          </p>
          {thresholdError && (
            <p className="mt-2 text-xs text-red-600">{thresholdError}</p>
          )}
        </div>
      </div>

      {/* バンドラベル設定 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">バンドラベル</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([0, 1, 2, 3] as const).map((idx) => (
              <div key={idx}>
                <label className="block text-xs text-gray-500 mb-1">Band{idx + 1}</label>
                <input
                  type="text"
                  value={config.bandLabels[idx]}
                  onChange={(e) => handleBandLabelChange(idx, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 質問テキスト設定 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">診断質問（6問）</h3>
        <div className="space-y-3">
          {config.questions.map((q, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                <span className="text-xs text-gray-400">軸: {AXIS_LABELS[q.axis]}</span>
              </div>
              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(idx, e.target.value)}
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* スコア倍率 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">スコア倍率</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">回答値 x</label>
            <input
              type="number"
              min={1}
              value={config.scoreMultiplier}
              onChange={(e) => handleMultiplierChange(e.target.value)}
              className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
            <span className="text-xs text-gray-400">= 各軸スコア（デフォルト: 3）</span>
          </div>
        </div>
      </div>

      {/* 業種リスト */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">業種リスト</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="space-y-2 mb-3">
            {config.industries.map((ind, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ind}
                  onChange={(e) => handleIndustryChange(idx, e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveIndustry(idx)}
                  className="text-gray-400 hover:text-orange-600 transition-colors text-xs px-2 py-1"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddIndustry(); }}
              placeholder="新しい業種を入力"
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
            <button
              type="button"
              onClick={handleAddIndustry}
              disabled={!newIndustry.trim()}
              className="bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      </div>

      {/* ボタン群（診断設定） */}
      <div className="flex items-center gap-3 mb-10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !!thresholdError}
          className="bg-green-600 text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="bg-white text-gray-500 text-sm font-medium px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
        >
          デフォルトに戻す
        </button>
      </div>

      {/* ========== 精密ヒアリング設問（30問） ========== */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          精密ヒアリング設問（Webフォーム用）
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          /assessment ページで使用される30問の設問テキストを編集できます。軸の割り当ては変更できません。
        </p>

        {precisionLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-xs text-gray-500">設問を読み込み中...</span>
          </div>
        ) : (
          <>
            {(["a1", "a2", "b", "c", "d"] as const).map((axis) => {
              const axisQuestions = precisionQuestions.filter((q) => q.axis === axis);
              return (
                <details key={axis} className="mb-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 py-3 px-4 select-none hover:bg-gray-100 transition-colors">
                    {PREC_AXIS_LABELS[axis]}
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3">
                    {axisQuestions.map((q) => (
                      <div key={q.index} className="flex items-start gap-3">
                        <span className="text-xs text-gray-400 mt-2.5 w-8 shrink-0 font-mono">
                          Q{q.index + 1}
                        </span>
                        <textarea
                          value={q.question}
                          onChange={(e) => handlePrecisionQuestionChange(q.index, e.target.value)}
                          rows={2}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 resize-none focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}

            {/* ボタン群（精密ヒアリング設問） */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleSavePrecision}
                disabled={savingPrecision}
                className="bg-green-600 text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {savingPrecision ? "保存中..." : "精密ヒアリング設問を保存"}
              </button>
              <button
                type="button"
                onClick={handleResetPrecision}
                disabled={savingPrecision}
                className="bg-white text-gray-500 text-sm font-medium px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              >
                デフォルトに戻す
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
