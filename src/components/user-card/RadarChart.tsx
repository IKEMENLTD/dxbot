"use client";

import type { AxisScores } from "@/lib/types";
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RadarChartProps {
  scores: AxisScores;
  prevScores: AxisScores | null;
}

interface RadarDataPoint {
  axis: string;
  current: number;
  prev?: number;
}

const AXIS_LABELS: Record<string, string> = {
  a1: "A1(売上・請求)",
  a2: "A2(連絡・記録)",
  b: "B(繰り返し)",
  c: "C(データ)",
  d: "D(ツール)",
};

export default function RadarChartComponent({ scores, prevScores }: RadarChartProps) {
  const data: RadarDataPoint[] = (Object.keys(AXIS_LABELS) as Array<keyof AxisScores>).map((key) => {
    const point: RadarDataPoint = {
      axis: AXIS_LABELS[key],
      current: scores[key],
    };
    if (prevScores) {
      point.prev = prevScores[key];
    }
    return point;
  });

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 px-2">
        5軸スコア
      </h3>
      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#E5E8EB" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#4E5968", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 15]}
              tick={{ fill: "#8B95A1", fontSize: 10 }}
              axisLine={false}
            />
            {prevScores && (
              <Radar
                name="Before"
                dataKey="prev"
                stroke="#FB923C"
                fill="#FDBA74"
                fillOpacity={0.2}
                strokeWidth={1}
              />
            )}
            <Radar
              name="現在"
              dataKey="current"
              stroke="#16A34A"
              fill="#16A34A"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {prevScores && (
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#4E5968" }}
              />
            )}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
