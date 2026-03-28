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

const STAGE_COLORS = [
  "bg-gray-200",
  "bg-green-100",
  "bg-green-300",
  "bg-green-500",
  "bg-green-600",
  "bg-green-700",
];

const STAGE_TEXT_COLORS = [
  "text-gray-700",
  "text-green-800",
  "text-green-900",
  "text-white",
  "text-white",
  "text-white",
];

interface FunnelChartProps {
  data: FunnelKpi;
  stages?: FunnelStage[];
}

export default function FunnelChart({ data, stages }: FunnelChartProps) {
  const resolvedStages = stages ?? DEFAULT_STAGES;
  const maxValue = Math.max(
    ...resolvedStages.map((s) => data[s.key]),
    1
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">Week {data.week}</p>
      <div className="flex flex-col items-center gap-0">
        {resolvedStages.map((stage, index) => {
          const value = data[stage.key];
          const prevValue = index > 0 ? data[resolvedStages[index - 1].key] : 0;
          const conversionRate =
            index > 0
              ? prevValue > 0
                ? `${((value / prevValue) * 100).toFixed(0)}%`
                : "-"
              : "";
          const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const colorIndex = Math.min(index, STAGE_COLORS.length - 1);

          return (
            <div key={stage.key}>
              {/* ステージ間転換率 */}
              {index > 0 && (
                <div className="flex justify-center py-0.5">
                  <span className="text-gray-400" style={{ fontSize: "11px" }}>
                    {"\u2193"} {conversionRate}
                  </span>
                </div>
              )}

              {/* ステージバー */}
              <div className="flex items-center w-full gap-3">
                {/* Label */}
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">
                  {stage.label}
                </span>

                {/* Bar container */}
                <div className="flex-1 flex justify-center">
                  <div
                    className={`${STAGE_COLORS[colorIndex]} ${STAGE_TEXT_COLORS[colorIndex]} rounded-sm py-2 text-center text-xs font-semibold transition-all duration-700 ease-out`}
                    style={{
                      width: `${Math.max(widthPercent, 8)}%`,
                      minWidth: "40px",
                    }}
                  >
                    {value}
                  </div>
                </div>

                {/* 右側スペーサー（レイアウト揃え） */}
                <span className="w-10 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
