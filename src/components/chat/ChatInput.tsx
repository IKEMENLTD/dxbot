"use client";

import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import type { MediaAttachment } from "@/lib/chat-types";
import { useToast } from "@/contexts/ToastContext";

interface ChatInputProps {
  onSend: (message: string, media?: MediaAttachment[]) => Promise<void> | void;
  disabled: boolean;
}

const QUICK_TEMPLATES = [
  "ステップの進捗はいかがですか？",
  "補助金の申請受付が始まりました",
  "次回のステップをお送りします",
  "面談のご都合はいかがでしょうか？",
  "研修お疲れ様でした。次のステップについてご相談しませんか？",
];

const ACCEPT_TYPES = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileToAttachment(file: File): MediaAttachment | null {
  if (file.size > MAX_FILE_SIZE) return null;
  const isVideo = file.type.startsWith("video/");
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: isVideo ? "video" : "image",
    url: URL.createObjectURL(file),
    name: file.name || (isVideo ? "video.mp4" : "screenshot.png"),
    size: file.size,
    mimeType: file.type,
  };
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 24 * 3 + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    adjustHeight();
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled || sending) return;
    // テキストなし + 添付のみの場合は警告
    if (!trimmed && attachments.length > 0) {
      addToast("warning", "テキストを入力してから送信してください。画像のみの送信は現在対応していません。");
      return;
    }
    setSending(true);
    try {
      await onSend(trimmed, attachments.length > 0 ? attachments : undefined);
      setValue("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch {
      addToast("error", "メッセージの送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const attachment = fileToAttachment(file);
        if (attachment) {
          setAttachments((prev) => [...prev, attachment]);
        } else {
          addToast("warning", `ファイルサイズが上限(25MB)を超えています: ${file.name}`);
        }
        return;
      }
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: MediaAttachment[] = [];
    let skippedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const attachment = fileToAttachment(files[i]);
      if (attachment) {
        newAttachments.push(attachment);
      } else {
        skippedCount += 1;
      }
    }

    if (skippedCount > 0) {
      addToast("warning", `${skippedCount}件のファイルがサイズ上限(25MB)を超えています`);
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleTemplateSelect = (template: string) => {
    setValue(template);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-[#E5E8EB] bg-white px-3 lg:px-6 py-3 lg:py-4 relative flex-shrink-0">
      {/* 定型文ドロップダウン */}
      {showTemplates && (
        <div className="absolute bottom-full left-3 right-3 lg:left-6 lg:right-6 mb-2 bg-white border border-gray-200 overflow-hidden z-10">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">定型文</span>
          </div>
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template}
              onClick={() => handleTemplateSelect(template)}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] flex items-center"
            >
              {template}
            </button>
          ))}
        </div>
      )}

      {/* 添付ファイルプレビュー */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group overflow-hidden border border-gray-200 bg-gray-50"
            >
              {att.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- 外部URL画像のためnext/image不使用
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-20 h-20 object-cover"
                />
              ) : (
                <div className="w-20 h-20 flex flex-col items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[72px] px-1">
                    {att.name}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <span className="text-[10px] text-white">{formatFileSize(att.size)}</span>
              </div>
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-gray-900/60 hover:bg-gray-900/80 flex items-center justify-center transition-colors"
                style={{ borderRadius: "50%" }}
                aria-label={`${att.name}を削除`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="white" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 lg:gap-3">
        {/* 定型文ボタン */}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex-shrink-0"
          title="定型文"
          aria-label="定型文を表示"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="3" width="12" height="12" rx="2" stroke="#6B7280" strokeWidth="1.2" />
            <path d="M6 7H12M6 9.5H10" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        {/* ファイル添付ボタン */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleFileSelect}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex-shrink-0"
          title="画像・動画を添付"
          aria-label="画像・動画を添付"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="12" rx="2" stroke="#6B7280" strokeWidth="1.2" />
            <circle cx="6.5" cy="7.5" r="1.5" stroke="#6B7280" strokeWidth="1" />
            <path d="M2 13l4-4 3 3 2-2 5 5" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* テキストエリア */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="メッセージを入力..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-gray-50 border border-gray-200 px-3 lg:px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 disabled:opacity-50 transition-colors"
          style={{ minHeight: "44px" }}
        />

        {/* 送信ボタン */}
        <button
          onClick={handleSend}
          disabled={disabled || sending || (!value.trim() && attachments.length === 0)}
          className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          aria-label="メッセージを送信"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15.75 2.25L8.25 9.75M15.75 2.25L10.5 15.75L8.25 9.75M15.75 2.25L2.25 7.5L8.25 9.75"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="square"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {/* ヒントはデスクトップのみ表示 */}
      <p className="hidden lg:block text-[10px] text-gray-400 mt-1.5 ml-[108px]">
        Enter で送信 / Shift+Enter で改行 / Ctrl+V でスクショ貼付
      </p>
    </div>
  );
}
