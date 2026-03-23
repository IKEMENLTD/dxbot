"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { User, UserTag } from "@/lib/types";
import { EXIT_CONFIG, STATUS_CONFIG } from "@/lib/types";
import { mockTags } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

interface UserInfoPanelProps {
  user: User;
  userTagIds: string[];
  onAddTag: (userId: string, tagId: string) => void;
  onRemoveTag: (userId: string, tagId: string) => void;
  /** モバイルボトムシートとして表示 */
  isMobileSheet?: boolean;
  /** 閉じるコールバック（モバイル/タブレット用） */
  onClose?: () => void;
}

const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 480;
const DEFAULT_PANEL_WIDTH = 280;

const TAG_COLOR_CLASSES: Record<UserTag["color"], { bg: string; text: string }> = {
  green: { bg: "bg-green-50", text: "text-green-700" },
  orange: { bg: "bg-orange-50", text: "text-orange-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

const LEAD_SOURCE_LABELS: Record<string, string> = {
  apo: "アポ",
  threads: "Threads",
  x: "X",
  instagram: "Instagram",
  referral: "紹介",
  other: "その他",
};

function TagPill({ tag }: { tag: UserTag }) {
  const colors = TAG_COLOR_CLASSES[tag.color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {tag.label}
    </span>
  );
}

export default function UserInfoPanel({
  user,
  userTagIds,
  onAddTag,
  onRemoveTag,
  isMobileSheet = false,
  onClose,
}: UserInfoPanelProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [memo, setMemo] = useState(user.lead_note ?? "");
  const [selectedStatus, setSelectedStatus] = useState(user.customer_status);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const { addToast } = useToast();

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = panelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        // ドラッグは左に引っ張ると幅が増える
        const diff = dragStartX.current - ev.clientX;
        const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, dragStartWidth.current + diff));
        setPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panelWidth]
  );

  // Reset state when user changes
  useEffect(() => {
    setMemo(user.lead_note ?? "");
    setSelectedStatus(user.customer_status);
    setIsEditingTags(false);
    setShowTagDropdown(false);
    setNoteSaved(false);
  }, [user.id, user.lead_note, user.customer_status]);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setSelectedStatus(newStatus as typeof user.customer_status);
      setIsStatusUpdating(true);
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          setSelectedStatus(user.customer_status);
          addToast("error", "ステータスの更新に失敗しました");
        } else {
          addToast("success", "ステータスを更新しました");
        }
      } catch {
        setSelectedStatus(user.customer_status);
        addToast("error", "ステータスの更新に失敗しました");
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [user.id, user.customer_status, addToast]
  );

  const handleSaveNote = useCallback(async () => {
    setIsSavingNote(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/users/${user.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: memo }),
      });
      if (res.ok) {
        setNoteSaved(true);
        addToast("success", "メモを保存しました");
        setTimeout(() => setNoteSaved(false), 2000);
      } else {
        addToast("error", "メモの保存に失敗しました");
      }
    } catch {
      addToast("error", "メモの保存に失敗しました");
    } finally {
      setIsSavingNote(false);
    }
  }, [user.id, memo, addToast]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    if (showTagDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showTagDropdown]);

  const currentTags = useMemo(() => {
    return userTagIds
      .map((id) => mockTags.find((t) => t.id === id))
      .filter((t): t is UserTag => t !== undefined);
  }, [userTagIds]);

  const availableTags = useMemo(() => {
    return mockTags.filter((t) => !userTagIds.includes(t.id));
  }, [userTagIds]);

  const exitConfig = EXIT_CONFIG[user.recommended_exit];
  const statusConfig = STATUS_CONFIG[user.customer_status];

  const isOverlay = isMobileSheet || !!onClose;

  return (
    <div
      className={`bg-white flex flex-col overflow-y-auto relative ${
        isOverlay ? "h-full w-full" : "flex-shrink-0 border-l border-[#E5E8EB] h-full"
      }`}
      style={isOverlay ? undefined : { width: `${panelWidth}px` }}
    >
      {/* Drag handle - デスクトップのみ */}
      {!isOverlay && (
        <div
          onMouseDown={handleDragStart}
          className="absolute -left-2 top-0 w-4 h-full cursor-col-resize z-10 flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-gray-200 group-hover:bg-green-400 group-active:bg-green-500 transition-colors" style={{ borderRadius: "2px" }} />
        </div>
      )}

      {/* 閉じるボタン - オーバーレイ時のみ */}
      {isOverlay && onClose && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">ユーザー情報</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center"
            aria-label="閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="#111111" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center border-b border-[#E5E8EB]">
        <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mb-3" style={{ borderRadius: "50%" }}>
          <span className="text-xl font-semibold text-gray-600">
            {user.preferred_name.slice(0, 1)}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          {user.preferred_name}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {user.company_name}
        </p>
        <Link
          href={`/dashboard/users/${user.id}`}
          aria-label={`${user.preferred_name}のカルテを見る`}
          className="mt-3 text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
        >
          カルテを見る
        </Link>
      </div>

      {/* Basic Info */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
          <InfoRow label="業種" value={user.industry} />
          <InfoRow
            label="リード元"
            value={LEAD_SOURCE_LABELS[user.lead_source] ?? user.lead_source}
          />
          <InfoRow label="ステータス">
            <span className={`text-xs font-medium ${statusConfig.colorClass}`}>
              {statusConfig.label}
            </span>
          </InfoRow>
          <InfoRow label="Lv." value={String(user.level)} />
          <InfoRow label="スコア" value={String(user.score)} />
          <InfoRow label="推奨出口">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${exitConfig.bgClass} ${exitConfig.colorClass}`}
            >
              {exitConfig.label}
            </span>
          </InfoRow>
          <InfoRow
            label="最終アクション"
            value={formatDate(user.last_action_at)}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-700">タグ</h4>
          <button
            onClick={() => {
              setIsEditingTags(!isEditingTags);
              if (isEditingTags) setShowTagDropdown(false);
            }}
            className="text-[11px] text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            {isEditingTags ? "完了" : "編集"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1">
              <TagPill tag={tag} />
              {isEditingTags && (
                <button
                  onClick={() => {
                    onRemoveTag(user.id, tag.id);
                    addToast("success", `タグ「${tag.label}」を削除しました`);
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] leading-none transition-colors"
                  aria-label={`${tag.label}を削除`}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {currentTags.length === 0 && (
            <span className="text-xs text-gray-400">タグなし</span>
          )}
        </div>

        {/* Add Tag Dropdown */}
        {isEditingTags && (
          <div className="mt-2 relative" ref={dropdownRef}>
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              + タグを追加
            </button>
            {showTagDropdown && availableTags.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {availableTags.map((tag) => {
                  const colors = TAG_COLOR_CLASSES[tag.color];
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        onAddTag(user.id, tag.id);
                        addToast("success", `タグ「${tag.label}」を追加しました`);
                        setShowTagDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${colors.bg === "bg-green-50" ? "bg-green-400" : colors.bg === "bg-orange-50" ? "bg-orange-400" : "bg-gray-400"}`}
                      />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            )}
            {showTagDropdown && availableTags.length === 0 && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 px-3 py-2">
                <span className="text-xs text-gray-400">追加できるタグがありません</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Memo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">メモ</h4>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="メモを入力..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote}
            className="bg-gray-900 text-white rounded-lg text-xs px-3 py-1.5 disabled:opacity-50 transition-opacity"
          >
            {isSavingNote ? "保存中..." : "保存"}
          </button>
          {noteSaved && (
            <span className="text-xs text-green-600">保存しました</span>
          )}
        </div>
      </div>

      {/* Status Change */}
      <div className="px-5 py-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">
          ステータス変更
        </h4>
        <select
          value={selectedStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isStatusUpdating}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 disabled:opacity-50"
        >
          <option value="prospect">見込み</option>
          <option value="contacted">コンタクト済</option>
          <option value="meeting">面談済</option>
          <option value="customer">成約</option>
          <option value="churned">離脱</option>
          <option value="techstars_active">TECHSTARS受講中</option>
          <option value="techstars_grad">TECHSTARS修了</option>
        </select>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-500">{label}</span>
      {children ?? (
        <span className="text-xs font-medium text-gray-800">{value}</span>
      )}
    </div>
  );
}
