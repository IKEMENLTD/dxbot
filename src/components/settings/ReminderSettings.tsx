"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReminderConfig } from "@/lib/types";

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

/** トースト表示時間(ms) */
const TOAST_DURATION_MS = 3000;

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_REMINDER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
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
      showToast(
        "日数は昇順で設定してください（軽め < 強め < 最終 < 配信停止）",
        "error"
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
        showToast(errMsg, "error");
        return;
      }

      showToast("リマインダー設定を保存しました", "success");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        showToast("保存がタイムアウトしました", "error");
      } else {
        showToast("保存中にエラーが発生しました", "error");
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
    setConfig((prev) => ({ ...prev, [field]: num }));
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
      {/* トースト */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-opacity ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          {toast.message}
        </div>
      )}

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
              placeholder="空欄の場合、デフォルトのメッセージが使用されます"
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
              placeholder="空欄の場合、デフォルトのメッセージが使用されます"
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
              placeholder="空欄の場合、デフォルトのメッセージが使用されます"
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
          disabled={saving}
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
