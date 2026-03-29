"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CustomerStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";
import { useToast } from "@/contexts/ToastContext";

interface StatusItem {
  id: string;
  label: string;
  colorClass: string;
}

type StatusColorKey = "gray" | "green" | "green_dark" | "orange" | "orange_dark" | "orange_light";

const STATUS_COLOR_MAP: Record<StatusColorKey, { label: string; colorClass: string }> = {
  gray:         { label: "グレー",       colorClass: "text-gray-500" },
  green:        { label: "緑",          colorClass: "text-green-600" },
  green_dark:   { label: "緑（濃）",     colorClass: "text-green-700" },
  orange:       { label: "オレンジ",     colorClass: "text-orange-600" },
  orange_dark:  { label: "オレンジ（濃）", colorClass: "text-orange-700" },
  orange_light: { label: "オレンジ（薄）", colorClass: "text-orange-500" },
};

function colorClassToKey(colorClass: string): StatusColorKey {
  if (colorClass === "text-gray-500") return "gray";
  if (colorClass === "text-green-600") return "green";
  if (colorClass === "text-green-700") return "green_dark";
  if (colorClass === "text-orange-600") return "orange";
  if (colorClass === "text-orange-700") return "orange_dark";
  if (colorClass === "text-orange-500") return "orange_light";
  return "gray";
}

function buildInitialStatuses(): StatusItem[] {
  return (Object.keys(STATUS_CONFIG) as CustomerStatus[]).map((key) => ({
    id: key,
    label: STATUS_CONFIG[key].label,
    colorClass: STATUS_CONFIG[key].colorClass,
  }));
}

const ID_PATTERN = /^[a-z0-9_]+$/;
const STATUS_COLOR_KEYS = Object.keys(STATUS_COLOR_MAP) as StatusColorKey[];

export default function StatusSettings() {
  const {
    value: statuses,
    setValue: setStatuses,
    save: saveStatuses,
    loading,
    error: dbError,
  } = useAppSetting<StatusItem[]>("statuses", buildInitialStatuses(), STORAGE_KEYS.STATUSES);
  const { addToast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Add form state
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColorKey, setNewColorKey] = useState<StatusColorKey>("gray");
  const [idError, setIdError] = useState("");

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

  // --- Add form handlers ---
  const handleIdChange = (value: string) => {
    setNewId(value);
    setIdError("");
  };

  const handleIdBlur = () => {
    const trimmed = newId.trim();
    if (trimmed && !ID_PATTERN.test(trimmed)) {
      setIdError("英小文字・数字・アンダースコアのみ使用できます");
    } else {
      setIdError("");
    }
  };

  const handleAdd = () => {
    const trimmedId = newId.trim();
    const trimmedLabel = newLabel.trim();
    if (!trimmedId || !trimmedLabel) return;
    if (!ID_PATTERN.test(trimmedId)) {
      setIdError("英小文字・数字・アンダースコアのみ使用できます");
      return;
    }
    if (statuses.some((s) => s.id === trimmedId)) {
      setIdError("このIDはすでに存在します");
      return;
    }
    updateStatuses((prev) => [
      ...prev,
      {
        id: trimmedId,
        label: trimmedLabel,
        colorClass: STATUS_COLOR_MAP[newColorKey].colorClass,
      },
    ]);
    setNewId("");
    setNewLabel("");
    setNewColorKey("gray");
    setIdError("");
  };

  // --- Delete handler ---
  const handleDelete = (item: StatusItem) => {
    if (!window.confirm(`「${item.label}」を削除しますか？`)) return;
    updateStatuses((prev) => prev.filter((s) => s.id !== item.id));
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
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-32">操作</th>
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
                    {STATUS_COLOR_MAP[colorClassToKey(item.colorClass)]?.label ?? "不明"}
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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditStart(item)}
                        className="text-gray-400 hover:text-gray-700 transition-colors text-xs"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="text-gray-400 hover:text-orange-600 transition-colors text-xs"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {statuses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                  ステータスがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">ステータスを追加</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">ID（英小文字・数字・_）</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => handleIdChange(e.target.value)}
              onBlur={handleIdBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="例: trial"
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
              placeholder="例: トライアル中"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <select
              value={newColorKey}
              onChange={(e) => setNewColorKey(e.target.value as StatusColorKey)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-400 transition-colors"
            >
              {STATUS_COLOR_KEYS.map((key) => (
                <option key={key} value={key}>
                  {STATUS_COLOR_MAP[key].label}
                </option>
              ))}
            </select>
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
