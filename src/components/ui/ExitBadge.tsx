"use client";

import { EXIT_CONFIG } from "@/lib/types";
import type { ExitType } from "@/lib/types";

interface ExitBadgeProps {
  type: ExitType;
}

export default function ExitBadge({ type }: ExitBadgeProps) {
  const config = EXIT_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.colorClass} ${config.bgClass}`}
    >
      {config.label}
    </span>
  );
}
