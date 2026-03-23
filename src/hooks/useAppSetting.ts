"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

/** フェッチタイムアウト（ミリ秒） */
const FETCH_TIMEOUT_MS = 20_000;

/** APIレスポンス型 */
interface ApiGetResponse<T> {
  data: T | null;
}

interface ApiPutResponse {
  success?: boolean;
  error?: string;
}

/** フックの返却型 */
interface UseAppSettingReturn<T> {
  value: T;
  setValue: (newValue: T) => void;
  /** DB保存。引数で値を直接渡すことも可能（setState前にsaveしたい場合） */
  save: (overrideValue?: T) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

/**
 * app_settings テーブルの1キーを読み書きするフック。
 *
 * - 初期ロード: GET /api/settings/app?key=xxx
 * - 保存: PUT /api/settings/app { key, value }
 * - フォールバック: localStorage (STORAGE_KEYS に対応するキーがあれば)
 * - AbortController + 20秒タイムアウト
 * - localStorageにデータがありDBが空の場合、初回保存時にDBへ移行
 *
 * @param key - app_settings のキー
 * @param defaultValue - DBにもlocalStorageにも値がない場合のデフォルト
 * @param localStorageKey - localStorageのキー（マイグレーション用フォールバック）
 */
export function useAppSetting<T>(
  key: string,
  defaultValue: T,
  localStorageKey?: string
): UseAppSettingReturn<T> {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const migratedRef = useRef(false);
  const valueRef = useRef<T>(defaultValue);
  const defaultValueRef = useRef<T>(defaultValue);

  // valueRefを常に最新に保つ
  valueRef.current = value;

  // 初期ロード
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function load() {
      try {
        const res = await fetch(`/api/settings/app?key=${encodeURIComponent(key)}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as ApiGetResponse<T>;

        if (json.data !== null && json.data !== undefined) {
          // DBに値がある
          setValue(json.data);
        } else {
          // DBに値がない -> localStorageフォールバック
          if (localStorageKey) {
            const localData = loadFromStorage<T | null>(localStorageKey, null);
            if (localData !== null) {
              setValue(localData);
              migratedRef.current = false; // 初回save時にDBに移行する
            } else {
              setValue(defaultValueRef.current);
            }
          } else {
            setValue(defaultValueRef.current);
          }
        }

        setError(null);
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof DOMException && err.name === "AbortError") {
          setError("設定の読み込みがタイムアウトしました");
        } else {
          const msg = err instanceof Error ? err.message : "設定の読み込みに失敗しました";
          setError(msg);
        }

        // API失敗時はlocalStorageフォールバック
        if (localStorageKey) {
          const localData = loadFromStorage<T | null>(localStorageKey, null);
          if (localData !== null) {
            setValue(localData);
          } else {
            setValue(defaultValueRef.current);
          }
        } else {
          setValue(defaultValueRef.current);
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [key, localStorageKey]);

  // 保存
  const save = useCallback(async (overrideValue?: T): Promise<{ success: boolean; error?: string }> => {
    const saveValue = overrideValue !== undefined ? overrideValue : valueRef.current;

    setSaving(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch("/api/settings/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: saveValue }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const json = (await res.json()) as ApiPutResponse;
        const errMsg = json.error ?? "設定の保存に失敗しました";
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      // DBに保存成功したらlocalStorageにも同期（フォールバック用）
      if (localStorageKey) {
        saveToStorage(localStorageKey, saveValue);
      }

      migratedRef.current = true;
      return { success: true };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      let errMsg: string;
      if (err instanceof DOMException && err.name === "AbortError") {
        errMsg = "設定の保存がタイムアウトしました";
      } else {
        errMsg = err instanceof Error ? err.message : "設定の保存に失敗しました";
      }

      setError(errMsg);

      // DB保存失敗時もlocalStorageには保存（データ消失防止）
      if (localStorageKey) {
        saveToStorage(localStorageKey, saveValue);
      }

      return { success: false, error: errMsg };
    } finally {
      setSaving(false);
    }
  }, [key, localStorageKey]);

  return { value, setValue, save, loading, saving, error };
}
