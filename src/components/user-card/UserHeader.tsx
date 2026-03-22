"use client";

import type { User } from "@/lib/types";
import { EXIT_CONFIG, STATUS_CONFIG, BADGE_CONFIG } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

interface UserHeaderProps {
  user: User;
}

const LEAD_SOURCE_LABEL: Record<string, string> = {
  apo: "APO",
  threads: "Threads",
  x: "X (Twitter)",
  instagram: "Instagram",
  referral: "紹介",
  other: "その他",
};

function getInitials(name: string): string {
  return name.slice(0, 1);
}

export default function UserHeader({ user }: UserHeaderProps) {
  const exitConfig = EXIT_CONFIG[user.recommended_exit];
  const statusConfig = STATUS_CONFIG[user.customer_status];
  const isTechstarsGrad = user.customer_status === "techstars_grad";

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-fade-in">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Avatar + Name / Company / Industry */}
        <div className="flex items-start gap-4">
          {/* Initial avatar */}
          <div className="flex items-center justify-center w-14 h-14 bg-gray-100 text-gray-600 rounded-full text-xl font-bold shrink-0">
            {getInitials(user.preferred_name)}
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user.preferred_name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.company_name} / {user.industry}
            </p>
            {user.last_completed_step && (
              <p className="text-xs text-gray-400 mt-1.5">
                最終ステップ: {user.last_completed_step}
                <span className="ml-2 text-gray-400">({timeAgo(user.last_action_at)})</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Level / Exit / Status / Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Level badge */}
          <div className="bg-gray-100 text-gray-700 rounded-xl px-4 py-1 font-bold text-lg">
            Lv.{user.level}
          </div>

          {/* Recommended exit pill */}
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${exitConfig.bgClass} ${exitConfig.colorClass}`}
          >
            {exitConfig.label}
            <span className="ml-1.5 text-xs opacity-70">Score {user.score}</span>
          </span>

          {/* Customer status pill */}
          <span className={`rounded-full bg-gray-100 px-3 py-1 text-xs font-medium ${statusConfig.colorClass}`}>
            {statusConfig.label}
          </span>

          {/* Badges */}
          {user.badges.map((badge) => {
            const badgeConfig = BADGE_CONFIG[badge];
            return (
              <span
                key={badge}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeConfig.bgClass} ${badgeConfig.colorClass}`}
              >
                {badgeConfig.label}
              </span>
            );
          })}

          {/* Steps completed */}
          <span className="text-xs text-gray-400">
            {user.steps_completed} steps
          </span>
        </div>
      </div>

      {/* Techstars grad card */}
      {isTechstarsGrad && (
        <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
          修了済 → 2段目推奨: {exitConfig.label}
        </div>
      )}

      {/* Lead source / note */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-gray-100 text-gray-500 px-3 py-1 text-xs font-medium">
          {LEAD_SOURCE_LABEL[user.lead_source] ?? user.lead_source}
        </span>
        {user.lead_note && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 max-w-[500px]">
            {user.lead_note}
          </div>
        )}
      </div>
    </section>
  );
}
