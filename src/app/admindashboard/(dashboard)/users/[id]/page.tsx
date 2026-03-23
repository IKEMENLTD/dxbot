"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import UserHeader from "@/components/user-card/UserHeader";
import RadarChartComponent from "@/components/user-card/RadarChart";
import StumbleHistory from "@/components/user-card/StumbleHistory";
import Timeline from "@/components/user-card/Timeline";
import LtvHistory from "@/components/user-card/LtvHistory";
import NotesActions from "@/components/user-card/NotesActions";
import { mockUsers, mockTimeline, mockStumbles, mockDeals } from "@/lib/mock-data";
import type { User, Deal, TimelineEvent, StumbleRecord } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface UserDetailData {
  user: User;
  deals: Deal[];
  timeline: TimelineEvent[];
  stumbles: StumbleRecord[];
}

function BackButton() {
  return (
    <Link
      href="/admindashboard"
      aria-label="リード管理に戻る"
      className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5m7-7l-7 7 7 7" />
      </svg>
      一覧に戻る
    </Link>
  );
}

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-[1400px] mx-auto p-6">
        <BackButton />
        <div className="mt-6 space-y-6">
          <div className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-100 animate-pulse rounded-2xl" />
            <div className="lg:col-span-3 h-64 bg-gray-100 animate-pulse rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-64 bg-gray-100 animate-pulse rounded-2xl" />
            <div className="lg:col-span-2 h-64 bg-gray-100 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserCardPage({ params }: PageProps) {
  const { id } = use(params);
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/users/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          addToast("error", "ユーザーが見つかりません");
          return null;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((json: { data?: UserDetailData } | null) => {
        if (!json) return;
        if (json.data) {
          setData(json.data);
        } else {
          // APIがデータを返さなかった場合、mockにfallback
          const mockUser = mockUsers.find((u) => u.id === id);
          if (!mockUser) {
            setNotFound(true);
            addToast("error", "ユーザーが見つかりません");
            return;
          }
          setData({
            user: mockUser,
            deals: mockDeals.filter((d) => d.user_id === id),
            timeline: mockTimeline.filter((e) => e.user_id === id),
            stumbles: mockStumbles.filter((s) => s.user_id === id),
          });
          addToast("warning", "APIからデータを取得できませんでした。オフラインモードで表示中です。");
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[UserCard] データ取得エラー:", err);
        // mockにfallback
        const mockUser = mockUsers.find((u) => u.id === id);
        if (!mockUser) {
          setNotFound(true);
          addToast("error", "ユーザーが見つかりません");
          return;
        }
        setData({
          user: mockUser,
          deals: mockDeals.filter((d) => d.user_id === id),
          timeline: mockTimeline.filter((e) => e.user_id === id),
          stumbles: mockStumbles.filter((s) => s.user_id === id),
        });
        addToast("warning", "データの取得に失敗しました。オフラインモードで表示中です。");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // データ再取得（NotesActionsの更新後に呼ばれる）
  const handleUserUpdated = useCallback(() => {
    const controller = new AbortController();

    fetch(`/api/users/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json: { data?: UserDetailData } | null) => {
        if (json?.data) {
          setData(json.data);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[UserCard] データ再取得エラー:", err);
      });
  }, [id]);

  if (loading) {
    return <SkeletonPage />;
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1400px] mx-auto p-6">
          <BackButton />
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-gray-400 text-sm">ID: {id} に該当するユーザーが見つかりません</p>
          </div>
        </div>
      </div>
    );
  }

  const { user, deals: userDeals, timeline: userTimeline, stumbles: userStumbles } = data;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Back button */}
        <div className="mb-6">
          <BackButton />
        </div>

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
              <NotesActions user={user} onUserUpdated={handleUserUpdated} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
