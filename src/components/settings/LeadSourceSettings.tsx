"use client";

import { useState } from "react";

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

export default function LeadSourceSettings() {
  const [sources, setSources] = useState<LeadSourceItem[]>([...INITIAL_SOURCES]);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    const trimmedId = newId.trim();
    const trimmedLabel = newLabel.trim();
    if (!trimmedId || !trimmedLabel) return;
    if (sources.some((s) => s.id === trimmedId)) return;
    setSources((prev) => [...prev, { id: trimmedId, label: trimmedLabel }]);
    setNewId("");
    setNewLabel("");
  };

  const handleDelete = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
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
                  <button
                    type="button"
                    onClick={() => handleDelete(source.id)}
                    className="text-gray-400 hover:text-orange-600 transition-colors text-xs"
                  >
                    削除
                  </button>
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
            <label className="block text-xs text-gray-500 mb-1">ID（英数字）</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="例: line"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">表示名</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
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
