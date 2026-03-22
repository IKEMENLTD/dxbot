"use client";

import type { ExitMetrics } from "@/lib/types";
import { EXIT_CONFIG } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ExitCardsProps {
  data: ExitMetrics[];
}

export default function ExitCards({ data }: ExitCardsProps) {
  return (
    <div className="space-y-3">
      {data.map((metric) => {
        const config = EXIT_CONFIG[metric.exit_type];
        return (
          <div
            key={metric.exit_type}
            className="bg-white rounded-2xl border border-gray-100 p-4"
          >
            <p className="text-xs text-gray-400 mb-1">{config.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {metric.count}
              <span className="text-sm text-gray-400 ml-1 font-normal">件</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(metric.revenue)}
            </p>
            {metric.subsidy_total > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                補助金: {formatCurrency(metric.subsidy_total)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
