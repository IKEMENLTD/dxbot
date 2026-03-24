"use client";

import { BADGE_CONFIG } from "@/lib/types";
import type { BadgeType } from "@/lib/types";

interface BadgeProps {
  type: BadgeType | null | undefined;
}

const FALLBACK_BADGE = { label: "不明", colorClass: "text-gray-500", bgClass: "bg-gray-100" } as const;

export default function Badge({ type }: BadgeProps) {
  if (!type) return null;
  const config = BADGE_CONFIG[type as BadgeType] ?? FALLBACK_BADGE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.colorClass} ${config.bgClass}`}
    >
      {config.label}
    </span>
  );
}
