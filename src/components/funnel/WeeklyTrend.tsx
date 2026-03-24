"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FunnelKpi } from "@/lib/types";

interface WeeklyTrendProps {
  data: FunnelKpi[];
}

interface LineConfigItem {
  key: keyof Omit<FunnelKpi, "week">;
  label: string;
  color: string;
}

const LINE_CONFIG: LineConfigItem[] = [
  { key: "inflow", label: "流入", color: "#16A34A" },
  { key: "diagnosed", label: "診断", color: "#4ADE80" },
  { key: "step_started", label: "ステップ開始", color: "#86EFAC" },
  { key: "cta_fired", label: "CTA", color: "#EA580C" },
  { key: "meeting", label: "面談", color: "#FB923C" },
  { key: "converted", label: "成約", color: "#15803D" },
];

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}</span>
          <span className="text-gray-900 font-semibold ml-auto">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WeeklyTrend({ data }: WeeklyTrendProps) {
  return (
    <div>
      <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke="#E5E8EB" strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              stroke="#E5E8EB"
              tick={{ fontSize: 11, fill: "#8B95A1" }}
              axisLine={{ stroke: "#E5E8EB" }}
              tickLine={false}
            />
            <YAxis
              stroke="#E5E8EB"
              tick={{ fontSize: 11, fill: "#8B95A1" }}
              axisLine={{ stroke: "#E5E8EB" }}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            {LINE_CONFIG.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={line.key === "converted" ? 3 : 2}
                dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: line.color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pill型凡例 */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        {LINE_CONFIG.map((line) => (
          <div
            key={line.key}
            className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-xs text-gray-600">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
