"use client";

import { useState, useMemo, useCallback, type KeyboardEvent } from "react";
import type { User, UserTag } from "@/lib/types";
import type { ChatMessage, ContactPreview } from "@/lib/chat-types";
import UserAvatar from "@/components/ui/UserAvatar";

interface ContactListProps {
  users: User[];
  messages: ChatMessage[];
  contactPreviews: ContactPreview[];
  selectedUserId: string | null;
  userTags: Record<string, string[]>;
  /** タグマスターデータ */
  tagMaster?: UserTag[];
  onSelect: (userId: string) => void;
  /** モバイル全幅表示 */
  isMobile?: boolean;
}

const TAG_COLOR_CLASSES: Record<UserTag["color"], { bg: string; text: string }> = {
  green: { bg: "bg-green-50", text: "text-green-700" },
  orange: { bg: "bg-orange-50", text: "text-orange-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

function formatContactTime(timestamp: string): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (diffDays === 1) {
    return "昨日";
  }
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ContactDataItem {
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: UserTag[];
}

export default function ContactList({
  users,
  messages,
  contactPreviews,
  selectedUserId,
  userTags,
  tagMaster = [],
  onSelect,
  isMobile = false,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // contactPreviewsをMapに変換
  const previewMap = useMemo(() => {
    const map = new Map<string, ContactPreview>();
    for (const cp of contactPreviews) {
      map.set(cp.userId, cp);
    }
    return map;
  }, [contactPreviews]);

  const contactData = useMemo((): ContactDataItem[] => {
    return users.map((user) => {
      const preview = previewMap.get(user.id);

      let lastMessage: string;
      let lastMessageTime: string;
      let unreadCount: number;

      if (preview) {
        lastMessage = preview.lastMessage;
        lastMessageTime = preview.lastMessageTime;
        unreadCount = preview.unreadCount;
      } else {
        const userMessages = messages.filter((m) => m.userId === user.id);
        const lastMsg =
          userMessages.length > 0
            ? userMessages[userMessages.length - 1]
            : null;
        lastMessage = lastMsg?.content ?? "";
        lastMessageTime = lastMsg?.timestamp ?? user.created_at;
        unreadCount = userMessages.filter(
          (m) => m.sender === "user" && !m.read
        ).length;
      }

      const localUserMsgs = messages.filter((m) => m.userId === user.id);
      if (localUserMsgs.length > 0) {
        const localLast = localUserMsgs[localUserMsgs.length - 1];
        if (
          !lastMessageTime ||
          new Date(localLast.timestamp) > new Date(lastMessageTime)
        ) {
          lastMessage = localLast.content;
          lastMessageTime = localLast.timestamp;
        }
      }

      const tagIds = userTags[user.id] ?? [];
      const tags = tagIds
        .map((id) => tagMaster.find((t) => t.id === id))
        .filter((t): t is UserTag => t !== undefined);

      return {
        user,
        lastMessage,
        lastMessageTime: lastMessageTime || user.created_at,
        unreadCount,
        tags,
      };
    });
  }, [users, messages, userTags, previewMap]);

  const sortedContacts = useMemo(() => {
    const filtered = contactData.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.user.preferred_name ?? "").toLowerCase().includes(q) ||
        (c.user.company_name ?? "").toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

      return (
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
      );
    });
  }, [contactData, searchQuery]);

  // キーボードナビゲーション: 上下キーでユーザー選択
  const handleListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();

      const currentIndex = sortedContacts.findIndex(
        (c) => c.user.id === selectedUserId
      );

      let nextIndex: number;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < sortedContacts.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : sortedContacts.length - 1;
      }

      const nextUser = sortedContacts[nextIndex];
      if (nextUser) {
        onSelect(nextUser.user.id);
      }
    },
    [sortedContacts, selectedUserId, onSelect]
  );

  // モバイルでは全幅、デスクトップでは260px固定
  const containerClass = isMobile
    ? "w-full flex-1 bg-white flex flex-col h-full"
    : "w-[260px] flex-shrink-0 bg-white border-r border-[#E5E8EB] flex flex-col h-full";

  return (
    <div className={containerClass}>
      {/* Header + Search */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">1:1チャット</h2>
          <span className="text-[11px] text-gray-400">{users.length}件</span>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M9.5 9.5L12.5 12.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前・会社名で検索"
            aria-label="ユーザーを検索"
            className="w-full bg-gray-50 border border-gray-200 pl-9 pr-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="ユーザー一覧" onKeyDown={handleListKeyDown} tabIndex={0}>
        {sortedContacts.map((contact) => {
          const isSelected = contact.user.id === selectedUserId;
          const visibleTags = contact.tags.slice(0, 2);
          const remainingCount = contact.tags.length - 2;

          return (
            <button
              key={contact.user.id}
              onClick={() => onSelect(contact.user.id)}
              role="option"
              aria-label={`${contact.user.preferred_name}のチャットを開く`}
              aria-selected={isSelected}
              className={`w-full text-left px-4 flex items-start gap-3 transition-colors ${
                isMobile ? "py-3.5 min-h-[56px]" : "py-3"
              } ${
                isSelected ? "bg-green-50" : "hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <UserAvatar
                  name={contact.user.preferred_name}
                  pictureUrl={contact.user.profile_picture_url}
                  size="sm"
                />
                {contact.unreadCount > 0 && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white"
                    style={{ borderRadius: "50%" }}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${
                    contact.unreadCount > 0
                      ? "font-bold text-gray-900"
                      : "font-semibold text-gray-900"
                  }`}>
                    {contact.user.preferred_name}
                  </span>
                  {contact.lastMessage && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatContactTime(contact.lastMessageTime)}
                    </span>
                  )}
                </div>

                {/* Tags under name */}
                {visibleTags.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {visibleTags.map((tag) => {
                      const colors = TAG_COLOR_CLASSES[tag.color];
                      return (
                        <span
                          key={tag.id}
                          className={`px-1.5 py-px text-[10px] font-medium ${colors.bg} ${colors.text}`}
                          style={{ borderRadius: "9999px" }}
                        >
                          {tag.label}
                        </span>
                      );
                    })}
                    {remainingCount > 0 && (
                      <span className="text-[10px] text-gray-400">
                        +{remainingCount}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate flex-1 ${
                    contact.unreadCount > 0
                      ? "text-gray-700 font-medium"
                      : "text-gray-500"
                  }`}>
                    {contact.lastMessage || "メッセージなし"}
                  </p>
                  {contact.unreadCount > 0 && (
                    <span className="bg-green-600 text-white min-w-[20px] h-5 text-[10px] flex items-center justify-center flex-shrink-0 ml-2 px-1"
                      style={{ borderRadius: "9999px" }}
                    >
                      {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
