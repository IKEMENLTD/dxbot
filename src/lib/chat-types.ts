export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;        // Object URL or remote URL
  name: string;
  size: number;        // bytes
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: 'user' | 'admin';
  content: string;
  timestamp: string;
  read: boolean;
  media?: MediaAttachment[];
}

export interface ContactPreview {
  userId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// ===== DB用メッセージ型 =====

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'sticker' | 'postback';

/** DBに保存されるchat_messagesの行型 */
export interface ChatMessageRow {
  id: string;
  user_id: string;
  sender: 'user' | 'admin';
  content: string;
  media_attachments: MediaAttachment[];
  direction: MessageDirection;
  line_user_id: string | null;
  line_message_id: string | null;
  message_type: MessageType;
  sent_at: string;
  read_at: string | null;
  created_at: string;
}

/** saveMessage の引数型 */
export interface SaveMessageParams {
  userId: string;
  lineUserId: string | null;
  direction: MessageDirection;
  content: string;
  messageType?: MessageType;
  lineMessageId?: string | null;
  mediaAttachments?: MediaAttachment[];
}

/** DBの ChatMessageRow をフロントエンドの ChatMessage に変換 */
export function toClientMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    sender: row.direction === 'inbound' ? 'user' : 'admin',
    content: row.content,
    timestamp: row.sent_at,
    read: row.read_at !== null,
    media: row.media_attachments.length > 0 ? row.media_attachments : undefined,
  };
}
