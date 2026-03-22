"use client";

import { useState } from "react";

const INITIAL_TEMPLATES: string[] = [
  "ステップの進捗はいかがですか？",
  "補助金の申請受付が始まりました",
  "次回のステップをお送りします",
  "面談のご都合はいかがでしょうか？",
  "研修お疲れ様でした。次のステップについてご相談しませんか？",
];

export default function TemplateSettings() {
  const [templates, setTemplates] = useState<string[]>([...INITIAL_TEMPLATES]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newText, setNewText] = useState("");

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setTemplates((prev) => [...prev, trimmed]);
    setNewText("");
  };

  const handleDelete = (index: number) => {
    setTemplates((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditValue("");
    }
  };

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditValue(templates[index]);
  };

  const handleEditSave = () => {
    if (editingIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setTemplates((prev) =>
      prev.map((t, i) => (i === editingIndex ? trimmed : t))
    );
    setEditingIndex(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  return (
    <div>
      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">テキスト</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template, index) => (
              <tr key={`${index}-${template.slice(0, 10)}`} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  {editingIndex === index ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-200 transition-colors resize-none"
                    />
                  ) : (
                    <span className="text-gray-800">{template}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingIndex === index ? (
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
                        onClick={() => handleEditStart(index)}
                        className="text-gray-400 hover:text-gray-700 transition-colors text-xs"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="text-gray-400 hover:text-orange-600 transition-colors text-xs"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400 text-sm">
                  定型文がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">定型文を追加</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">テキスト</label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="定型文を入力"
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
