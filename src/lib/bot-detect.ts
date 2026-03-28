/**
 * ボット/クローラー判定ユーティリティ
 * クライアント側・サーバー側の両方から利用可能
 */

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|googlebot|bingbot|yandexbot|baiduspider|bytespider|semrushbot|ahrefsbot|dotbot|rogerbot|embedly|quora link preview|showyoubot|outbrain|pinterest|applebot|duckduckbot|ia_archiver|prerender/i;

export function isBot(userAgent: string): boolean {
  return BOT_PATTERN.test(userAgent);
}
