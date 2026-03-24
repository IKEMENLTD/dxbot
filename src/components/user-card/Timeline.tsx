"use client";

import type { TimelineEvent } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";

interface TimelineProps {
  events: TimelineEvent[];
}

function getTypeLabel(type: TimelineEvent["type"]): string {
  switch (type) {
    case "step_completed": return "完了";
    case "stumble": return "つまずき";
    case "cta_fired": return "CTA";
    case "status_change": return "変更";
    case "techstars_start": return "研修開始";
    case "techstars_complete": return "研修修了";
    case "rediagnosis": return "再診断";
    case "deal_created": return "成約";
    case "note_added": return "メモ";
    default: return "";
  }
}

export default function Timeline({ events }: TimelineProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        タイムライン
      </h3>
      <div className="space-y-0">
        {events.length === 0 && (
          <p className="text-sm text-gray-400 py-4">タイムラインはまだありません</p>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <span className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-2 py-0.5 shrink-0 w-16 text-center">
              {getTypeLabel(event.type)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-snug">
                {event.description}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDateTime(event.created_at)} ({timeAgo(event.created_at)})
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
