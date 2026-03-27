"use client";

import { useState, useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";
import { useToast } from "@/contexts/ToastContext";

interface LeadSourceItem {
  id: string;
  label: string;
}

const INITIAL_SOURCES: LeadSourceItem[] = [
  { id: "apo", label: "APO" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "referral", label: "紹介" },
  { id: "other", label: "その他" },
];

const ID_PATTERN = /^[a-z0-9_-]+$/;

export default function LeadSourceSettings() {
  const {
    value: sources,
    setValue: setSources,
    save: saveSources,
    loading,
    error: dbError,
  } = useAppSetting<LeadSourceItem[]>("lead_sources", [...INITIAL_SOURCES], STORAGE_KEYS.LEAD_SOURCES);
  const { addToast } = useToast();

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [idError, setIdError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateSources = useCallback(async (updater: (prev: LeadSourceItem[]) => LeadSourceItem[]) => {
    const next = updater(sources);
    setSources(next);
    const result = await saveSources(next);
    if (result.success) {
      addToast("success", "保存しました");
    } else {
      addToast("error", result.error ?? "保存に失敗しました");
    }
  }, [sources, setSources, saveSources, addToast]);

  const handleIdChange = (value: string) => {
    setNewId(value);
    // 入力中はエラーをクリア
    setIdError("");
  };

  const handleIdBlur = () => {
    const trimmed = newId.trim();
    if (trimmed && !ID_PATTERN.test(trimmed)) {
      setIdError("英小文字・数字・アンダースコア・ハイフンのみ使用できます");
    } else {
      setIdError("");
    }
  };

  const handleAdd = () => {
    const trimmedId = newId.trim();
    const trimmedLabel = newLabel.trim();
    if (!trimmedId || !trimmedLabel) return;
    if (!ID_PATTERN.test(trimmedId)) {
      setIdError("英小文字・数字・アンダースコア・ハイフンのみ使用できます");
      return;
    }
    if (sources.some((s) => s.id === trimmedId)) {
      setIdError("このIDはすでに存在します");
      return;
    }
    updateSources((prev) => [...prev, { id: trimmedId, label: trimmedLabel }]);
    setNewId("");
    setNewLabel("");
    setIdError("");
  };

  const handleDeleteConfirm = (id: string) => {
    updateSources((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div>
      {/* DBエラー表示 */}
      {dbError && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
          {dbError}（ローカルデータを表示しています）
        </div>
      )}

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">表示名</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{source.id}</td>
                <td className="px-4 py-3 text-gray-800">{source.label}</td>
                <td className="px-4 py-3">
                  {deletingId === source.id ? (
                    <div className="bg-orange-50 rounded-xl p-2 flex items-center gap-2">
                      <span className="text-xs text-gray-600">削除しますか？</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(source.id)}
                        className="bg-orange-600 text-white rounded-lg text-xs px-2 py-1"
                      >
                        はい
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="bg-gray-100 text-gray-600 rounded-lg text-xs px-2 py-1"
                      >
                        いいえ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(source.id)}
                      className="text-gray-400 hover:text-orange-600 transition-colors text-xs"
                    >
                      削除
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">
                  流入元がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">流入元を追加</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">ID（英小文字・数字・_・-）</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => handleIdChange(e.target.value)}
              onBlur={handleIdBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="例: line"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-colors ${
                idError
                  ? "border-orange-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  : "border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200"
              }`}
            />
            {idError && (
              <p className="mt-1 text-xs text-orange-600">{idError}</p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">表示名</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="例: LINE"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newId.trim() || !newLabel.trim()}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
