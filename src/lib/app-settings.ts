// ===== アプリ設定読み込みヘルパー =====
// DB優先 -> コードデフォルトフォールバック

import { getAppSetting } from './queries';

/**
 * 設定キー定数
 * 各Phaseで使用するキーを集約管理
 */
export const APP_SETTING_KEYS = {
  STEPS: 'steps',
  CTA_CONFIG: 'cta_config',
  REMINDER_CONFIG: 'reminder_config',
  DIAGNOSIS_CONFIG: 'diagnosis_config',
  RECOMMEND_WEIGHTS: 'recommend_weights',
  LINE_CONFIG: 'line_config',
  TAGS: 'tags',
  LEAD_SOURCES: 'lead_sources',
  TEMPLATES: 'templates',
  EXITS: 'exits',
  STATUSES: 'statuses',
} as const;

/** 設定キーのユニオン型 */
export type AppSettingKey = typeof APP_SETTING_KEYS[keyof typeof APP_SETTING_KEYS];

/**
 * DB優先で設定値を取得し、未設定時はデフォルト値にフォールバックする。
 *
 * @param key - 設定キー
 * @param defaultValue - DBに値がない場合のデフォルト値
 * @returns DB上の値またはデフォルト値
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const dbValue = await getAppSetting<T>(key);
    if (dbValue !== null) {
      return dbValue;
    }
    return defaultValue;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '設定値読み込み中にエラーが発生しました';
    console.error(`[getSetting] key=${key} エラー:`, msg);
    return defaultValue;
  }
}
