"use client";

import { useState, useCallback } from "react";
import type { StepDefinition, StepHints } from "@/lib/step-master";
import type { AxisScores } from "@/lib/types";

// ===== Props =====

interface StepDetailModalProps {
  step: StepDefinition;
  onSave: (updated: StepDefinition) => void;
  onClose: () => void;
}

// ===== 定数 =====

const AXIS_LABELS: Record<keyof AxisScores, string> = {
  a1: "A1: 売上・請求管理",
  a2: "A2: 連絡・記録管理",
  b: "B: 繰り返し作業",
  c: "C: データ経営",
  d: "D: ツール習熟",
};

const DIFFICULTY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "1 (易)" },
  { value: 2, label: "2 (中)" },
  { value: 3, label: "3 (難)" },
];

// ===== ヘルパー =====

/** StepHints のキーとラベルの対応 */
const HINT_FIELDS: { key: keyof StepHints; label: string }[] = [
  { key: "how", label: "やり方が分からない時" },
  { key: "motivation", label: "やる気が出ない時" },
  { key: "time", label: "時間がない時" },
];

// ===== 動的リストの入力UI =====

interface DynamicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

function DynamicList({ items, onChange, placeholder }: DynamicListProps) {
  const handleChange = useCallback(
    (index: number, value: string) => {
      const next = [...items];
      next[index] = value;
      onChange(next);
    },
    [items, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  const handleAdd = useCallback(() => {
    onChange([...items, ""]);
  }, [items, onChange]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none px-1"
            title="削除"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-green-600 hover:text-green-700 transition-colors"
      >
        + 項目を追加
      </button>
    </div>
  );
}

// ===== セクション見出し =====

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-1 mb-3">
      {children}
    </h4>
  );
}

// ===== メインコンポーネント =====

export default function StepDetailModal({ step, onSave, onClose }: StepDetailModalProps) {
  // ローカル編集ステート
  const [name, setName] = useState(step.name);
  const [description, setDescription] = useState(step.description);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(step.difficulty);
  const [estimatedMinutes, setEstimatedMinutes] = useState(step.estimatedMinutes);
  const [actionItems, setActionItems] = useState<string[]>([...step.actionItems]);
  const [completionCriteria, setCompletionCriteria] = useState(step.completionCriteria);
  const [recommendedTools, setRecommendedTools] = useState<string[]>([...step.recommendedTools]);
  const [hints, setHints] = useState<StepHints>({ ...step.hints });

  const handleHintChange = useCallback(
    (key: keyof StepHints, value: string) => {
      setHints((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleConfirm = useCallback(() => {
    // 空アイテムをフィルタして保存
    const cleanedActionItems = actionItems.filter((item) => item.trim() !== "");
    const cleanedTools = recommendedTools.filter((tool) => tool.trim() !== "");

    const updated: StepDefinition = {
      ...step,
      name,
      description,
      difficulty,
      estimatedMinutes,
      actionItems: cleanedActionItems,
      completionCriteria,
      recommendedTools: cleanedTools,
      hints,
    };
    onSave(updated);
  }, [step, name, description, difficulty, estimatedMinutes, actionItems, completionCriteria, recommendedTools, hints, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step.id}: {step.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {AXIS_LABELS[step.axis]} / Lv.{step.difficulty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="閉じる"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* 本体（スクロール可能） */}
        <div className="overflow-y-auto px-6 py-4 space-y-6 flex-1">
          {/* セクション1: 基本情報 */}
          <section>
            <SectionHeading>基本情報</SectionHeading>
            <div className="space-y-3">
              {/* ID・軸（読み取り専用） */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">ID（変更不可）</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono">
                    {step.id}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">軸（変更不可）</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">
                    {AXIS_LABELS[step.axis]}
                  </div>
                </div>
              </div>

              {/* 名前 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">名前</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
                />
              </div>

              {/* 難易度・所要時間 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">難易度</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                  >
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">所要時間（分）</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={estimatedMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 999) {
                        setEstimatedMinutes(val);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 text-right focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* セクション2: やること */}
          <section>
            <SectionHeading>やること（actionItems）</SectionHeading>
            <DynamicList
              items={actionItems}
              onChange={setActionItems}
              placeholder="例: 無料アカウントを作成"
            />
          </section>

          {/* セクション3: 完了基準 */}
          <section>
            <SectionHeading>完了基準（completionCriteria）</SectionHeading>
            <input
              type="text"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              placeholder="例: 請求書を1枚作成して保存できた"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
            />
          </section>

          {/* セクション4: 推奨ツール */}
          <section>
            <SectionHeading>推奨ツール（recommendedTools）</SectionHeading>
            <DynamicList
              items={recommendedTools}
              onChange={setRecommendedTools}
              placeholder="例: freee請求書（無料）"
            />
          </section>

          {/* セクション5: つまずきヒント */}
          <section>
            <SectionHeading>つまずきヒント</SectionHeading>
            <div className="space-y-3">
              {HINT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <textarea
                    value={hints[key]}
                    onChange={(e) => handleHintChange(key, e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors resize-none"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-green-600 text-white text-sm font-medium px-6 py-2 rounded-xl hover:bg-green-700 transition-colors"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
