"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TrackingLink, LeadSource } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

// ===== 定数 =====

const API_TIMEOUT_MS = 120000;

const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "apo", label: "APO" },
  { value: "threads", label: "Threads" },
  { value: "x", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "紹介" },
  { value: "other", label: "その他" },
];

const LEAD_SOURCE_LABELS: Record<string, string> = {
  apo: "APO",
  threads: "Threads",
  x: "X (Twitter)",
  instagram: "Instagram",
  referral: "紹介",
  other: "その他",
};

const DEFAULT_DESTINATION_URL = "https://lin.ee/";

// ===== API型定義 =====

interface LinksApiResponse {
  data?: TrackingLink[];
  error?: string;
}

interface CreateApiResponse {
  data?: TrackingLink;
  error?: string;
}

interface UpdateApiResponse {
  data?: { id: string; label?: string; is_active?: boolean };
  error?: string;
}

// ===== ヘルパー =====

function getTrackingUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/track/${code}`;
  }
  return `/track/${code}`;
}

function getQrImageUrl(url: string): string {
  return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedSignal = options.signal
    ? options.signal
    : controller.signal;

  try {
    const response = await fetch(url, {
      ...options,
      signal: mergedSignal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== コンポーネント =====

export default function SourcesPage() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const { addToast } = useToast();

  // モーダル状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingLink, setEditingLink] = useState<TrackingLink | null>(null);
  const [qrLink, setQrLink] = useState<TrackingLink | null>(null);

  // フォーム状態
  const [createLabel, setCreateLabel] = useState("");
  const [createLeadSource, setCreateLeadSource] = useState<string>("apo");
  const [createCustomSource, setCreateCustomSource] = useState("");
  const [createDestUrl, setCreateDestUrl] = useState(DEFAULT_DESTINATION_URL);
  const [editLabel, setEditLabel] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // 送信中フラグ
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ===== データ取得 =====

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(
        "/api/tracking-links",
        { method: "GET" },
        API_TIMEOUT_MS
      );

      if (!res.ok) {
        throw new Error("API エラー");
      }

      const json = (await res.json()) as LinksApiResponse;
      if (json.data) {
        setLinks(json.data);
        setIsOffline(false);
      } else {
        setIsOffline(true);
        addToast("warning", "データを取得できませんでした。オフラインモードで表示中です。");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Sources] データ取得エラー:", err);
      setIsOffline(true);
      addToast("warning", "データの取得に失敗しました。オフラインモードで表示中です。");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    abortRef.current = new AbortController();
    fetchLinks();
    return () => {
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 作成 =====

  const handleCreate = async () => {
    const leadSource = createLeadSource === "custom" ? createCustomSource.trim() : createLeadSource;

    if (!createLabel.trim()) {
      addToast("error", "ラベルを入力してください");
      return;
    }
    if (!leadSource) {
      addToast("error", "流入元を選択または入力してください");
      return;
    }
    if (!createDestUrl.trim()) {
      addToast("error", "遷移先URLを入力してください");
      return;
    }

    setCreating(true);
    try {
      const res = await fetchWithTimeout(
        "/api/tracking-links",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: createLabel.trim(),
            lead_source: leadSource,
            destination_url: createDestUrl.trim(),
          }),
        },
        API_TIMEOUT_MS
      );

      const json = (await res.json()) as CreateApiResponse;

      if (!res.ok || !json.data) {
        addToast("error", json.error ?? "リンクの作成に失敗しました");
        return;
      }

      setLinks((prev) => [json.data as TrackingLink, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
      addToast("success", "トラッキングリンクを作成しました");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "リンク作成中にエラーが発生しました";
      addToast("error", msg);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateLabel("");
    setCreateLeadSource("apo");
    setCreateCustomSource("");
    setCreateDestUrl(DEFAULT_DESTINATION_URL);
  };

  // ===== 編集 =====

  const openEditModal = (link: TrackingLink) => {
    setEditingLink(link);
    setEditLabel(link.label);
    setEditIsActive(link.is_active);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingLink) return;
    if (!editLabel.trim()) {
      addToast("error", "ラベルを入力してください");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetchWithTimeout(
        `/api/tracking-links/${editingLink.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editLabel.trim(),
            is_active: editIsActive,
          }),
        },
        API_TIMEOUT_MS
      );

      const json = (await res.json()) as UpdateApiResponse;

      if (!res.ok) {
        addToast("error", json.error ?? "リンクの更新に失敗しました");
        return;
      }

      setLinks((prev) =>
        prev.map((l) =>
          l.id === editingLink.id
            ? { ...l, label: editLabel.trim(), is_active: editIsActive, updated_at: new Date().toISOString() }
            : l
        )
      );
      setShowEditModal(false);
      setEditingLink(null);
      addToast("success", "トラッキングリンクを更新しました");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "リンク更新中にエラーが発生しました";
      addToast("error", msg);
    } finally {
      setUpdating(false);
    }
  };

  // ===== 有効/無効トグル =====

  const handleToggleActive = async (link: TrackingLink) => {
    try {
      if (link.is_active) {
        // 無効化 = DELETE
        const res = await fetchWithTimeout(
          `/api/tracking-links/${link.id}`,
          { method: "DELETE" },
          API_TIMEOUT_MS
        );

        if (!res.ok) {
          const json = (await res.json()) as UpdateApiResponse;
          addToast("error", json.error ?? "無効化に失敗しました");
          return;
        }

        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, is_active: false } : l))
        );
        addToast("success", "リンクを無効化しました");
      } else {
        // 有効化 = PATCH
        const res = await fetchWithTimeout(
          `/api/tracking-links/${link.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: true }),
          },
          API_TIMEOUT_MS
        );

        if (!res.ok) {
          const json = (await res.json()) as UpdateApiResponse;
          addToast("error", json.error ?? "有効化に失敗しました");
          return;
        }

        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, is_active: true } : l))
        );
        addToast("success", "リンクを有効化しました");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "ステータス変更中にエラーが発生しました";
      addToast("error", msg);
    }
  };

  // ===== コピー =====

  const handleCopyUrl = async (code: string) => {
    const url = getTrackingUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      addToast("success", "URLをコピーしました");
    } catch {
      addToast("error", "コピーに失敗しました");
    }
  };

  // ===== QRモーダル =====

  const openQrModal = (link: TrackingLink) => {
    setQrLink(link);
    setShowQrModal(true);
  };

  // ===== ローディング =====

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <div>
          <div className="h-5 w-32 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-3 w-48 bg-gray-100 animate-pulse rounded-2xl mt-2" />
        </div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  // ===== レンダー =====

  return (
    <>
    <div className="p-6 space-y-6 animate-fade-in max-w-[1400px]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">流入元管理</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            トラッキングリンクの発行とクリック計測
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          新規リンク作成
        </button>
      </div>

      {/* オフライン表示 */}
      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-700">オフラインモード</span>
          <span className="text-xs text-amber-600">-- モックデータを表示中です</span>
        </div>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">ラベル</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">流入元</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">コード</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">リンクURL</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">クリック数</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">状態</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    トラッキングリンクがありません。「新規リンク作成」から追加してください。
                  </td>
                </tr>
              )}
              {links.map((link) => {
                const trackUrl = getTrackingUrl(link.code);
                return (
                  <tr
                    key={link.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !link.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{link.label}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {LEAD_SOURCE_LABELS[link.lead_source] ?? link.lead_source}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {link.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 truncate block max-w-[200px]" title={trackUrl}>
                        {trackUrl}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-green-600">{link.click_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          link.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {link.is_active ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* コピー */}
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(link.code)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="URLコピー"
                          aria-label="URLをコピー"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M3 11V3.5C3 2.67 3.67 2 4.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {/* QR */}
                        <button
                          type="button"
                          onClick={() => openQrModal(link)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="QRコード"
                          aria-label="QRコードを表示"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                            <rect x="10" y="10" width="3" height="3" rx="0.5" fill="currentColor"/>
                          </svg>
                        </button>
                        {/* 編集 */}
                        <button
                          type="button"
                          onClick={() => openEditModal(link)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="編集"
                          aria-label="編集"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5L13.5 4.5L5.5 12.5L2.5 13.5L3.5 10.5L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* 有効/無効トグル */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(link)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            link.is_active
                              ? "text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                              : "text-green-400 hover:text-green-600 hover:bg-green-50"
                          }`}
                          title={link.is_active ? "無効化" : "有効化"}
                          aria-label={link.is_active ? "無効化" : "有効化"}
                        >
                          {link.is_active ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5.5 5.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    {/* ===== モーダル（コンテナ外に配置） ===== */}

      {/* ===== 作成モーダル ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">新規トラッキングリンク</h2>

            <div className="space-y-4">
              {/* ラベル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ラベル
                </label>
                <input
                  type="text"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  placeholder="例: LINE広告（3月）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* 流入元 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  流入元
                </label>
                <select
                  value={createLeadSource}
                  onChange={(e) => setCreateLeadSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {LEAD_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom">カスタム入力</option>
                </select>
                {createLeadSource === "custom" && (
                  <input
                    type="text"
                    value={createCustomSource}
                    onChange={(e) => setCreateCustomSource(e.target.value)}
                    placeholder="流入元を入力"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
              </div>

              {/* 遷移先URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  遷移先URL
                </label>
                <input
                  type="url"
                  value={createDestUrl}
                  onChange={(e) => setCreateDestUrl(e.target.value)}
                  placeholder="https://lin.ee/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  デフォルト: LINE友だち追加URL
                </p>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 編集モーダル ===== */}
      {showEditModal && editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">リンク編集</h2>

            <div className="space-y-4">
              {/* ラベル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ラベル
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* 有効/無効 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="edit-active"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="accent-green-600"
                    />
                    有効
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="edit-active"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="accent-green-600"
                    />
                    無効
                  </label>
                </div>
              </div>

              {/* 読み取り情報 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">コード: {editingLink.code}</p>
                <p className="text-xs text-gray-400 mt-1">遷移先: {editingLink.destination_url}</p>
                <p className="text-xs text-gray-400 mt-1">クリック数: {editingLink.click_count}</p>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLink(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {updating ? "更新中..." : "更新"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QRコードモーダル ===== */}
      {showQrModal && qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">QRコード</h2>

            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-gray-700">{qrLink.label}</p>

              {/* QR画像 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getQrImageUrl(getTrackingUrl(qrLink.code))}
                alt={`QRコード: ${qrLink.label}`}
                width={200}
                height={200}
                className="border border-gray-200 rounded-lg"
              />

              {/* URL表示 */}
              <div className="w-full bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 break-all text-center">
                  {getTrackingUrl(qrLink.code)}
                </p>
              </div>

              {/* コピーボタン */}
              <button
                type="button"
                onClick={() => handleCopyUrl(qrLink.code)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                URLをコピー
              </button>
            </div>

            {/* 閉じるボタン */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setQrLink(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
