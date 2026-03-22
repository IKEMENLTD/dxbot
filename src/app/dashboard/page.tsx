"use client";

import { useState, useMemo } from "react";
import { mockUsers } from "@/lib/mock-data";
import type { User } from "@/lib/types";
import FilterBar from "@/components/dashboard/FilterBar";
import type { FilterState } from "@/components/dashboard/FilterBar";
import HotUsersTable from "@/components/dashboard/HotUsersTable";
import StatsCards from "@/components/dashboard/StatsCards";

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>({
    exit: "all",
    status: "all",
    leadSource: "all",
    techstarsGradOnly: false,
    search: "",
  });

  const filteredUsers = useMemo(() => {
    let result: User[] = mockUsers;

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
  }, [filters]);

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">熱い人リスト</h1>
        <p className="text-sm text-gray-500 mt-1">
          スコア順 -- 全ユーザー一覧
        </p>
      </div>

      {/* Stats cards */}
      <StatsCards />

      {/* Filter bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Table */}
      <HotUsersTable users={filteredUsers} />
    </div>
  );
}
