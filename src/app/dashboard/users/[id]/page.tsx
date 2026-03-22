"use client";

import { use } from "react";
import Link from "next/link";
import UserHeader from "@/components/user-card/UserHeader";
import RadarChartComponent from "@/components/user-card/RadarChart";
import StumbleHistory from "@/components/user-card/StumbleHistory";
import Timeline from "@/components/user-card/Timeline";
import LtvHistory from "@/components/user-card/LtvHistory";
import NotesActions from "@/components/user-card/NotesActions";
import { mockUsers, mockTimeline, mockStumbles, mockDeals } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserCardPage({ params }: PageProps) {
  const { id } = use(params);
  const user = mockUsers.find((u) => u.id === id);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1400px] mx-auto p-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
            一覧に戻る
          </Link>
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-gray-400 text-sm">ID: {id} に該当するユーザーが見つかりません</p>
          </div>
        </div>
      </div>
    );
  }

  const userTimeline = mockTimeline.filter((e) => e.user_id === user.id);
  const userStumbles = mockStumbles.filter((s) => s.user_id === user.id);
  const userDeals = mockDeals.filter((d) => d.user_id === user.id);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
          一覧に戻る
        </Link>

        <main className="space-y-6">
          {/* Row 1: UserHeader (full width) */}
          <UserHeader user={user} />

          {/* Row 2: RadarChart (40%) | StumbleHistory (60%) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <RadarChartComponent
                scores={user.axis_scores}
                prevScores={user.prev_scores}
              />
            </div>
            <div className="lg:col-span-3">
              <StumbleHistory stumbles={userStumbles} user={user} />
            </div>
          </div>

          {/* Row 3: Timeline (60%) | LtvHistory + NotesActions (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <Timeline events={userTimeline} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <LtvHistory deals={userDeals} />
              <NotesActions user={user} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
