"use client";

import { useState, useEffect, useCallback } from "react";
import type { CtaConfig, CtaTrigger } from "@/lib/types";

// ---------------------------------------------------------------------------
// デフォルト設定値（cta-engine.ts の DEFAULT_CTA_CONFIG と同一）
// ---------------------------------------------------------------------------

const DEFAULT_CTA_CONFIG: CtaConfig = {
  action_boost: {
    enabled: true,
    normalDays: 14,
    normalSteps: 3,
    techstarsGradDays: 7,
    techstarsGradSteps: 1,
  },
  apo_early: {
    enabled: true,
    days: 7,
    steps: 2,
  },
  subsidy_timing: {
    enabled: true,
    levelThreshold: 15,
    subsidyMonths: [1, 2, 3, 6, 7, 8],
  },
  lv40_reached: {
    enabled: true,
    levelThreshold: 40,
  },
  invoice_stumble: {
    enabled: true,
    axisA1Threshold: 5,
  },
  it_literacy: {
    enabled: true,
    stumbleHowCountThreshold: 3,
    axisDThreshold: 5,
    totalScoreThreshold: 24,
  },
};

// ---------------------------------------------------------------------------
// トリガー表示情報
// ---------------------------------------------------------------------------

interface TriggerMeta {
  key: CtaTrigger;
  label: string;
  description: string;
}

const TRIGGER_META: TriggerMeta[] = [
  {
    key: "invoice_stumble",
    label: "インボイスstumble",
    description: "請求関連で軸A1が低い場合にベテランAIを提案",
  },
  {
    key: "it_literacy",
    label: "ITリテラシー不足",
    description: "stumble(how)回数超過、または軸D/全体スコアが低い場合にTECHSTARSを提案",
  },
  {
    key: "action_boost",
    label: "行動加速",
    description: "一定期間内に規定ステップ数を完了した場合にCTAを発火",
  },
  {
    key: "apo_early",
    label: "アポ早期",
    description: "アポ経由で早期に行動している場合にCTAを発火",
  },
  {
    key: "subsidy_timing",
    label: "補助金タイミング",
    description: "補助金申請時期にレベルが一定以上の場合にCTAを発火",
  },
  {
    key: "lv40_reached",
    label: "Lv到達",
    description: "レベルが閾値に到達した場合にCTAを発火",
  },
];

// ---------------------------------------------------------------------------
// 月名ラベル
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

// ---------------------------------------------------------------------------
// フェッチタイムアウト（20秒）
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 20_000;

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

// スコア系フィールド（0を許容）- コンポーネント外に定義して参照安定性を確保
const SCORE_FIELDS = new Set([
  "axisA1Threshold",
  "axisDThreshold",
  "totalScoreThreshold",
  "stumbleHowCountThreshold",
]);

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

export default function CtaSettings() {
  const [config, setConfig] = useState<CtaConfig>(DEFAULT_CTA_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [openTrigger, setOpenTrigger] = useState<CtaTrigger | null>(null);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // DB読み込み
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchWithTimeout("/api/settings/app?key=cta_config");
        if (!res.ok) throw new Error("設定の取得に失敗しました");
        const json: { data: CtaConfig | null } = await res.json();
        if (!cancelled && json.data) {
          setConfig(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "設定の読み込みに失敗しました";
          console.error("[CtaSettings] load error:", msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetchWithTimeout("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "cta_config", value: config }),
      });
      if (!res.ok) {
        const json: { error?: string } = await res.json();
        throw new Error(json.error ?? "保存に失敗しました");
      }
      setToast({ type: "success", message: "CTA設定を保存しました" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存に失敗しました";
      setToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }, [config]);

  // デフォルトに戻す
  const handleReset = useCallback(() => {
    if (!window.confirm("CTA設定をデフォルト値に戻しますか？")) return;
    setConfig(DEFAULT_CTA_CONFIG);
    setToast({ type: "success", message: "デフォルト値に戻しました（保存ボタンで確定してください）" });
  }, []);

  // トグル切替
  const handleToggle = useCallback((triggerKey: CtaTrigger) => {
    setConfig((prev) => ({
      ...prev,
      [triggerKey]: {
        ...prev[triggerKey],
        enabled: !prev[triggerKey].enabled,
      },
    }));
  }, []);

  // 数値フィールド更新
  const handleNumberChange = useCallback(
    (triggerKey: CtaTrigger, field: string, value: string) => {
      const num = parseInt(value, 10);
      if (isNaN(num)) return;
      const minValue = SCORE_FIELDS.has(field) ? 0 : 1;
      const clamped = Math.max(num, minValue);
      setConfig((prev) => ({
        ...prev,
        [triggerKey]: {
          ...prev[triggerKey],
          [field]: clamped,
        },
      }));
    },
    // SCORE_FIELDSはモジュールスコープの定数（再レンダリングで変化しない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 補助金月チェックボックス
  const handleMonthToggle = useCallback((month: number) => {
    setConfig((prev) => {
      const current = prev.subsidy_timing.subsidyMonths;
      const next = current.includes(month)
        ? current.filter((m) => m !== month)
        : [...current, month].sort((a, b) => a - b);
      return {
        ...prev,
        subsidy_timing: { ...prev.subsidy_timing, subsidyMonths: next },
      };
    });
  }, []);

  // アコーディオン
  const toggleAccordion = useCallback((key: CtaTrigger) => {
    setOpenTrigger((prev) => (prev === key ? null : key));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* トースト */}
      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* トリガーカード一覧 */}
      <div className="space-y-3">
        {TRIGGER_META.map((meta) => {
          const triggerConfig = config[meta.key];
          const isOpen = openTrigger === meta.key;

          return (
            <div
              key={meta.key}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* ヘッダー */}
              <button
                type="button"
                onClick={() => toggleAccordion(meta.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {/* トグルスイッチ */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(meta.key);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      triggerConfig.enabled ? "bg-green-600" : "bg-gray-300"
                    }`}
                    aria-label={`${meta.label}を${triggerConfig.enabled ? "無効" : "有効"}にする`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        triggerConfig.enabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {meta.label}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">
                      {meta.key}
                    </span>
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* コンテンツ */}
              {isOpen && (
                <div className="px-4 py-4 bg-white border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-4">{meta.description}</p>

                  {/* action_boost */}
                  {meta.key === "action_boost" && (
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField
                        label="通常: 日数"
                        value={config.action_boost.normalDays}
                        onChange={(v) => handleNumberChange("action_boost", "normalDays", v)}
                        suffix="日以内"
                      />
                      <NumberField
                        label="通常: ステップ数"
                        value={config.action_boost.normalSteps}
                        onChange={(v) => handleNumberChange("action_boost", "normalSteps", v)}
                        suffix="ステップ以上"
                      />
                      <NumberField
                        label="TECHSTARS修了者: 日数"
                        value={config.action_boost.techstarsGradDays}
                        onChange={(v) => handleNumberChange("action_boost", "techstarsGradDays", v)}
                        suffix="日以内"
                      />
                      <NumberField
                        label="TECHSTARS修了者: ステップ数"
                        value={config.action_boost.techstarsGradSteps}
                        onChange={(v) => handleNumberChange("action_boost", "techstarsGradSteps", v)}
                        suffix="ステップ以上"
                      />
                    </div>
                  )}

                  {/* apo_early */}
                  {meta.key === "apo_early" && (
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField
                        label="日数"
                        value={config.apo_early.days}
                        onChange={(v) => handleNumberChange("apo_early", "days", v)}
                        suffix="日以内"
                      />
                      <NumberField
                        label="ステップ数"
                        value={config.apo_early.steps}
                        onChange={(v) => handleNumberChange("apo_early", "steps", v)}
                        suffix="ステップ以上"
                      />
                    </div>
                  )}

                  {/* subsidy_timing */}
                  {meta.key === "subsidy_timing" && (
                    <div className="space-y-4">
                      <NumberField
                        label="レベル閾値"
                        value={config.subsidy_timing.levelThreshold}
                        onChange={(v) => handleNumberChange("subsidy_timing", "levelThreshold", v)}
                        suffix="以上"
                      />
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">
                          申請対象月
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {MONTH_LABELS.map((label, idx) => {
                            const month = idx + 1;
                            const checked = config.subsidy_timing.subsidyMonths.includes(month);
                            return (
                              <button
                                key={month}
                                type="button"
                                onClick={() => handleMonthToggle(month)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                  checked
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* lv40_reached */}
                  {meta.key === "lv40_reached" && (
                    <NumberField
                      label="レベル閾値"
                      value={config.lv40_reached.levelThreshold}
                      onChange={(v) => handleNumberChange("lv40_reached", "levelThreshold", v)}
                      suffix="以上"
                    />
                  )}

                  {/* invoice_stumble */}
                  {meta.key === "invoice_stumble" && (
                    <NumberField
                      label="軸A1閾値"
                      value={config.invoice_stumble.axisA1Threshold}
                      onChange={(v) => handleNumberChange("invoice_stumble", "axisA1Threshold", v)}
                      suffix="以下で発火"
                    />
                  )}

                  {/* it_literacy */}
                  {meta.key === "it_literacy" && (
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField
                        label="stumble(how)回数"
                        value={config.it_literacy.stumbleHowCountThreshold}
                        onChange={(v) => handleNumberChange("it_literacy", "stumbleHowCountThreshold", v)}
                        suffix="回以上"
                      />
                      <NumberField
                        label="軸D閾値"
                        value={config.it_literacy.axisDThreshold}
                        onChange={(v) => handleNumberChange("it_literacy", "axisDThreshold", v)}
                        suffix="以下"
                      />
                      <NumberField
                        label="全体スコア閾値"
                        value={config.it_literacy.totalScoreThreshold}
                        onChange={(v) => handleNumberChange("it_literacy", "totalScoreThreshold", v)}
                        suffix="以下"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 操作ボタン */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="bg-white text-gray-600 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          デフォルトに戻す
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 数値入力フィールド
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
  suffix?: string;
}

function NumberField({ label, value, onChange, suffix }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}
