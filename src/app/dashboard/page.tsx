"use client";

import { useState, useEffect, useMemo } from "react";
import { mockUsers } from "@/lib/mock-data";
import type { User } from "@/lib/types";
import FilterBar from "@/components/dashboard/FilterBar";
import type { FilterState } from "@/components/dashboard/FilterBar";
import HotUsersTable from "@/components/dashboard/HotUsersTable";
import StatsCards from "@/components/dashboard/StatsCards";

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    exit: "all",
    status: "all",
    leadSource: "all",
    techstarsGradOnly: false,
    search: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/users", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((json: { data?: User[] }) => {
        setUsers(json.data ?? mockUsers);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[Dashboard] データ取得エラー:", err);
        setUsers(mockUsers);
        setError("データの取得に失敗しました。モックデータを表示中です。");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

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
      result = result.filter((u) => u.badges.includes("techstars_grad"));
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.preferred_name.toLowerCase().includes(q) ||
          u.company_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filters, users]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-[1400px]">
        <div>
          <div className="h-6 w-40 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-4 w-60 bg-gray-100 animate-pulse rounded-2xl mt-2" />
        </div>
        <div className="grid grid-cols-4 gap-5">
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
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">熱い人リスト</h1>
        <p className="text-sm text-gray-500 mt-1">
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

      {/* Filter bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Table */}
      <HotUsersTable users={filteredUsers} />
    </div>
  );
}
