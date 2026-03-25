"use client";

import Link from "next/link";
import { Bell, MousePointerClick, Clock, UserPlus, CheckCircle } from "lucide-react";
import type { User, BadgeType } from "@/lib/types";

interface TodayActionsProps {
  users: User[];
  /** 現在時刻(ms)。親コンポーネントからuseEffect経由で渡す */
  now: number;
}

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  count: number;
  userIds: string[];
  colorClass: string;
  bgClass: string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function hasCtaBadge(badges: BadgeType[]): boolean {
  return badges.includes("cta_fired");
}

function isStagnant(user: User, now: number): boolean {
  if (user.steps_completed <= 0) return false;
  if (user.customer_status !== "prospect" && user.customer_status !== "contacted") return false;
  const lastAction = new Date(user.last_action_at).getTime();
  return now - lastAction >= THREE_DAYS_MS;
}

function isNewUser(user: User, now: number): boolean {
  const created = new Date(user.created_at).getTime();
  return now - created <= SEVEN_DAYS_MS;
}

function buildActions(users: User[], now: number): ActionItem[] {
  const items: ActionItem[] = [];

  // 1. CTA反応あり
  const ctaUsers = users.filter((u) => hasCtaBadge(u.badges ?? []));
  if (ctaUsers.length > 0) {
    items.push({
      icon: <MousePointerClick size={16} />,
      label: "CTA反応あり",
      count: ctaUsers.length,
      userIds: ctaUsers.map((u) => u.id),
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50",
    });
  }

  // 2. ステップ停滞中
  const stagnantUsers = users.filter((u) => isStagnant(u, now));
  if (stagnantUsers.length > 0) {
    items.push({
      icon: <Clock size={16} />,
      label: "ステップ停滞中",
      count: stagnantUsers.length,
      userIds: stagnantUsers.map((u) => u.id),
      colorClass: "text-red-600",
      bgClass: "bg-red-50",
    });
  }

  // 3. 新規ユーザー
  const newUsers = users.filter((u) => isNewUser(u, now));
  if (newUsers.length > 0) {
    items.push({
      icon: <UserPlus size={16} />,
      label: "新規ユーザー",
      count: newUsers.length,
      userIds: newUsers.map((u) => u.id),
      colorClass: "text-green-600",
      bgClass: "bg-green-50",
    });
  }

  // 4. 未対応CTA発火(見込み)
  const ctaProspectUsers = users.filter(
    (u) => hasCtaBadge(u.badges ?? []) && u.customer_status === "prospect"
  );
  if (ctaProspectUsers.length > 0) {
    items.push({
      icon: <Bell size={16} />,
      label: "未対応CTA発火(見込み)",
      count: ctaProspectUsers.length,
      userIds: ctaProspectUsers.map((u) => u.id),
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50",
    });
  }

  return items;
}

export default function TodayActions({ users, now }: TodayActionsProps) {
  const actions = buildActions(users, now);

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        今日のアクション
      </h3>
      <div className="space-y-2">
        {actions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <CheckCircle size={16} className="text-green-400" />
            <span>対応が必要なユーザーはいません</span>
          </div>
        ) : (
          actions.map((action) => (
            <div
              key={action.label}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${action.bgClass}`}
            >
              <div className="flex items-center gap-3">
                <span className={action.colorClass}>{action.icon}</span>
                <span className={`text-sm font-medium ${action.colorClass}`}>
                  {action.label}
                </span>
                <span className={`text-xs font-bold ${action.colorClass}`}>
                  {action.count}件
                </span>
              </div>
              {action.userIds.length === 1 ? (
                <Link
                  href={`/admindashboard/users/${action.userIds[0]}`}
                  className={`text-xs font-medium ${action.colorClass} hover:underline`}
                >
                  カルテを見る
                </Link>
              ) : (
                <Link
                  href={`/admindashboard/users/${action.userIds[0]}`}
                  className={`text-xs font-medium ${action.colorClass} hover:underline`}
                >
                  最初のユーザーを見る
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
