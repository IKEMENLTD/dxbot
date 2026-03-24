"use client";

import { useState, useEffect } from "react";
import FunnelChart from "@/components/funnel/FunnelChart";
import WeeklyTrend from "@/components/funnel/WeeklyTrend";
import ExitCards from "@/components/funnel/ExitCards";
import LtvTracker from "@/components/funnel/LtvTracker";
import GoalProgress from "@/components/funnel/GoalProgress";
import type { FunnelKpi, ExitMetrics, Deal, User } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

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
  const [funnelKpi, setFunnelKpi] = useState<FunnelKpi[]>([]);
  const [exitMetrics, setExitMetrics] = useState<ExitMetrics[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { addToast } = useToast();

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
      let anyDataLoaded = false;
      if (kpiJson?.data?.funnel) { setFunnelKpi(kpiJson.data.funnel); anyDataLoaded = true; }
      if (kpiJson?.data?.exitMetrics) { setExitMetrics(kpiJson.data.exitMetrics); anyDataLoaded = true; }
      if (usersJson?.data) { setUsers(usersJson.data); anyDataLoaded = true; }
      if (dealsJson?.data) { setDeals(dealsJson.data); anyDataLoaded = true; }
      setHasData(anyDataLoaded);
      if (!anyDataLoaded) {
        addToast("warning", "APIからデータを取得できませんでした。");
      }
    }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Funnel] データ取得エラー:", err);
      addToast("error", "データの取得に失敗しました。");
    }).finally(() => setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <div>
          <div className="h-5 w-32 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-3 w-48 bg-gray-100 animate-pulse rounded-2xl mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="col-span-1 md:col-span-1 lg:col-span-3 h-64 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="col-span-1 md:col-span-1 lg:col-span-2 h-64 bg-gray-100 animate-pulse rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="h-48 bg-gray-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  // 最新週のデータ
  const latestWeek = funnelKpi[funnelKpi.length - 1];

  // 現在の月を動的に取得
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentMonthStr = `${currentMonth + 1}/`; // "3/", "4/" etc.

  // 今月の成約数（当月分を集計）
  const currentMonthConverted = funnelKpi
    .filter((w) => w.week.startsWith(currentMonthStr))
    .reduce((sum, w) => sum + w.converted, 0);

  // 今月の売上（当月開始のdeal合計）
  const currentMonthRevenue = deals
    .filter((d) => {
      const startMonth = new Date(d.started_at).getMonth();
      return startMonth === currentMonth;
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
    <div className="p-6 space-y-6 animate-fade-in max-w-[1400px]">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">ファネルKPI</h1>
        <p className="text-xs text-gray-500 mt-0.5">集客 → 成約の転換分析</p>
      </div>

      {/* データなしメッセージ */}
      {!hasData && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
          <span className="text-sm text-gray-500">データがまだありません。LINE BOTに友だち追加されるとデータが蓄積されます。</span>
        </div>
      )}

      {/* KPIサマリカード 4枚 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-600 mb-4">
            ファネル
          </p>
          {latestWeek ? (
            <FunnelChart data={latestWeek} />
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">ファネルデータがありません</p>
          )}
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            出口別成約
          </p>
          <ExitCards data={exitMetrics} />
        </div>
      </div>

      {/* 中段: 週次推移グラフ (全幅) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-sm font-semibold text-gray-600 mb-4">
          週次トレンド（8週）
        </p>
        <WeeklyTrend data={funnelKpi} />
      </div>

      {/* 下段: LTV追跡 (左50%) | 目標進捗 (右50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
