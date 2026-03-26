"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import type { User } from "@/lib/types";
import FilterBar from "@/components/dashboard/FilterBar";
import type { FilterState } from "@/components/dashboard/FilterBar";
import HotUsersTable from "@/components/dashboard/HotUsersTable";
import StatsCards from "@/components/dashboard/StatsCards";
import TodayActions from "@/components/dashboard/TodayActions";
import { useToast } from "@/contexts/ToastContext";

const AUTO_REFRESH_INTERVAL = 60_000;

function StepCard({
  number,
  title,
  description,
  href,
}: {
  number: number;
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-green-300 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const { addToast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    exit: "all",
    status: "all",
    leadSource: "all",
    techstarsGradOnly: false,
    search: "",
  });

  const fetchUsers = useCallback((signal?: AbortSignal) => {
    return fetch("/api/users", { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((json: { data?: User[] }) => {
        if (json.data && json.data.length > 0) {
          setUsers(json.data);
        } else {
          setUsers([]);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[Dashboard] データ取得エラー:", err);
        setUsers([]);
        setError("データの取得に失敗しました。");
      });
  }, []);

  // Initial fetch
  useEffect(() => {
    const controller = new AbortController();

    fetchUsers(controller.signal)
      .then(() => {
        // success already handled
      })
      .catch(() => {
        addToast("error", "データの取得に失敗しました。");
      })
      .finally(() => {
        setNow(Date.now());
        setLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 60 seconds (skip when tab is hidden)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    refreshRef.current = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchUsers();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current);
      }
    };
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result: User[] = users;

    if (filters.exit !== "all") {
      result = result.filter((u) => u.recommended_exit === filters.exit);
    }
    if (filters.status !== "all") {
      result = result.filter((u) => u.customer_status === filters.status);
    }
    if (filters.leadSource !== "all") {
      result = result.filter((u) => u.lead_source === filters.leadSource);
    }
    if (filters.techstarsGradOnly) {
      result = result.filter((u) => (u.badges ?? []).includes("techstars_grad"));
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          (u.preferred_name ?? "").toLowerCase().includes(q) ||
          (u.company_name ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [filters, users]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in max-w-[1400px]">
        <div>
          <div className="h-5 w-40 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-3 w-60 bg-gray-100 animate-pulse rounded-2xl mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-12 bg-gray-100 animate-pulse rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">リード管理</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          スコア順 -- 全ユーザー一覧
        </p>
      </div>

      {/* エラー通知 */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <StatsCards users={users} />

      {/* Today's actions */}
      <TodayActions users={users} now={now} />

      {/* Empty state onboarding */}
      {users.length === 0 && !loading && (
        <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">DXBOTへようこそ</h3>
          <p className="text-sm text-gray-500 mb-6">まずは以下の手順でセットアップを完了してください</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <StepCard
              number={1}
              title="LINE BOTを設定"
              description="設定 → LINE連携タブで認証情報を保存"
              href="/admindashboard/settings"
            />
            <StepCard
              number={2}
              title="トラッキングリンクを作成"
              description="流入元管理でリンクを発行"
              href="/admindashboard/sources"
            />
            <StepCard
              number={3}
              title="友だち追加を促す"
              description="リンクやQRコードをSNS等で共有"
            />
          </div>
        </section>
      )}

      {/* Filter bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Table */}
      <HotUsersTable users={filteredUsers} />
    </div>
  );
}
