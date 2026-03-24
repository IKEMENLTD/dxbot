"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import ContactList from "@/components/chat/ContactList";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import UserInfoPanel from "@/components/chat/UserInfoPanel";
import { EXIT_CONFIG } from "@/lib/types";
import type { User } from "@/lib/types";
import type { ChatMessage, ContactPreview, MediaAttachment } from "@/lib/chat-types";
import { useToast } from "@/contexts/ToastContext";

const POLLING_INTERVAL_MS = 5000;
const FETCH_TIMEOUT_MS = 10000;

/** ブレークポイント定数 */
const BREAKPOINT_MD = 768;
const BREAKPOINT_LG = 1024;

type ScreenSize = "mobile" | "tablet" | "desktop";
type MobileView = "contacts" | "chat";

interface ContactsApiResponse {
  contacts: ContactPreview[];
  error?: string;
}

interface MessagesApiResponse {
  messages: ChatMessage[];
  error?: string;
}

interface SendApiResponse {
  success: boolean;
  messageId?: string;
  timestamp?: string;
  error?: string;
}

interface UsersApiResponse {
  data: User[];
  error?: string;
}

function buildInitialTags(): Record<string, string[]> {
  return {};
}

/** 画面サイズを判定するフック */
function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < BREAKPOINT_MD) {
        setScreenSize("mobile");
      } else if (w < BREAKPOINT_LG) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return screenSize;
}

export default function ChatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactPreviews, setContactPreviews] = useState<ContactPreview[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [userTags, setUserTags] = useState<Record<string, string[]>>(
    buildInitialTags
  );

  // モバイル表示状態
  const screenSize = useScreenSize();
  const [mobileView, setMobileView] = useState<MobileView>("contacts");
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isUserInfoClosing, setIsUserInfoClosing] = useState(false);
  const [isChatSliding, setIsChatSliding] = useState(false);
  const [chatSlideDirection, setChatSlideDirection] = useState<"in" | "out">("in");

  // ポーリング用: 最新のタイムスタンプを管理
  const lastPolledAtRef = useRef<string>(new Date().toISOString());
  const pollingAbortRef = useRef<AbortController | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const selectedMessages = useMemo(
    () =>
      selectedUserId
        ? messages.filter((m) => m.userId === selectedUserId)
        : [],
    [messages, selectedUserId]
  );

  // ----- ユーザー一覧取得 -----
  const fetchUsers = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/users", {
        signal,
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as UsersApiResponse;
      if (data.data && data.data.length > 0) {
        setUsers(data.data);
        const newTags: Record<string, string[]> = {};
        for (const user of data.data) {
          newTags[user.id] = user.tags ?? [];
        }
        setUserTags(newTags);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[Chat] ユーザー取得エラー:', err);
      }
    }
  }, []);

  // ----- コンタクトプレビュー取得 -----
  const fetchContacts = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/chat/contacts", {
        signal,
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as ContactsApiResponse;
      if (data.contacts) {
        setContactPreviews(data.contacts);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[Chat] コンタクト取得エラー:', err);
      }
    }
  }, []);

  // ----- 特定ユーザーのメッセージ取得 -----
  const fetchMessagesForUser = useCallback(
    async (userId: string, signal: AbortSignal) => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat?userId=${encodeURIComponent(userId)}`, {
          signal,
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as MessagesApiResponse;
        if (data.messages) {
          setMessages((prev) => {
            const otherMsgs = prev.filter((m) => m.userId !== userId);
            return [...otherMsgs, ...data.messages];
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[Chat] メッセージ取得エラー:', err);
        }
        // メッセージ取得失敗時は空のまま
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  // ----- 既読マーク -----
  const markAsReadApi = useCallback(async (userId: string, signal: AbortSignal) => {
    try {
      await fetch("/api/chat/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[Chat] 既読マークエラー:', err);
      }
    }
  }, []);

  // ----- 初回ロード -----
  useEffect(() => {
    const controller = new AbortController();

    async function init() {
      try {
        await Promise.all([
          fetchUsers(controller.signal),
          fetchContacts(controller.signal),
        ]);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[Chat] 初期化エラー:', err);
        }
      } finally {
        setIsInitialLoading(false);
      }
    }

    init();

    return () => {
      controller.abort();
    };
  }, [fetchUsers, fetchContacts]);

  // ----- 初回ロード後に最初のユーザーを選択（デスクトップ/タブレットのみ） -----
  useEffect(() => {
    if (!isInitialLoading && !selectedUserId && users.length > 0 && screenSize !== "mobile") {
      setSelectedUserId(users[0].id);
    }
  }, [isInitialLoading, selectedUserId, users, screenSize]);

  // ----- selectedUser変更時にメッセージ取得 + markAsRead -----
  useEffect(() => {
    if (!selectedUserId) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function loadMessages() {
      if (!selectedUserId) return;
      await fetchMessagesForUser(selectedUserId, controller.signal);
      await markAsReadApi(selectedUserId, controller.signal);

      setMessages((prev) =>
        prev.map((m) =>
          m.userId === selectedUserId && m.sender === "user" && !m.read
            ? { ...m, read: true }
            : m
        )
      );

      setContactPreviews((prev) =>
        prev.map((c) =>
          c.userId === selectedUserId ? { ...c, unreadCount: 0 } : c
        )
      );
    }

    loadMessages();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [selectedUserId, fetchMessagesForUser, markAsReadApi]);

  // ----- ポーリング -----
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }

      const controller = new AbortController();
      pollingAbortRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      async function poll() {
        try {
          const sinceParam = encodeURIComponent(lastPolledAtRef.current);
          const res = await fetch(`/api/chat?since=${sinceParam}`, {
            signal: controller.signal,
            headers: { "Cache-Control": "no-cache" },
          });
          if (!res.ok) return;
          const data = (await res.json()) as MessagesApiResponse;

          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter((m) => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              return [...prev, ...newMsgs];
            });

            const latestTs = data.messages[data.messages.length - 1].timestamp;
            lastPolledAtRef.current = latestTs;

            const contactController = new AbortController();
            const contactTimeout = setTimeout(
              () => contactController.abort(),
              FETCH_TIMEOUT_MS
            );
            try {
              await fetchContacts(contactController.signal);
            } finally {
              clearTimeout(contactTimeout);
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('[Chat] ポーリングエラー:', err);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      poll();
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }
    };
  }, [fetchContacts]);

  // ----- ユーザー選択 -----
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setError(null);

    // モバイルではチャット画面にスライド遷移
    if (window.innerWidth < BREAKPOINT_MD) {
      setChatSlideDirection("in");
      setIsChatSliding(true);
      setMobileView("chat");
    }
  }, []);

  // ----- モバイルバック -----
  const handleMobileBack = useCallback(() => {
    setChatSlideDirection("out");
    setIsChatSliding(true);

    // アニメーション完了後にコンタクト一覧に戻す
    setTimeout(() => {
      setMobileView("contacts");
      setIsChatSliding(false);
      setSelectedUserId(null);
    }, 250);
  }, []);

  // ----- UserInfoPanel表示/非表示 -----
  const handleOpenUserInfo = useCallback(() => {
    setShowUserInfo(true);
    setIsUserInfoClosing(false);
  }, []);

  const handleCloseUserInfo = useCallback(() => {
    setIsUserInfoClosing(true);
    setTimeout(() => {
      setShowUserInfo(false);
      setIsUserInfoClosing(false);
    }, 250);
  }, []);

  // ----- メッセージ送信（楽観的更新） -----
  const handleSend = useCallback(
    async (text: string, media?: MediaAttachment[]) => {
      if (!selectedUserId || isSending) return;

      const tempId = `msg-temp-${Date.now()}`;
      const now = new Date().toISOString();

      const optimisticMsg: ChatMessage = {
        id: tempId,
        userId: selectedUserId,
        sender: "admin",
        content: text,
        timestamp: now,
        read: false,
        media,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            message: text,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = (await res.json()) as SendApiResponse;
          const errorMsg = data.error ?? "メッセージ送信に失敗しました";
          setError(errorMsg);
          addToast("error", errorMsg);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }

        const data = (await res.json()) as SendApiResponse;

        if (data.messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, id: data.messageId as string, timestamp: data.timestamp ?? now }
                : m
            )
          );
        }

        lastPolledAtRef.current = data.timestamp ?? now;

        setContactPreviews((prev) =>
          prev.map((c) =>
            c.userId === selectedUserId
              ? { ...c, lastMessage: text, lastMessageTime: data.timestamp ?? now }
              : c
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[Chat] メッセージ送信エラー:', err);
        }
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError("メッセージ送信中にエラーが発生しました");
        addToast("error", "メッセージ送信中にエラーが発生しました");
      } finally {
        clearTimeout(timeoutId);
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedUserId, isSending]
  );

  // ----- タグ操作 -----
  const handleAddTag = useCallback((userId: string, tagId: string) => {
    setUserTags((prev) => {
      const current = prev[userId] ?? [];
      if (current.includes(tagId)) return prev;
      return { ...prev, [userId]: [...current, tagId] };
    });
  }, []);

  const handleRemoveTag = useCallback((userId: string, tagId: string) => {
    setUserTags((prev) => {
      const current = prev[userId] ?? [];
      return { ...prev, [userId]: current.filter((id) => id !== tagId) };
    });
  }, []);

  // ----- レンダリング -----
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";

  // UserInfoPanel の共通props
  const userInfoPanelProps = selectedUser
    ? {
        user: selectedUser,
        userTagIds: userTags[selectedUser.id] ?? [],
        onAddTag: handleAddTag,
        onRemoveTag: handleRemoveTag,
      }
    : null;

  // チャットヘッダー（モバイル/タブレットではユーザー情報ボタン付き）
  const renderChatHeader = () => {
    if (!selectedUser) return null;

    return (
      <div className="px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between bg-white border-b border-[#E5E8EB] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* モバイル: バックボタン */}
          {isMobile && (
            <button
              onClick={handleMobileBack}
              className="w-10 h-10 flex items-center justify-center flex-shrink-0 -ml-1"
              aria-label="連絡先一覧に戻る"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 4L7 10L13 16" stroke="#111111" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>
          )}
          <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0"
            style={{ borderRadius: "50%" }}
          >
            <span className="text-sm font-medium text-gray-600">
              {selectedUser.preferred_name.slice(0, 1)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {selectedUser.preferred_name}
            </h2>
            <p className="text-[11px] text-gray-400 truncate">
              {selectedUser.company_name}
            </p>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 flex-shrink-0 ${
              EXIT_CONFIG[selectedUser.recommended_exit].bgClass
            } ${EXIT_CONFIG[selectedUser.recommended_exit].colorClass}`}
            style={{ borderRadius: "9999px" }}
          >
            {EXIT_CONFIG[selectedUser.recommended_exit].label}
          </span>
        </div>

        {/* ユーザー情報ボタン（モバイル・タブレット） */}
        {(isMobile || isTablet) && (
          <button
            onClick={handleOpenUserInfo}
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            aria-label="ユーザー情報を表示"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3" stroke="#6B7280" strokeWidth="1.5" />
              <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // チャットエリア（共通）
  const renderChatArea = () => (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA]">
      {selectedUser ? (
        <>
          {renderChatHeader()}

          {/* Error Banner */}
          {error && (
            <div className="px-4 lg:px-6 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <p className="text-xs text-red-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                aria-label="エラーメッセージを閉じる"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          )}

          {/* Messages */}
          <MessageList
            messages={selectedMessages}
            isLoading={isLoadingMessages}
          />

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isSending} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          {isInitialLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-green-500 animate-spin" style={{ borderRadius: "50%" }} />
              <p className="text-sm text-gray-400">読み込み中...</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              ユーザーを選択してください
            </p>
          )}
        </div>
      )}
    </div>
  );

  // UserInfoPanel オーバーレイ（タブレット: サイドオーバーレイ / モバイル: ボトムシート）
  const renderUserInfoOverlay = () => {
    if (!showUserInfo || !userInfoPanelProps) return null;

    if (isMobile) {
      // ボトムシート
      return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* オーバーレイ背景 */}
          <div
            className={`absolute inset-0 bg-black/40 ${isUserInfoClosing ? "overlay-fade-out" : "overlay-fade-in"}`}
            onClick={handleCloseUserInfo}
          />
          {/* シート本体 */}
          <div
            className={`relative bg-white max-h-[85vh] flex flex-col ${isUserInfoClosing ? "sheet-slide-down" : "sheet-slide-up"}`}
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center py-3 flex-shrink-0" onClick={handleCloseUserInfo}>
              <div className="w-10 h-1 bg-gray-300" style={{ borderRadius: "2px" }} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <UserInfoPanel
                {...userInfoPanelProps}
                isMobileSheet
                onClose={handleCloseUserInfo}
              />
            </div>
          </div>
        </div>
      );
    }

    // タブレット: サイドオーバーレイ
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className={`absolute inset-0 bg-black/40 ${isUserInfoClosing ? "overlay-fade-out" : "overlay-fade-in"}`}
          onClick={handleCloseUserInfo}
        />
        <div
          className={`relative bg-white w-[320px] h-full border-l border-[#E5E8EB] overflow-y-auto ${isUserInfoClosing ? "chat-slide-out" : "chat-slide-in"}`}
        >
          <UserInfoPanel
            {...userInfoPanelProps}
            isMobileSheet={false}
            onClose={handleCloseUserInfo}
          />
        </div>
      </div>
    );
  };

  // ===== モバイルレイアウト =====
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {mobileView === "contacts" && (
          <ContactList
            users={users}
            messages={messages}
            contactPreviews={contactPreviews}
            selectedUserId={selectedUserId}
            userTags={userTags}
            onSelect={handleSelectUser}
            isMobile
          />
        )}
        {mobileView === "chat" && (
          <div
            className={`flex-1 flex flex-col min-h-0 ${
              isChatSliding
                ? chatSlideDirection === "in"
                  ? "chat-slide-in"
                  : "chat-slide-out"
                : ""
            }`}
            onAnimationEnd={() => setIsChatSliding(false)}
          >
            {renderChatArea()}
          </div>
        )}
        {renderUserInfoOverlay()}
      </div>
    );
  }

  // ===== タブレットレイアウト =====
  if (isTablet) {
    return (
      <div className="h-screen flex bg-white overflow-hidden">
        <ContactList
          users={users}
          messages={messages}
          contactPreviews={contactPreviews}
          selectedUserId={selectedUserId}
          userTags={userTags}
          onSelect={handleSelectUser}
        />
        {renderChatArea()}
        {renderUserInfoOverlay()}
      </div>
    );
  }

  // ===== デスクトップレイアウト =====
  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <ContactList
        users={users}
        messages={messages}
        contactPreviews={contactPreviews}
        selectedUserId={selectedUserId}
        userTags={userTags}
        onSelect={handleSelectUser}
      />
      {renderChatArea()}
      {selectedUser && (
        <UserInfoPanel
          user={selectedUser}
          userTagIds={userTags[selectedUser.id] ?? []}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      )}
    </div>
  );
}
