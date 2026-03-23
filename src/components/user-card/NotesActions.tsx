"use client";

import { useState, useCallback } from "react";
import type { User, CustomerStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface NotesActionsProps {
  user: User;
  onUserUpdated?: () => void;
}

const STATUS_OPTIONS: CustomerStatus[] = [
  "prospect",
  "contacted",
  "meeting",
  "customer",
  "churned",
  "techstars_active",
  "techstars_grad",
];

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export default function NotesActions({ user, onUserUpdated }: NotesActionsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus>(user.customer_status);
  const { addToast } = useToast();

  // 処理中フラグ
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isRediagnosing, setIsRediagnosing] = useState(false);
  const [isCompletingTechstars, setIsCompletingTechstars] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // フィードバック
  const [noteFeedback, setNoteFeedback] = useState<FeedbackState>(null);
  const [rediagnoseFeedback, setRediagnoseFeedback] = useState<FeedbackState>(null);
  const [techstarsFeedback, setTechstarsFeedback] = useState<FeedbackState>(null);
  const [statusFeedback, setStatusFeedback] = useState<FeedbackState>(null);

  const isTechstarsActive = user.customer_status === "techstars_active";

  // --- メモ保存 ---
  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return;

    setIsSavingNote(true);
    setNoteFeedback(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`/api/users/${user.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setNoteFeedback({
          type: "error",
          message: data.error ?? "メモの保存に失敗しました",
        });
        return;
      }

      setNoteFeedback({ type: "success", message: "保存しました" });
      addToast("success", "メモを保存しました");
      setNoteText("");
      onUserUpdated?.();
      setTimeout(() => setNoteFeedback(null), 3000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setNoteFeedback({ type: "error", message: "リクエストがタイムアウトしました" });
        addToast("error", "リクエストがタイムアウトしました");
      } else {
        setNoteFeedback({ type: "error", message: "メモの保存に失敗しました" });
        addToast("error", "メモの保存に失敗しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSavingNote(false);
    }
  }, [noteText, user.id, onUserUpdated, addToast]);

  // --- 再診断送信 ---
  const handleRediagnose = useCallback(async () => {
    setIsRediagnosing(true);
    setRediagnoseFeedback(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`/api/users/${user.id}/rediagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const errorMsg = data.error ?? "再診断送信に失敗しました";
        setRediagnoseFeedback({ type: "error", message: errorMsg });
        addToast("error", errorMsg);
        return;
      }

      const json = (await res.json()) as { data?: { warning?: string } };
      if (json.data?.warning) {
        setRediagnoseFeedback({ type: "success", message: json.data.warning });
        addToast("warning", json.data.warning);
      } else {
        setRediagnoseFeedback({ type: "success", message: "再診断メッセージを送信しました" });
        addToast("success", "再診断メッセージを送信しました");
      }
      setTimeout(() => setRediagnoseFeedback(null), 5000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setRediagnoseFeedback({ type: "error", message: "リクエストがタイムアウトしました" });
        addToast("error", "リクエストがタイムアウトしました");
      } else {
        setRediagnoseFeedback({ type: "error", message: "再診断送信に失敗しました" });
        addToast("error", "再診断送信に失敗しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsRediagnosing(false);
    }
  }, [user.id, addToast]);

  // --- TECHSTARS修了登録 ---
  const handleCompleteTechstars = useCallback(async () => {
    setIsCompletingTechstars(true);
    setTechstarsFeedback(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "techstars_complete" }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const errorMsg = data.error ?? "TECHSTARS修了登録に失敗しました";
        setTechstarsFeedback({ type: "error", message: errorMsg });
        addToast("error", errorMsg);
        return;
      }

      setTechstarsFeedback({ type: "success", message: "TECHSTARS修了を登録しました" });
      addToast("success", "TECHSTARS修了を登録しました");
      setSelectedStatus("techstars_grad");
      onUserUpdated?.();
      setTimeout(() => setTechstarsFeedback(null), 5000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setTechstarsFeedback({ type: "error", message: "リクエストがタイムアウトしました" });
        addToast("error", "リクエストがタイムアウトしました");
      } else {
        setTechstarsFeedback({ type: "error", message: "TECHSTARS修了登録に失敗しました" });
        addToast("error", "TECHSTARS修了登録に失敗しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsCompletingTechstars(false);
    }
  }, [user.id, onUserUpdated, addToast]);

  // --- ステータス変更 ---
  const handleStatusChange = useCallback(
    async (newStatus: CustomerStatus) => {
      if (newStatus === selectedStatus) return;

      const previousStatus = selectedStatus;
      setSelectedStatus(newStatus);
      setIsUpdatingStatus(true);
      setStatusFeedback(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          const errorMsg = data.error ?? "ステータス変更に失敗しました";
          setSelectedStatus(previousStatus);
          setStatusFeedback({ type: "error", message: errorMsg });
          addToast("error", errorMsg);
          return;
        }

        setStatusFeedback({ type: "success", message: "ステータスを更新しました" });
        addToast("success", "ステータスを更新しました");
        onUserUpdated?.();
        setTimeout(() => setStatusFeedback(null), 3000);
      } catch (err) {
        setSelectedStatus(previousStatus);
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatusFeedback({ type: "error", message: "リクエストがタイムアウトしました" });
          addToast("error", "リクエストがタイムアウトしました");
        } else {
          setStatusFeedback({ type: "error", message: "ステータス変更に失敗しました" });
          addToast("error", "ステータス変更に失敗しました");
        }
      } finally {
        clearTimeout(timeoutId);
        setIsUpdatingStatus(false);
      }
    },
    [selectedStatus, user.id, onUserUpdated, addToast]
  );

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        メモ & アクション
      </h3>

      {/* Note input */}
      <div className="mb-4">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="メモを入力..."
          className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSaveNote}
        disabled={isSavingNote || !noteText.trim()}
        className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSavingNote ? "保存中..." : "メモを保存"}
      </button>
      {noteFeedback && (
        <p className={`text-xs mb-4 ${noteFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {noteFeedback.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={handleRediagnose}
          disabled={isRediagnosing}
          className="bg-gray-900 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRediagnosing ? "送信中..." : "再診断送信"}
        </button>

        {isTechstarsActive && (
          <button
            type="button"
            onClick={handleCompleteTechstars}
            disabled={isCompletingTechstars}
            className="bg-orange-600 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            {isCompletingTechstars ? "登録中..." : "TECHSTARS修了登録"}
          </button>
        )}
      </div>
      {rediagnoseFeedback && (
        <p className={`text-xs mb-2 ${rediagnoseFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {rediagnoseFeedback.message}
        </p>
      )}
      {techstarsFeedback && (
        <p className={`text-xs mb-2 ${techstarsFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {techstarsFeedback.message}
        </p>
      )}

      {/* Status change */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 shrink-0">ステータス:</label>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
            disabled={isUpdatingStatus}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
        </div>
        {statusFeedback && (
          <p className={`text-xs mt-1 ${statusFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {statusFeedback.message}
          </p>
        )}
      </div>
    </section>
  );
}
