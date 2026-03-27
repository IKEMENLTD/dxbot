"use client";

import { useState, useRef, useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAppSetting } from "@/hooks/useAppSetting";
import { useToast } from "@/contexts/ToastContext";
import type { UserTag, TagColor } from "@/lib/types";

const COLOR_OPTIONS: { value: TagColor; label: string; pillClass: string }[] = [
  { value: "green", label: "緑", pillClass: "bg-green-50 text-green-700" },
  { value: "orange", label: "オレンジ", pillClass: "bg-orange-50 text-orange-700" },
  { value: "gray", label: "グレー", pillClass: "bg-gray-100 text-gray-600" },
];

function getColorConfig(color: TagColor) {
  return COLOR_OPTIONS.find((c) => c.value === color) ?? COLOR_OPTIONS[2];
}

function parseTagColor(value: string): TagColor {
  const normalized = value.trim().toLowerCase();
  if (normalized === "green" || normalized === "緑") return "green";
  if (normalized === "orange" || normalized === "オレンジ") return "orange";
  return "gray";
}

interface CsvImportResult {
  success: number;
  skipped: number;
  errors: string[];
}

export default function TagSettings() {
  const {
    value: tags,
    setValue: setTags,
    save: saveTags,
    loading,
    error: dbError,
  } = useAppSetting<UserTag[]>("tags", [], STORAGE_KEYS.TAGS);
  const { addToast } = useToast();

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("green");

  // CSV import state
  const [showCsvPanel, setShowCsvPanel] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTags = useCallback(async (updater: (prev: UserTag[]) => UserTag[]) => {
    const next = updater(tags);
    setTags(next);
    // DB保存は楽観的更新（overrideValueで最新値を直接渡す）
    const result = await saveTags(next);
    if (result.success) {
      addToast("success", "保存しました");
    } else {
      addToast("error", result.error ?? "保存に失敗しました");
    }
  }, [tags, setTags, saveTags, addToast]);

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.label === trimmed)) return;
    const newTag: UserTag = {
      id: `tag-${Date.now()}`,
      label: trimmed,
      color: newColor,
    };
    updateTags((prev) => [...prev, newTag]);
    setNewLabel("");
    setNewColor("green");
  };

  const handleDeleteConfirm = (id: string) => {
    updateTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleColorChange = (id: string, color: TagColor) => {
    updateTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color } : t))
    );
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") return;
      processTagCsv(text);
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processTagCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Skip header if it looks like one
    const hasHeader = !!lines[0]?.match(/^(ラベル|label|タグ名)/i);
    const startIdx = hasHeader ? 1 : 0;

    const newTags: UserTag[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      const label = parts[0];
      const colorStr = parts[1] ?? "gray";
      const dataRowNum = i - startIdx + 1;

      if (!label) {
        errors.push(`データ${dataRowNum}行目: ラベルが空です`);
        continue;
      }

      if (tags.some((t) => t.label === label) || newTags.some((t) => t.label === label)) {
        skipped++;
        continue;
      }

      newTags.push({
        id: `tag-${Date.now()}-${i}`,
        label,
        color: parseTagColor(colorStr),
      });
      success++;
    }

    updateTags((prev) => [...prev, ...newTags]);
    setImportResult({ success, skipped, errors });
  };

  const handleDownloadTemplate = () => {
    const content = "ラベル,カラー\n要フォロー,orange\n契約済み,green\n休眠,gray";
    const filename = "タグマスタテンプレート.csv";
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {(['green', 'orange', 'gray'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleColorChange(tag.id, c)}
                          style={{
                            width: 20,
                            height: 20,
                            background: c === 'green' ? '#16a34a' : c === 'orange' ? '#ea580c' : '#6b7280',
                            border: tag.color === c ? '2px solid #111' : '2px solid transparent',
                            cursor: 'pointer',
                            outline: tag.color === c ? '2px solid #9ca3af' : 'none',
                            outlineOffset: 1,
                          }}
                          title={c === 'green' ? '緑' : c === 'orange' ? 'オレンジ' : 'グレー'}
                          aria-label={`色を${c === 'green' ? '緑' : c === 'orange' ? 'オレンジ' : 'グレー'}に変更`}
                        />
                      ))}
                      <span className={`ml-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorConf.pillClass}`}>
                        {colorConf.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`「${tag.label}」を削除しますか？`)) {
                          handleDeleteConfirm(tag.id);
                        }
                      }}
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
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="タグ名を入力"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 4 }}>
              {(['green', 'orange', 'gray'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    background: c === 'green' ? '#16a34a' : c === 'orange' ? '#ea580c' : '#6b7280',
                    border: newColor === c ? '2px solid #111' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: newColor === c ? '2px solid #9ca3af' : 'none',
                    outlineOffset: 1,
                  }}
                  title={c === 'green' ? '緑' : c === 'orange' ? 'オレンジ' : 'グレー'}
                  aria-label={`${c === 'green' ? '緑' : c === 'orange' ? 'オレンジ' : 'グレー'}を選択`}
                />
              ))}
            </div>
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

      {/* CSVインポート */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => { setShowCsvPanel(!showCsvPanel); setImportResult(null); }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          CSVで一括インポート
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`transition-transform ${showCsvPanel ? "rotate-180" : ""}`}
          >
            <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showCsvPanel && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
            {/* 説明 */}
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">タグマスタの一括追加</p>
              <p>CSV形式: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">ラベル,カラー</span></p>
              <p>カラー: green（緑）/ orange（オレンジ）/ gray（グレー）</p>
              <p>1行目がヘッダーの場合は自動スキップします</p>
            </div>

            {/* ボタン群 */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleFileSelect}
                className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 10V3M5 5.5L8 3l3 2.5M3 10v2.5h10V10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                CSVファイルを選択
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 3v7M4.5 7.5L7 10l2.5-2.5M2.5 11.5h9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                テンプレートをダウンロード
              </button>
            </div>

            {/* 結果表示 */}
            {importResult && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">インポート結果</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">成功: {importResult.success}件</span>
                  {importResult.skipped > 0 && (
                    <span className="text-gray-400">スキップ: {importResult.skipped}件</span>
                  )}
                  {importResult.errors.length > 0 && (
                    <span className="text-orange-600">エラー: {importResult.errors.length}件</span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-xs text-orange-600 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
