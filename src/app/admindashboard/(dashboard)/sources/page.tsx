"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TrackingLink, TrackingPerformance, TrackingClickDetail, TrackingLinkUser } from "@/lib/types";
import { LEAD_SOURCE_LABELS } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

// ===== 定数 =====

const API_TIMEOUT_MS = 120000;

const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = Object.entries(
  LEAD_SOURCE_LABELS
).map(([value, label]) => ({ value, label }));

const FALLBACK_DESTINATION_URL = "https://lin.ee/";

// ===== API型定義 =====

interface LineSettingsResponse {
  friendUrl: string | null;
}

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

interface PerformanceApiResponse {
  data?: TrackingPerformance[];
  error?: string;
}

interface ClicksApiResponse {
  data?: TrackingClickDetail[];
  error?: string;
}

interface UsersApiResponse {
  data?: TrackingLinkUser[];
  error?: string;
}

// ===== ヘルパー =====

function getTrackingUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/track/${code}`;
  }
  return `/track/${code}`;
}

function getQrApiUrl(linkId: string): string {
  return `/api/tracking-links/${linkId}/qr`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
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

  // LINE友だち追加URL（動的取得）
  const [friendUrl, setFriendUrl] = useState<string | null>(null);
  const defaultDestUrl = friendUrl ?? FALLBACK_DESTINATION_URL;

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
  const [createDestUrl, setCreateDestUrl] = useState(FALLBACK_DESTINATION_URL);
  const [editLabel, setEditLabel] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // 送信中フラグ
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // パフォーマンス分析
  const [performance, setPerformance] = useState<TrackingPerformance[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [showClicksModal, setShowClicksModal] = useState(false);
  const [clicksData, setClicksData] = useState<TrackingClickDetail[]>([]);
  const [clicksLoading, setClicksLoading] = useState(false);
  const [clicksLinkLabel, setClicksLinkLabel] = useState("");

  // ユーザー一覧モーダル
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalData, setUsersModalData] = useState<TrackingLinkUser[]>([]);
  const [usersModalLoading, setUsersModalLoading] = useState(false);
  const [usersModalLabel, setUsersModalLabel] = useState("");

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

  // LINE設定からfriendUrlを取得
  const fetchFriendUrl = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(
        "/api/settings/line",
        { method: "GET" },
        API_TIMEOUT_MS
      );
      if (res.ok) {
        const json = (await res.json()) as LineSettingsResponse;
        if (json.friendUrl) {
          setFriendUrl(json.friendUrl);
          // まだデフォルト値のままなら動的URLに更新
          setCreateDestUrl((prev) =>
            prev === FALLBACK_DESTINATION_URL ? json.friendUrl as string : prev
          );
        }
      }
    } catch {
      // friendUrl取得失敗はフォールバックを使うだけなのでエラー表示不要
    }
  }, []);

  // パフォーマンスデータ取得
  const fetchPerformance = useCallback(async () => {
    setPerfLoading(true);
    try {
      const res = await fetchWithTimeout(
        "/api/tracking-links/performance",
        { method: "GET" },
        API_TIMEOUT_MS
      );
      if (res.ok) {
        const json = (await res.json()) as PerformanceApiResponse;
        if (json.data) {
          setPerformance(json.data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Sources] パフォーマンスデータ取得エラー:", err);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  // クリック詳細取得
  const fetchClicks = useCallback(async (linkId: string, label: string) => {
    setClicksLinkLabel(label);
    setShowClicksModal(true);
    setClicksLoading(true);
    setClicksData([]);
    try {
      const res = await fetchWithTimeout(
        `/api/tracking-links/${linkId}/clicks`,
        { method: "GET" },
        API_TIMEOUT_MS
      );
      if (res.ok) {
        const json = (await res.json()) as ClicksApiResponse;
        if (json.data) {
          setClicksData(json.data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Sources] クリック詳細取得エラー:", err);
      addToast("error", "クリック詳細の取得に失敗しました");
    } finally {
      setClicksLoading(false);
    }
  }, [addToast]);

  // ユーザー一覧取得
  const fetchLinkUsers = useCallback(async (linkId: string, label: string) => {
    setUsersModalLabel(label);
    setShowUsersModal(true);
    setUsersModalLoading(true);
    setUsersModalData([]);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`/api/tracking-links/${linkId}/users`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = (await res.json()) as UsersApiResponse;
        if (json.data) setUsersModalData(json.data);
      } else {
        addToast("error", "ユーザー一覧の取得に失敗しました");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      addToast("error", "ユーザー一覧の取得に失敗しました");
    } finally {
      setUsersModalLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    abortRef.current = new AbortController();
    fetchLinks();
    fetchFriendUrl();
    fetchPerformance();
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
    setCreateDestUrl(defaultDestUrl);
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

  // ===== 完全削除 =====

  const handleDeletePermanently = async (link: TrackingLink) => {
    if (!window.confirm(`「${link.label}」を完全に削除しますか？\nクリックデータも全て削除されます。この操作は取り消せません。`)) {
      return;
    }
    try {
      const res = await fetchWithTimeout(
        `/api/tracking-links/${link.id}?permanent=true`,
        { method: "DELETE" },
        API_TIMEOUT_MS
      );
      if (!res.ok) {
        const json = (await res.json()) as UpdateApiResponse;
        addToast("error", json.error ?? "削除に失敗しました");
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      addToast("success", "リンクを削除しました");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      addToast("error", "削除中にエラーが発生しました");
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
                        {/* 削除 */}
                        <button
                          type="button"
                          onClick={() => handleDeletePermanently(link)}
                          className="p-1.5 rounded-lg text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="完全に削除"
                          aria-label="完全に削除"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4.5H13M5.5 4.5V3.5C5.5 2.95 5.95 2.5 6.5 2.5H9.5C10.05 2.5 10.5 2.95 10.5 3.5V4.5M6.5 7V11.5M9.5 7V11.5M4.5 4.5L5 12.5C5 13.05 5.45 13.5 6 13.5H10C10.55 13.5 11 13.05 11 12.5L11.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
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

      {/* ===== パフォーマンス分析セクション ===== */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">流入元別パフォーマンス分析</h2>

        {/* KPIサマリカード */}
        {(() => {
          const totalClicks = performance.reduce((sum, p) => sum + p.clickCount, 0);
          const totalFollows = performance.reduce((sum, p) => sum + p.followCount, 0);
          const avgDiagRate = performance.length > 0
            ? Math.round(performance.reduce((sum, p) => sum + p.diagnosisRate, 0) / performance.length)
            : 0;
          const avgConvRate = performance.length > 0
            ? Math.round(performance.reduce((sum, p) => sum + p.conversionRate, 0) / performance.length)
            : 0;

          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">総クリック数</p>
                <p className="text-2xl font-bold text-green-600">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">総友だち追加数</p>
                <p className="text-2xl font-bold text-green-600">{totalFollows.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">平均診断完了率</p>
                <p className="text-2xl font-bold text-green-600">{avgDiagRate}%</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">平均成約率</p>
                <p className="text-2xl font-bold text-green-600">{avgConvRate}%</p>
              </div>
            </div>
          );
        })()}

        {/* パフォーマンステーブル */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ラベル</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">流入元</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">クリック</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">友だち追加</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">診断完了</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">CTA発火</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">成約</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">診断率</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">成約率</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">詳細</th>
                </tr>
              </thead>
              <tbody>
                {perfLoading && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      読み込み中...
                    </td>
                  </tr>
                )}
                {!perfLoading && performance.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      パフォーマンスデータがありません
                    </td>
                  </tr>
                )}
                {!perfLoading && performance.map((p) => (
                  <tr key={p.linkId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.label}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {LEAD_SOURCE_LABELS[p.leadSource] ?? p.leadSource}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{p.clickCount}</td>
                    <td className="px-4 py-3 text-center">
                      {p.followCount > 0 ? (
                        <button
                          onClick={() => fetchLinkUsers(p.linkId, p.label)}
                          className="font-bold text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                        >
                          {p.followCount}
                        </button>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.diagnosedCount}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.ctaFiredCount}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.convertedCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.diagnosisRate >= 50 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.diagnosisRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.conversionRate >= 10 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => fetchClicks(p.linkId, p.label)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="クリック詳細"
                        aria-label="クリック詳細を表示"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  placeholder={friendUrl ?? "https://lin.ee/..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {friendUrl
                    ? "LINE接続テストから自動取得した友だち追加URL"
                    : "デフォルト: LINE友だち追加URL"}
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

      {/* ===== クリック詳細モーダル ===== */}
      {showClicksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl mx-4 p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                クリック詳細: {clicksLinkLabel}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowClicksModal(false);
                  setClicksData([]);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="閉じる"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="overflow-auto flex-1">
              {clicksLoading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
              ) : clicksData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">クリックデータがありません</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">日時</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">デバイス</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">OS</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">ブラウザ</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">UTM Source</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">UTM Medium</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">UTM Campaign</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">UTM Content</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">リファラー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicksData.map((click) => (
                      <tr key={click.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {new Date(click.clickedAt).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{click.deviceType ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.os ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.browser ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.utmSource ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.utmMedium ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.utmCampaign ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{click.utmContent ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]" title={click.referer ?? ""}>
                          {click.referer ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowClicksModal(false);
                  setClicksData([]);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ユーザー一覧モーダル ===== */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowUsersModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  友だち追加ユーザー
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{usersModalLabel}</p>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="閉じる"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto p-5">
              {usersModalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-200 border-t-green-500 rounded-full" />
                </div>
              ) : usersModalData.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">
                  友だち追加ユーザーがいません
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">氏名</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">会社名</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">レベル</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">ステータス</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">追加日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersModalData.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <a
                            href={`/admindashboard/users/${u.id}`}
                            className="text-green-600 hover:text-green-700 hover:underline font-medium"
                          >
                            {u.preferred_name}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">
                          {u.company_name || '-'}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-gray-800">
                          {u.level}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {u.customer_status}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('ja-JP', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {usersModalData.length >= 100 && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  最新100件を表示しています
                </p>
              )}
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
                src={getQrApiUrl(qrLink.id)}
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
