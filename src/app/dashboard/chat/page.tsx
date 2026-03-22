"use client";

import { useState, useCallback, useMemo } from "react";
import ContactList from "@/components/chat/ContactList";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import UserInfoPanel from "@/components/chat/UserInfoPanel";
import { mockUsers } from "@/lib/mock-data";
import { mockMessages } from "@/lib/mock-messages";
import { EXIT_CONFIG } from "@/lib/types";
import type { ChatMessage, MediaAttachment } from "@/lib/chat-types";

function buildInitialTags(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const user of mockUsers) {
    result[user.id] = user.tags ?? [];
  }
  return result;
}

export default function ChatPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    mockUsers[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isSending, setIsSending] = useState(false);
  const [userTags, setUserTags] = useState<Record<string, string[]>>(
    buildInitialTags
  );

  const selectedUser = useMemo(
    () => mockUsers.find((u) => u.id === selectedUserId) ?? null,
    [selectedUserId]
  );

  const selectedMessages = useMemo(
    () =>
      selectedUserId
        ? messages.filter((m) => m.userId === selectedUserId)
        : [],
    [messages, selectedUserId]
  );

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setMessages((prev) =>
      prev.map((m) =>
        m.userId === userId && m.sender === "user" && !m.read
          ? { ...m, read: true }
          : m
      )
    );
  }, []);

  const handleSend = useCallback(
    async (text: string, media?: MediaAttachment[]) => {
      if (!selectedUserId || isSending) return;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: selectedUserId,
        sender: "admin",
        content: text,
        timestamp: new Date().toISOString(),
        read: false,
        media,
      };

      setMessages((prev) => [...prev, newMsg]);
      setIsSending(true);

      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            message: text,
          }),
        });
      } catch {
        // mock - ignore send errors
      } finally {
        setIsSending(false);
      }
    },
    [selectedUserId, isSending]
  );

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

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Left Pane: Contact List */}
      <ContactList
        users={mockUsers}
        messages={messages}
        selectedUserId={selectedUserId}
        userTags={userTags}
        onSelect={handleSelectUser}
      />

      {/* Center Pane: Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA]">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedUser.preferred_name.slice(0, 1)}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {selectedUser.preferred_name}
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    {selectedUser.company_name}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    EXIT_CONFIG[selectedUser.recommended_exit].bgClass
                  } ${EXIT_CONFIG[selectedUser.recommended_exit].colorClass}`}
                >
                  {EXIT_CONFIG[selectedUser.recommended_exit].label}
                </span>
              </div>
            </div>

            {/* Messages */}
            <MessageList messages={selectedMessages} />

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={isSending} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">
              ユーザーを選択してください
            </p>
          </div>
        )}
      </div>

      {/* Right Pane: User Info */}
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
