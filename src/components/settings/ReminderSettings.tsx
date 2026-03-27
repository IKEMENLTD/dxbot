"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReminderConfig } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

/** デフォルトリマインダー設定 */
const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  lightDays: 3,
  mediumDays: 7,
  finalDays: 14,
  stopDays: 21,
  lightMessage: "",
  mediumMessage: "",
  finalMessage: "",
};

/** フェッチタイムアウト(ms) */
const FETCH_TIMEOUT_MS = 20000;

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_REMINDER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dayOrderError, setDayOrderError] = useState<string | null>(null);
  const { addToast } = useToast();

  const checkDayOrder = useCallback((c: ReminderConfig) => {
    if (c.lightDays >= c.mediumDays) {
      setDayOrderError('"軽め" は "強め" より小さい日数にしてください');
      return;
    }
    if (c.mediumDays >= c.finalDays) {
      setDayOrderError('"強め" は "最終" より小さい日数にしてください');
      return;
    }
    if (c.finalDays >= c.stopDays) {
      setDayOrderError('"最終" は "停止" より小さい日数にしてください');
      return;
    }
    setDayOrderError(null);
  }, []);

  // 初期ロード
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch("/api/settings/app?key=reminder_config", { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { data: ReminderConfig | null }) => {
        if (json.data) {
          setConfig({ ...DEFAULT_REMINDER_CONFIG, ...json.data });
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn("[ReminderSettings] 読み込みタイムアウト");
        } else {
          console.error("[ReminderSettings] 読み込みエラー:", err);
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

  // 保存
  const handleSave = async () => {
    // バリデーション: 日数は昇順
    if (
      config.lightDays >= config.mediumDays ||
      config.mediumDays >= config.finalDays ||
      config.finalDays >= config.stopDays
    ) {
      addToast(
        "error",
        "日数は昇順で設定してください（軽め < 強め < 最終 < 配信停止）"
      );
      return;
    }

    setSaving(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "reminder_config", value: config }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "保存に失敗しました" }));
        const errMsg = typeof errBody.error === "string" ? errBody.error : "保存に失敗しました";
        addToast("error", errMsg);
        return;
      }

      addToast("success", "リマインダー設定を保存しました");
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

  // デフォルトに戻す
  const handleReset = () => {
    if (!window.confirm("リマインダー設定をデフォルトに戻しますか？")) return;
    setConfig(DEFAULT_REMINDER_CONFIG);
  };

  // 日数変更ハンドラ
  const handleDaysChange = (field: "lightDays" | "mediumDays" | "finalDays" | "stopDays", value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setConfig((prev) => {
      const next = { ...prev, [field]: num };
      checkDayOrder(next);
      return next;
    });
  };

  // メッセージ変更ハンドラ
  const handleMessageChange = (field: "lightMessage" | "mediumMessage" | "finalMessage", value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
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
      {/* リマインダー間隔設定 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">リマインダー間隔（日数）</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">軽めのリマインダー</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={config.lightDays}
                  onChange={(e) => handleDaysChange("lightDays", e.target.value)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
                <span className="text-xs text-gray-500">日後</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">強めのリマインダー</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={config.mediumDays}
                  onChange={(e) => handleDaysChange("mediumDays", e.target.value)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
                <span className="text-xs text-gray-500">日後</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最終リマインダー</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={config.finalDays}
                  onChange={(e) => handleDaysChange("finalDays", e.target.value)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
                <span className="text-xs text-gray-500">日後</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">配信停止</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={config.stopDays}
                  onChange={(e) => handleDaysChange("stopDays", e.target.value)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
                <span className="text-xs text-gray-500">日後</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            最終アクションからの経過日数でリマインダーレベルが決まります。配信停止日数以降は送信されません。
          </p>
          {dayOrderError && (
            <p className="mt-2 text-xs text-red-600">{dayOrderError}</p>
          )}
        </div>
      </div>

      {/* メッセージ文言設定 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">カスタムメッセージ（空欄ならデフォルト使用）</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              軽めのリマインダー（{config.lightDays}日後）
            </label>
            <textarea
              value={config.lightMessage}
              onChange={(e) => handleMessageChange("lightMessage", e.target.value)}
              placeholder={"最近の進捗はいかがですか？「ステップ名」が待っています。\n\nお時間のあるときに、\n少しずつ進めてみてください。"}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              強めのリマインダー（{config.mediumDays}日後）
            </label>
            <textarea
              value={config.mediumMessage}
              onChange={(e) => handleMessageChange("mediumMessage", e.target.value)}
              placeholder={"「ステップ名」が待っています。\n\nDX改善は一歩ずつで大丈夫です。\nいつでも再開できます。"}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              最終リマインダー（{config.finalDays}日後）
            </label>
            <textarea
              value={config.finalMessage}
              onChange={(e) => handleMessageChange("finalMessage", e.target.value)}
              placeholder={"いつでも再開できます。\n\nDXの取り組みを再開したいときは、\n「ステップ」と送信してください。"}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* ボタン群 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !!dayOrderError}
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
    </div>
  );
}
