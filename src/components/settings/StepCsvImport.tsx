"use client";

import { useState, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import type { StepDefinition } from "@/lib/step-master";
import type { AxisScores } from "@/lib/types";
import {
  parseCsvToSteps,
  calculateStepDiff,
  mergeSteps,
  generateStepCsvTemplate,
} from "@/lib/csv-step-parser";
import type { CsvParseResult, StepDiff } from "@/lib/csv-step-parser";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepCsvImportProps {
  currentSteps: StepDefinition[];
  onImport: (steps: StepDefinition[]) => void;
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_ERRORS_DISPLAY = 10;

const AXIS_LABELS: Record<keyof AxisScores, string> = {
  a1: "A1",
  a2: "A2",
  b: "B",
  c: "C",
  d: "D",
};

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

export default function StepCsvImport({ currentSteps, onImport }: StepCsvImportProps) {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPanel, setShowPanel] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [diff, setDiff] = useState<StepDiff | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showPreview, setShowPreview] = useState(false);

  // ----- テンプレートダウンロード -----
  function handleDownloadTemplate() {
    const csv = generateStepCsvTemplate(currentSteps);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "step_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----- ファイル選択 -----
  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      addToast("error", "ファイルサイズは1MB以内にしてください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;

      const result = parseCsvToSteps(text);
      setCsvResult(result);

      if (result.steps.length > 0) {
        const d = calculateStepDiff(currentSteps, result.steps);
        setDiff(d);
        setShowPreview(true);
      } else {
        setDiff(null);
        setShowPreview(false);
      }
    };
    reader.readAsText(file, "utf-8");

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ----- インポート確定 -----
  function handleConfirmImport() {
    if (!csvResult || !diff) return;

    const addedCount = diff.added.length;
    const modifiedCount = diff.modified.length;

    const modeLabel = importMode === "replace" ? "全置換" : "追加・更新";
    const confirmed = window.confirm(
      `[${modeLabel}] 新規 ${addedCount}件、変更 ${modifiedCount}件を反映します。よろしいですか？`
    );
    if (!confirmed) return;

    const merged = mergeSteps(currentSteps, csvResult.steps, importMode);
    onImport(merged);

    // リセット
    setCsvResult(null);
    setDiff(null);
    setShowPreview(false);
    addToast("success", `${addedCount + modifiedCount}件のステップをインポートしました`);
  }

  // ----- リセット -----
  function handleReset() {
    setCsvResult(null);
    setDiff(null);
    setShowPreview(false);
  }

  // ----- 軸別サマリ計算 -----
  function getAxisSummary(
    current: StepDefinition[],
    imported: StepDefinition[]
  ): { axis: keyof AxisScores; before: number; after: number }[] {
    const axes: (keyof AxisScores)[] = ["a1", "a2", "b", "c", "d"];

    return axes.map((axis) => {
      const before = current.filter((s) => s.axis === axis).length;
      // mergeモードの場合: 既存 + 新規追加分（同一IDは上書き）
      const merged = mergeSteps(current, imported, importMode);
      const after = merged.filter((s) => s.axis === axis).length;
      return { axis, before, after };
    });
  }

  return (
    <div className="mt-4 mb-2">
      <button
        type="button"
        onClick={() => {
          setShowPanel(!showPanel);
          if (showPanel) handleReset();
        }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
        CSVインポート
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${showPanel ? "rotate-180" : ""}`}
        >
          <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showPanel && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          {/* 説明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">ステップマスタのCSVインポート</p>
            <p>
              12列のCSV形式:{" "}
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                ID,軸,名前,説明,難易度,所要時間,アクション項目,完了基準,推奨ツール,ヒント(やり方),ヒント(やる気),ヒント(時間)
              </span>
            </p>
            <p>アクション項目・推奨ツールは <code className="bg-white px-1 rounded border border-gray-200">;</code> 区切りで複数入力可</p>
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M8 10V3M5 5.5L8 3l3 2.5M3 10v2.5h10V10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              CSVファイルを選択
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M7 3v7M4.5 7.5L7 10l2.5-2.5M2.5 11.5h9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              テンプレートをダウンロード
            </button>
          </div>

          {/* パース結果 */}
          {csvResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">パース結果</p>

              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  成功: {csvResult.steps.length}件
                </span>
                {csvResult.errors.length > 0 && (
                  <span className="text-orange-600">
                    エラー: {csvResult.errors.length}件
                  </span>
                )}
                {csvResult.warnings.length > 0 && (
                  <span className="text-gray-500">
                    警告: {csvResult.warnings.length}件
                  </span>
                )}
              </div>

              {/* エラー一覧 */}
              {csvResult.errors.length > 0 && (
                <div className="text-xs text-orange-600 space-y-0.5 max-h-40 overflow-y-auto">
                  {csvResult.errors.slice(0, MAX_ERRORS_DISPLAY).map((err, i) => (
                    <p key={i}>
                      行{err.row}
                      {err.column ? ` [${err.column}]` : ""}: {err.message}
                    </p>
                  ))}
                  {csvResult.errors.length > MAX_ERRORS_DISPLAY && (
                    <p className="text-gray-400">
                      ...他 {csvResult.errors.length - MAX_ERRORS_DISPLAY}件のエラー
                    </p>
                  )}
                </div>
              )}

              {/* 警告一覧 */}
              {csvResult.warnings.length > 0 && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  {csvResult.warnings.slice(0, 5).map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* インポートモード & 差分プレビュー */}
          {showPreview && diff && csvResult && csvResult.steps.length > 0 && (
            <>
              {/* モード選択 */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-700">
                  インポートモード:
                </span>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                    className="accent-green-600"
                  />
                  追加・更新
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-green-600"
                  />
                  全置換
                </label>
              </div>

              {/* 差分プレビュー */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">差分プレビュー</p>

                {/* サマリ */}
                <div className="flex gap-4 text-xs">
                  <span className="text-green-600">
                    新規: {diff.added.length}件
                  </span>
                  <span className="text-orange-600">
                    変更: {diff.modified.length}件
                  </span>
                  <span className="text-gray-400">
                    変更なし: {diff.unchanged.length}件
                  </span>
                </div>

                {/* テーブル */}
                {(diff.added.length > 0 || diff.modified.length > 0) && (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-2 py-1.5 font-medium text-gray-500">ID</th>
                          <th className="px-2 py-1.5 font-medium text-gray-500">名前</th>
                          <th className="px-2 py-1.5 font-medium text-gray-500">軸</th>
                          <th className="px-2 py-1.5 font-medium text-gray-500">状態</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diff.added.map((s) => (
                          <tr key={s.id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 font-mono text-gray-600">
                              {s.id}
                            </td>
                            <td className="px-2 py-1.5 text-gray-800">{s.name}</td>
                            <td className="px-2 py-1.5 text-gray-600">
                              {AXIS_LABELS[s.axis]}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                新規
                              </span>
                            </td>
                          </tr>
                        ))}
                        {diff.modified.map((m) => (
                          <tr key={m.after.id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 font-mono text-gray-600">
                              {m.after.id}
                            </td>
                            <td className="px-2 py-1.5 text-gray-800">
                              {m.after.name}
                            </td>
                            <td className="px-2 py-1.5 text-gray-600">
                              {AXIS_LABELS[m.after.axis]}
                            </td>
                            <td className="px-2 py-1.5">
                              <span
                                className="inline-block px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium"
                                title={`変更: ${m.changedFields.join(", ")}`}
                              >
                                変更
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 軸別サマリ */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {getAxisSummary(currentSteps, csvResult.steps).map(
                    ({ axis, before, after }) => (
                      <span key={axis}>
                        {AXIS_LABELS[axis]}:{" "}
                        {before === after ? (
                          <span>{before}件</span>
                        ) : (
                          <span>
                            {before}
                            <span className="mx-0.5">→</span>
                            <span
                              className={
                                after > before
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }
                            >
                              {after}件
                            </span>
                          </span>
                        )}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* インポート確定ボタン */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={
                    diff.added.length === 0 && diff.modified.length === 0
                  }
                  className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  インポート確定
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
