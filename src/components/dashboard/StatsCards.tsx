"use client";

import { useMemo } from "react";
import { mockUsers, mockCtaHistory, mockFunnelKpi, mockDeals } from "@/lib/mock-data";

interface StatCardData {
  label: string;
  value: number;
  highlight?: boolean;
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

function computeStats() {
  const totalUsers = mockUsers.length;
  const ctaFired = mockCtaHistory.length;
  const latestWeek = mockFunnelKpi[mockFunnelKpi.length - 1];
  const weeklyInflow = latestWeek ? latestWeek.inflow : 0;
  const completedDeals = mockDeals.filter((d) => d.status === "completed").length;

  return { totalUsers, weeklyInflow, ctaFired, completedDeals };
}

export default function StatsCards() {
  const stats = useMemo(() => computeStats(), []);

  const cards: StatCardData[] = [
    { label: "池の総人数", value: stats.totalUsers },
    { label: "今週の流入数", value: stats.weeklyInflow },
    { label: "CTA発火中", value: stats.ctaFired },
    { label: "成約件数", value: stats.completedDeals, highlight: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-5">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
