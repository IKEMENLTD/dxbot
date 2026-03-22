/**
 * localStorage永続化ヘルパー
 * SSR対応（typeof window === 'undefined' のガード付き）
 */

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

/** localStorage keys */
export const STORAGE_KEYS = {
  TAGS: "dxbot_tags",
  LEAD_SOURCES: "dxbot_lead_sources",
  TEMPLATES: "dxbot_templates",
  EXITS: "dxbot_exits",
  STATUSES: "dxbot_statuses",
} as const;
