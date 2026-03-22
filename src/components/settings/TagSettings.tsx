"use client";

import { useState } from "react";
import { mockTags } from "@/lib/mock-data";
import type { UserTag, TagColor } from "@/lib/types";

const COLOR_OPTIONS: { value: TagColor; label: string; pillClass: string }[] = [
  { value: "green", label: "緑", pillClass: "bg-green-50 text-green-700" },
  { value: "orange", label: "オレンジ", pillClass: "bg-orange-50 text-orange-700" },
  { value: "gray", label: "グレー", pillClass: "bg-gray-100 text-gray-600" },
];

function getColorConfig(color: TagColor) {
  return COLOR_OPTIONS.find((c) => c.value === color) ?? COLOR_OPTIONS[2];
}

export default function TagSettings() {
  const [tags, setTags] = useState<UserTag[]>([...mockTags]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("green");

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const newTag: UserTag = {
      id: `tag-${Date.now()}`,
      label: trimmed,
      color: newColor,
    };
    setTags((prev) => [...prev, newTag]);
    setNewLabel("");
    setNewColor("green");
  };

  const handleDelete = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">ラベル</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">カラー</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => {
              const colorConf = getColorConfig(tag.color);
              return (
                <tr key={tag.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{tag.label}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colorConf.pillClass}`}>
                      {colorConf.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id)}
                      className="text-gray-400 hover:text-orange-600 transition-colors text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">
                  タグがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">タグを追加</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">ラベル</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="タグ名を入力"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value as TagColor)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            >
              {COLOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
