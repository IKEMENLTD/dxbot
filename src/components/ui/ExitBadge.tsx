"use client";

import { EXIT_CONFIG } from "@/lib/types";
import type { ExitType } from "@/lib/types";

interface ExitBadgeProps {
  type: ExitType | null | undefined;
}

const FALLBACK_EXIT = { label: "未設定", colorClass: "text-gray-500", bgClass: "bg-gray-100" } as const;

export default function ExitBadge({ type }: ExitBadgeProps) {
  if (!type) return null;
  const config = EXIT_CONFIG[type as ExitType] ?? FALLBACK_EXIT;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.colorClass} ${config.bgClass}`}
    >
      {config.label}
    </span>
  );
}
