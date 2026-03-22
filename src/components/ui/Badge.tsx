"use client";

import { BADGE_CONFIG } from "@/lib/types";
import type { BadgeType } from "@/lib/types";

interface BadgeProps {
  type: BadgeType;
}

export default function Badge({ type }: BadgeProps) {
  const config = BADGE_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.colorClass} ${config.bgClass}`}
    >
      {config.label}
    </span>
  );
}
