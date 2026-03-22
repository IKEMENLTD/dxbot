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
