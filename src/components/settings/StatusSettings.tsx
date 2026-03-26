"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CustomerStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";
import { useToast } from "@/contexts/ToastContext";

interface StatusItem {
  id: CustomerStatus;
  label: string;
  colorClass: string;
}

function buildInitialStatuses(): StatusItem[] {
  return (Object.keys(STATUS_CONFIG) as CustomerStatus[]).map((key) => ({
    id: key,
    label: STATUS_CONFIG[key].label,
    colorClass: STATUS_CONFIG[key].colorClass,
  }));
}

export default function StatusSettings() {
  const {
    value: statuses,
    setValue: setStatuses,
    save: saveStatuses,
    loading,
    error: dbError,
  } = useAppSetting<StatusItem[]>("statuses", buildInitialStatuses(), STORAGE_KEYS.STATUSES);
  const { addToast } = useToast();

  const [editingId, setEditingId] = useState<CustomerStatus | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Focus management
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
    }
  }, [editingId]);

  const updateStatuses = useCallback(async (updater: (prev: StatusItem[]) => StatusItem[]) => {
    const next = updater(statuses);
    setStatuses(next);
    const result = await saveStatuses(next);
    if (result.success) {
      addToast("success", "保存しました");
    } else {
      addToast("error", result.error ?? "保存に失敗しました");
    }
  }, [statuses, setStatuses, saveStatuses, addToast]);

  const handleEditStart = (item: StatusItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const handleEditSave = () => {
    if (editingId === null) return;
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    updateStatuses((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, label: trimmed } : s))
    );
    setEditingId(null);
    setEditLabel("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleEditCancel();
    } else if (e.key === "Enter") {
      handleEditSave();
    }
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
              <th className="px-4 py-3 text-xs font-medium text-gray-500">カラー</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="bg-white border border-green-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-200 transition-colors w-full"
                    />
                  ) : (
                    <span className="text-gray-800">{item.label}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${item.colorClass}`}>
                    {item.colorClass.includes("green") ? "緑系" : item.colorClass.includes("orange") ? "オレンジ系" : "グレー系"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEditSave}
                        className="text-green-600 hover:text-green-700 transition-colors text-xs font-medium"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleEditCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors text-xs"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEditStart(item)}
                      className="text-gray-400 hover:text-gray-700 transition-colors text-xs"
                    >
                      編集
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 注記 */}
      <p className="mt-4 text-xs text-gray-400 italic">
        ステータスの追加/削除にはシステム変更が必要です
      </p>
    </div>
  );
}
