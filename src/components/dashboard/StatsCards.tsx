"use client";

import { useState, useEffect, useMemo } from "react";
import type { User, Deal, FunnelKpi } from "@/lib/types";

interface StatCardData {
  label: string;
  value: number;
  diff: number | null;
  highlight?: boolean;
}

interface StatsCardsProps {
  users: User[];
}

function TrendIndicator({ diff }: { diff: number | null }) {
  if (diff === null) return null;

  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-green-600 ml-2">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-0.5">
          <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
        </svg>
        +{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-500 ml-2">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-0.5">
          <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
        </svg>
        {diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium text-gray-400 ml-2">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-0.5">
        <path d="M2 5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      0
    </span>
  );
}

function StatCard({ label, value, diff, highlight }: StatCardData) {
  return (
    <div className={`rounded-2xl px-5 py-5 animate-fade-in hover:shadow-sm transition-shadow ${
      highlight
        ? "bg-green-50 border border-green-100"
        : "bg-white border border-gray-100"
    }`}>
      <div className={`text-xs font-medium mb-1 ${highlight ? "text-green-600" : "text-gray-400"}`}>{label}</div>
      <div className="flex items-baseline">
        <div className={`text-2xl font-bold animate-count-up ${highlight ? "text-green-700" : "text-gray-900"}`}>{value}</div>
        <TrendIndicator diff={diff} />
      </div>
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
    const funnelLen = kpiData.funnelKpi.length;
    const latestWeek = funnelLen > 0 ? kpiData.funnelKpi[funnelLen - 1] : null;
    const prevWeek = funnelLen > 1 ? kpiData.funnelKpi[funnelLen - 2] : null;
    const weeklyInflow = latestWeek ? latestWeek.inflow : 0;
    const completedDeals = kpiData.deals.filter((d) => d.status === "completed").length;

    // 前週比較の差分計算
    const inflowDiff = latestWeek && prevWeek ? latestWeek.inflow - prevWeek.inflow : null;
    const ctaDiff = latestWeek && prevWeek ? latestWeek.cta_fired - prevWeek.cta_fired : null;
    const convertedDiff = latestWeek && prevWeek ? latestWeek.converted - prevWeek.converted : null;

    return { totalUsers, weeklyInflow, ctaFired, completedDeals, inflowDiff, ctaDiff, convertedDiff };
  }, [users, kpiData]);

  const cards: StatCardData[] = [
    { label: "リード総数", value: stats.totalUsers, diff: null },
    { label: "今週の流入数", value: stats.weeklyInflow, diff: stats.inflowDiff },
    { label: "CTA発火中", value: stats.ctaFired, diff: stats.ctaDiff },
    { label: "成約件数", value: stats.completedDeals, diff: stats.convertedDiff, highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
