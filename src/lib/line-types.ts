// ===== LINE Messaging API 型定義 =====

/** LINE Webhook ボディ */
export interface WebhookBody {
  destination: string;
  events: WebhookEvent[];
}

/** Webhookイベント共通 */
interface BaseEvent {
  replyToken?: string;
  timestamp: number;
  source: EventSource;
  mode: 'active' | 'standby';
}

/** イベントソース */
export interface EventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

/** 友達追加イベント */
export interface FollowEvent extends BaseEvent {
  type: 'follow';
  replyToken: string;
}

/** ブロック解除イベント */
export interface UnfollowEvent extends BaseEvent {
  type: 'unfollow';
}

/** テキストメッセージイベント */
export interface TextMessageEvent extends BaseEvent {
  type: 'message';
  replyToken: string;
  message: {
    id: string;
    type: 'text';
    text: string;
  };
}

/** Postbackイベント（ボタンタップ） */
export interface PostbackEvent extends BaseEvent {
  type: 'postback';
  replyToken: string;
  postback: {
    data: string;
  };
}

/** 対応するWebhookイベントの合体型 */
export type WebhookEvent =
  | FollowEvent
  | UnfollowEvent
  | TextMessageEvent
  | PostbackEvent;

/** LINE プロフィール */
export interface LineProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

/** テキストメッセージ */
export interface TextMessage {
  type: 'text';
  text: string;
  quickReply?: QuickReply;
}

/** Flex メッセージ */
export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
}

/** QuickReply */
export interface QuickReply {
  items: QuickReplyItem[];
}

export interface QuickReplyItem {
  type: 'action';
  action: PostbackAction | MessageAction;
}

export interface PostbackAction {
  type: 'postback';
  label: string;
  data: string;
  displayText?: string;
}

export interface MessageAction {
  type: 'message';
  label: string;
  text: string;
}

/** Flex Container (bubble) */
export interface FlexContainer {
  type: 'bubble';
  header?: FlexBox;
  hero?: FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
}

/** Flex Box */
export interface FlexBox {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  backgroundColor?: string;
}

/** Flex コンポーネント */
export type FlexComponent = FlexTextComponent | FlexButtonComponent | FlexBox | FlexSeparator;

export interface FlexTextComponent {
  type: 'text';
  text: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  align?: string;
  margin?: string;
}

export interface FlexButtonComponent {
  type: 'button';
  action: PostbackAction | MessageAction | UriAction;
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  height?: string;
  margin?: string;
}

export interface UriAction {
  type: 'uri';
  label: string;
  uri: string;
}

export interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

/** 画像メッセージ */
export interface ImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
}

/** 送信メッセージ型（テキスト or Flex or Image） */
export type LineMessage = TextMessage | FlexMessage | ImageMessage;

/** Reply API リクエスト */
export interface ReplyMessageRequest {
  replyToken: string;
  messages: LineMessage[];
}

/** Push API リクエスト */
export interface PushMessageRequest {
  to: string;
  messages: LineMessage[];
}
