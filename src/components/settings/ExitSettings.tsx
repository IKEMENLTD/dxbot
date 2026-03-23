"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ExitType } from "@/lib/types";
import { EXIT_CONFIG } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";

interface ExitItem {
  id: ExitType;
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

export default function ExitSettings() {
  const {
    value: exits,
    setValue: setExits,
    save: saveExits,
    loading,
    error: dbError,
  } = useAppSetting<ExitItem[]>("exits", buildInitialExits(), STORAGE_KEYS.EXITS);

  const [editingId, setEditingId] = useState<ExitType | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Focus management
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
    }
  }, [editingId]);

  const updateExits = useCallback((updater: (prev: ExitItem[]) => ExitItem[]) => {
    const next = updater(exits);
    setExits(next);
    saveExits(next);
  }, [exits, setExits, saveExits]);

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

  const handleColorChange = (id: ExitType, colorType: "green" | "orange") => {
    const mapped = COLOR_MAP[colorType];
    updateExits((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, colorType, colorClass: mapped.colorClass, bgClass: mapped.bgClass }
          : e
      )
    );
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
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-24">操作</th>
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
        出口の追加/削除にはシステム変更が必要です
      </p>
    </div>
  );
}
