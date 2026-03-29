"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ExitType } from "@/lib/types";
import { EXIT_CONFIG } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";
import { useToast } from "@/contexts/ToastContext";

interface ExitItem {
  id: string;
  label: string;
  colorType: "green" | "orange";
  colorClass: string;
  bgClass: string;
}

function toColorType(colorClass: string): "green" | "orange" {
  return colorClass.includes("green") ? "green" : "orange";
}

function buildInitialExits(): ExitItem[] {
  return (Object.keys(EXIT_CONFIG) as ExitType[]).map((key) => {
    const conf = EXIT_CONFIG[key];
    return {
      id: key,
      label: conf.label,
      colorType: toColorType(conf.colorClass),
      colorClass: conf.colorClass,
      bgClass: conf.bgClass,
    };
  });
}

const COLOR_MAP: Record<"green" | "orange", { colorClass: string; bgClass: string }> = {
  green: { colorClass: "text-green-600", bgClass: "bg-green-50" },
  orange: { colorClass: "text-orange-600", bgClass: "bg-orange-50" },
};

const ID_PATTERN = /^[a-z0-9_]+$/;

export default function ExitSettings() {
  const {
    value: exits,
    setValue: setExits,
    save: saveExits,
    loading,
    error: dbError,
  } = useAppSetting<ExitItem[]>("exits", buildInitialExits(), STORAGE_KEYS.EXITS);
  const { addToast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Add form state
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<"green" | "orange">("green");
  const [idError, setIdError] = useState("");

  // Focus management
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
    }
  }, [editingId]);

  const updateExits = useCallback(async (updater: (prev: ExitItem[]) => ExitItem[]) => {
    const next = updater(exits);
    setExits(next);
    const result = await saveExits(next);
    if (result.success) {
      addToast("success", "保存しました");
    } else {
      addToast("error", result.error ?? "保存に失敗しました");
    }
  }, [exits, setExits, saveExits, addToast]);

  const handleEditStart = (item: ExitItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const handleEditSave = () => {
    if (editingId === null) return;
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    updateExits((prev) =>
      prev.map((e) => (e.id === editingId ? { ...e, label: trimmed } : e))
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

  const handleColorChange = (id: string, colorType: "green" | "orange") => {
    const mapped = COLOR_MAP[colorType];
    updateExits((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, colorType, colorClass: mapped.colorClass, bgClass: mapped.bgClass }
          : e
      )
    );
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
    if (exits.some((e) => e.id === trimmedId)) {
      setIdError("このIDはすでに存在します");
      return;
    }
    const mapped = COLOR_MAP[newColor];
    updateExits((prev) => [
      ...prev,
      {
        id: trimmedId,
        label: trimmedLabel,
        colorType: newColor,
        colorClass: mapped.colorClass,
        bgClass: mapped.bgClass,
      },
    ]);
    setNewId("");
    setNewLabel("");
    setNewColor("green");
    setIdError("");
  };

  // --- Delete handler ---
  const handleDelete = (item: ExitItem) => {
    if (!window.confirm(`「${item.label}」を削除しますか？`)) return;
    updateExits((prev) => prev.filter((e) => e.id !== item.id));
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
              <th className="px-4 py-3 text-xs font-medium text-gray-500">プレビュー</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {exits.map((item) => (
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
                  <select
                    value={item.colorType}
                    onChange={(e) =>
                      handleColorChange(item.id, e.target.value as "green" | "orange")
                    }
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-green-400 transition-colors"
                  >
                    <option value="green">緑</option>
                    <option value="orange">オレンジ</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${item.bgClass} ${item.colorClass}`}>
                    {item.label}
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
            {exits.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                  出口がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">出口を追加</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">ID（英小文字・数字・_）</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => handleIdChange(e.target.value)}
              onBlur={handleIdBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="例: consulting"
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
              placeholder="例: コンサルティング"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setNewColor("green")}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  newColor === "green"
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"
                }`}
              >
                緑
              </button>
              <button
                type="button"
                onClick={() => setNewColor("orange")}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  newColor === "orange"
                    ? "bg-orange-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"
                }`}
              >
                オレンジ
              </button>
            </div>
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
