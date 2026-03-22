"use client";

import { useState, useEffect } from "react";
import FunnelChart from "@/components/funnel/FunnelChart";
import WeeklyTrend from "@/components/funnel/WeeklyTrend";
import ExitCards from "@/components/funnel/ExitCards";
import LtvTracker from "@/components/funnel/LtvTracker";
import GoalProgress from "@/components/funnel/GoalProgress";
import {
  mockFunnelKpi,
  mockExitMetrics,
  mockDeals,
  mockUsers,
} from "@/lib/mock-data";
import type { FunnelKpi, ExitMetrics, Deal, User } from "@/lib/types";

interface KpiSummaryItem {
  label: string;
  value: number;
  suffix: string;
  color: string;
}

interface KpiApiResponse {
  data?: {
    funnel?: FunnelKpi[];
    exitMetrics?: ExitMetrics[];
  };
}

interface UsersApiResponse {
  data?: User[];
}

interface DealsApiResponse {
  data?: Deal[];
}

export default function FunnelPage() {
  const [funnelKpi, setFunnelKpi] = useState<FunnelKpi[]>(mockFunnelKpi);
  const [exitMetrics, setExitMetrics] = useState<ExitMetrics[]>(mockExitMetrics);
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/kpi", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() as Promise<KpiApiResponse> : null))
        .catch(() => null),
      fetch("/api/users", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() as Promise<UsersApiResponse> : null))
        .catch(() => null),
      fetch("/api/deals", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() as Promise<DealsApiResponse> : null))
        .catch(() => null),
    ]).then(([kpiJson, usersJson, dealsJson]) => {
      if (kpiJson?.data?.funnel) setFunnelKpi(kpiJson.data.funnel);
      if (kpiJson?.data?.exitMetrics) setExitMetrics(kpiJson.data.exitMetrics);
      if (usersJson?.data) setUsers(usersJson.data);
      if (dealsJson?.data) setDeals(dealsJson.data);
    }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Funnel] データ取得エラー:", err);
    }).finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <div className="h-5 w-32 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-3 w-48 bg-gray-100 animate-pulse rounded-2xl mt-2" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 h-64 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="col-span-2 h-64 bg-gray-100 animate-pulse rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-48 bg-gray-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  // 最新週のデータ
  const latestWeek = funnelKpi[funnelKpi.length - 1];

  // 今月の成約数（3月分を集計）
  const currentMonthConverted = funnelKpi
    .filter((w) => w.week.startsWith("3/"))
    .reduce((sum, w) => sum + w.converted, 0);

  // 今月の売上（3月開始のdeal合計）
  const currentMonthRevenue = deals
    .filter((d) => {
      const startMonth = new Date(d.started_at).getMonth();
      return startMonth === 2; // 3月 = index 2
    })
    .reduce((sum, d) => sum + d.deal_amount, 0);

  // KPIサマリ
  const kpiSummary: KpiSummaryItem[] = latestWeek
    ? [
        { label: "今週の流入", value: latestWeek.inflow, suffix: "人", color: "text-green-600" },
        { label: "今週の診断", value: latestWeek.diagnosed, suffix: "人", color: "text-green-700" },
        { label: "今週のCTA", value: latestWeek.cta_fired, suffix: "件", color: "text-orange-600" },
        { label: "今週の成約", value: latestWeek.converted, suffix: "件", color: "text-green-800" },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">ファネルKPI</h1>
        <p className="text-xs text-gray-500 mt-0.5">集客 → 成約の転換分析</p>
      </div>

      {/* KPIサマリカード 4枚 */}
      <div className="grid grid-cols-4 gap-4">
        {kpiSummary.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>
              {kpi.value}
              <span className="text-sm text-gray-400 ml-1 font-normal">{kpi.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 上段: ファネル図 (左60%) | 出口別カード (右40%) */}
      {latestWeek && (
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-600 mb-4">
              ファネル
            </p>
            <FunnelChart data={latestWeek} />
          </div>

          <div className="col-span-2">
            <p className="text-sm font-semibold text-gray-600 mb-3">
              出口別成約
            </p>
            <ExitCards data={exitMetrics} />
          </div>
        </div>
      )}

      {/* 中段: 週次推移グラフ (全幅) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-sm font-semibold text-gray-600 mb-4">
          週次トレンド（8週）
        </p>
        <WeeklyTrend data={funnelKpi} />
      </div>

      {/* 下段: LTV追跡 (左50%) | 目標進捗 (右50%) */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-600 mb-4">
            LTVトラッカー
          </p>
          <LtvTracker users={users} deals={deals} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-600 mb-4">
            今月の目標
          </p>
          <GoalProgress
            currentMonthConverted={currentMonthConverted}
            currentMonthRevenue={currentMonthRevenue}
          />
        </div>
      </div>
    </div>
  );
}
