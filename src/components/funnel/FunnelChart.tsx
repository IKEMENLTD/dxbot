"use client";

import type { FunnelKpi } from "@/lib/types";

export interface FunnelStage {
  key: keyof Omit<FunnelKpi, "week">;
  label: string;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { key: "inflow", label: "流入" },
  { key: "diagnosed", label: "診断" },
  { key: "step_started", label: "ステップ開始" },
  { key: "cta_fired", label: "CTA" },
  { key: "meeting", label: "面談" },
  { key: "converted", label: "成約" },
];

interface FunnelChartProps {
  data: FunnelKpi;
  stages?: FunnelStage[];
}

export default function FunnelChart({ data, stages }: FunnelChartProps) {
  const resolvedStages = stages ?? DEFAULT_STAGES;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">Week {data.week}</p>
      <div className="space-y-0">
        {resolvedStages.map((stage, index) => {
          const value = data[stage.key];
          const prevValue = index > 0 ? data[resolvedStages[index - 1].key] : null;
          const conversionRate =
            prevValue !== null && prevValue > 0
              ? `${((value / prevValue) * 100).toFixed(0)}%`
              : "";

          return (
            <div key={stage.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500 w-28">{stage.label}</span>
              <span className="text-lg font-semibold text-gray-900">{value}</span>
              <span className="text-xs text-gray-400 w-12 text-right">{conversionRate}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
