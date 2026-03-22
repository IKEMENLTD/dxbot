"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";

const MAX_TEMPLATE_LENGTH = 200;

interface TemplateItem {
  id: string;
  text: string;
}

const INITIAL_TEMPLATES: TemplateItem[] = [
  { id: "tpl-1", text: "ステップの進捗はいかがですか？" },
  { id: "tpl-2", text: "補助金の申請受付が始まりました" },
  { id: "tpl-3", text: "次回のステップをお送りします" },
  { id: "tpl-4", text: "面談のご都合はいかがでしょうか？" },
  { id: "tpl-5", text: "研修お疲れ様でした。次のステップについてご相談しませんか？" },
];

export default function TemplateSettings() {
  const [templates, setTemplates] = useState<TemplateItem[]>(() =>
    loadFromStorage<TemplateItem[]>(STORAGE_KEYS.TEMPLATES, [...INITIAL_TEMPLATES])
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newText, setNewText] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Focus management
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId !== null) {
      editTextareaRef.current?.focus();
    }
  }, [editingId]);

  const updateTemplates = useCallback((updater: (prev: TemplateItem[]) => TemplateItem[]) => {
    setTemplates((prev) => {
      const next = updater(prev);
      saveToStorage(STORAGE_KEYS.TEMPLATES, next);
      return next;
    });
  }, []);

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_TEMPLATE_LENGTH) return;
    const newItem: TemplateItem = {
      id: `tpl-${Date.now()}`,
      text: trimmed,
    };
    updateTemplates((prev) => [...prev, newItem]);
    setNewText("");
  };

  const handleDeleteConfirm = (id: string) => {
    updateTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
    if (editingId === id) {
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleEditStart = (item: TemplateItem) => {
    setEditingId(item.id);
    setEditValue(item.text);
  };

  const handleEditSave = () => {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_TEMPLATE_LENGTH) return;
    updateTemplates((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, text: trimmed } : t))
    );
    setEditingId(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const isNewTextOverLimit = newText.length > MAX_TEMPLATE_LENGTH;
  const isEditValueOverLimit = editValue.length > MAX_TEMPLATE_LENGTH;

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
            {templates.map((template) => (
              <tr key={template.id} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  {editingId === template.id ? (
                    <div>
                      <textarea
                        ref={editTextareaRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        rows={2}
                        className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 transition-colors resize-none ${
                          isEditValueOverLimit
                            ? "border-orange-400 focus:ring-orange-200"
                            : "border-green-300 focus:ring-green-200"
                        }`}
                      />
                      <span className={`text-[10px] ${isEditValueOverLimit ? "text-orange-600" : "text-gray-400"}`}>
                        {editValue.length}/{MAX_TEMPLATE_LENGTH}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-800">{template.text}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {deletingId === template.id ? (
                    <div className="bg-orange-50 rounded-xl p-2 flex items-center gap-2">
                      <span className="text-xs text-gray-600">削除しますか？</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(template.id)}
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
                  ) : editingId === template.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEditSave}
                        disabled={isEditValueOverLimit}
                        className="text-green-600 hover:text-green-700 transition-colors text-xs font-medium disabled:text-gray-300"
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
                        onClick={() => handleEditStart(template)}
                        className="text-gray-400 hover:text-gray-700 transition-colors text-xs"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(template.id)}
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              placeholder="定型文を入力"
              rows={2}
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors resize-none ${
                isNewTextOverLimit
                  ? "border-orange-400 focus:border-orange-400 focus:ring-orange-200"
                  : "border-gray-200 focus:border-green-400 focus:ring-green-200"
              }`}
            />
            <span className={`text-[10px] ${isNewTextOverLimit ? "text-orange-600" : "text-gray-400"}`}>
              {newText.length}/{MAX_TEMPLATE_LENGTH}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newText.trim() || isNewTextOverLimit}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
