"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import type { ChatMessage, MediaAttachment } from "@/lib/chat-types";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateLabel(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getDateKey(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface MessageGroup {
  type: "date" | "message";
  dateLabel?: string;
  message?: ChatMessage;
}

function MediaPreview({ media }: { media: MediaAttachment }) {
  const [expanded, setExpanded] = useState(false);

  // Escapeキーでプレビューを閉じる
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [expanded, handleKeyDown]);

  if (media.type === "image") {
    return (
      <>
        <img
          src={media.url}
          alt={media.name}
          className="max-w-[280px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setExpanded(true)}
        />
        {expanded && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 lg:p-8"
            onClick={() => setExpanded(false)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <img
                src={media.url}
                alt={media.name}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                style={{ borderRadius: "50%" }}
                aria-label="プレビューを閉じる"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <video
      src={media.url}
      controls
      className="max-w-[280px] max-h-[200px]"
      preload="metadata"
    >
      <track kind="captions" />
    </video>
  );
}

function MessageMedia({ media }: { media: MediaAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {media.map((m) => (
        <MediaPreview key={m.id} media={m} />
      ))}
    </div>
  );
}

const RECENT_MESSAGE_THRESHOLD_MS = 2000;

function isRecentMessage(timestamp: string): boolean {
  const diff = Date.now() - new Date(timestamp).getTime();
  return diff >= 0 && diff < RECENT_MESSAGE_THRESHOLD_MS;
}

export default function MessageList({ messages, isLoading = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const grouped = useMemo(() => {
    const result: MessageGroup[] = [];
    let lastDateKey = "";

    for (const msg of messages) {
      const dateKey = getDateKey(msg.timestamp);
      if (dateKey !== lastDateKey) {
        result.push({ type: "date", dateLabel: formatDateLabel(msg.timestamp) });
        lastDateKey = dateKey;
      }
      result.push({ type: "message", message: msg });
    }

    return result;
  }, [messages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-green-500 animate-spin" style={{ borderRadius: "50%" }} />
          <p className="text-sm text-gray-400">メッセージを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">メッセージはまだありません</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 lg:px-6 py-4 space-y-3 bg-[#F7F8FA]">
      {isLoading && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-green-500 animate-spin" style={{ borderRadius: "50%" }} />
        </div>
      )}

      {grouped.map((item, index) => {
        if (item.type === "date") {
          return (
            <div key={`date-${index}`} className="flex justify-center my-3">
              <span className="bg-gray-100 px-3 py-1 text-xs text-gray-500"
                style={{ borderRadius: "9999px" }}
              >
                {item.dateLabel}
              </span>
            </div>
          );
        }

        const msg = item.message;
        if (!msg) return null;

        const isAdmin = msg.sender === "admin";
        const hasText = msg.content.length > 0;
        const hasMedia = msg.media && msg.media.length > 0;
        const isNew = isRecentMessage(msg.timestamp);

        return (
          <div
            key={msg.id}
            className={`flex ${isAdmin ? "justify-end" : "justify-start"} ${
              isNew ? "animate-fade-in" : ""
            }`}
            style={
              isNew
                ? {
                    animation: "fadeInUp 0.3s ease-out forwards",
                  }
                : undefined
            }
          >
            {/* モバイルでは最大幅85%、デスクトップでは70% */}
            <div className="max-w-[85%] lg:max-w-[70%]">
              {hasText && (
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed ${
                    isAdmin
                      ? "bg-green-50 text-gray-800"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                  style={{
                    borderRadius: isAdmin ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  }}
                >
                  {msg.content}
                </div>
              )}

              {hasMedia && msg.media && (
                <div className={hasText ? "mt-1.5" : ""}>
                  <MessageMedia media={msg.media} />
                </div>
              )}

              <div
                className={`flex items-center gap-1.5 mt-1 ${
                  isAdmin ? "justify-end" : "justify-start"
                }`}
              >
                {isAdmin && msg.read && (
                  <span className="text-[10px] text-gray-400">既読</span>
                )}
                <span className="text-[10px] text-gray-400">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
