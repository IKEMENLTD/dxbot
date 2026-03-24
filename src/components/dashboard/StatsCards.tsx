"use client";

import { useState, useEffect, useMemo } from "react";
import type { User, Deal, FunnelKpi } from "@/lib/types";

interface StatCardData {
  label: string;
  value: number;
  highlight?: boolean;
}

interface StatsCardsProps {
  users: User[];
}

function StatCard({ label, value, highlight }: StatCardData) {
  return (
    <div className={`rounded-2xl px-5 py-5 animate-fade-in hover:shadow-sm transition-shadow ${
      highlight
        ? "bg-green-50 border border-green-100"
        : "bg-white border border-gray-100"
    }`}>
      <div className={`text-xs font-medium mb-1 ${highlight ? "text-green-600" : "text-gray-400"}`}>{label}</div>
      <div className={`text-2xl font-bold animate-count-up ${highlight ? "text-green-700" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

interface KpiData {
  deals: Deal[];
  ctaFiredCount: number;
  funnelKpi: FunnelKpi[];
}

interface KpiApiResponse {
  data?: {
    funnel?: FunnelKpi[];
    ctaFiredCount?: number;
  };
}

interface DealsApiResponse {
  data?: Deal[];
}

export default function StatsCards({ users }: StatsCardsProps) {
  const [kpiData, setKpiData] = useState<KpiData>({
    deals: [],
    ctaFiredCount: 0,
    funnelKpi: [],
  });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/deals", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() as Promise<DealsApiResponse> : null))
        .then((json) => json?.data ?? [])
        .catch(() => [] as Deal[]),
      fetch("/api/kpi", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() as Promise<KpiApiResponse> : null))
        .catch(() => null),
    ]).then(([deals, kpiJson]) => {
      if (!controller.signal.aborted) {
        setKpiData({
          deals: Array.isArray(deals) ? deals : [],
          ctaFiredCount: kpiJson?.data?.ctaFiredCount ?? 0,
          funnelKpi: Array.isArray(kpiJson?.data?.funnel) ? kpiJson.data.funnel : [],
        });
      }
    }).catch(() => {
      // abort含む全エラーをキャッチ
    });

    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const ctaFired = kpiData.ctaFiredCount;
    const latestWeek = kpiData.funnelKpi[kpiData.funnelKpi.length - 1];
    const weeklyInflow = latestWeek ? latestWeek.inflow : 0;
    const completedDeals = kpiData.deals.filter((d) => d.status === "completed").length;

    return { totalUsers, weeklyInflow, ctaFired, completedDeals };
  }, [users, kpiData]);

  const cards: StatCardData[] = [
    { label: "池の総人数", value: stats.totalUsers },
    { label: "今週の流入数", value: stats.weeklyInflow },
    { label: "CTA発火中", value: stats.ctaFired },
    { label: "成約件数", value: stats.completedDeals, highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
