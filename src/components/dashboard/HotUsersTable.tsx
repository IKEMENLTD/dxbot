"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { LEAD_SOURCE_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import ExitBadge from "@/components/ui/ExitBadge";
import UserAvatar from "@/components/ui/UserAvatar";

type SortKey = "score" | "level" | "last_action_at" | "preferred_name";
type SortDir = "asc" | "desc";

interface HotUsersTableProps {
  users: User[];
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-300">
        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return dir === "asc" ? (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-700">
      <path d="M3 7L6 4L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-700">
      <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HotUsersTable({ users }: HotUsersTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  const maxScore = useMemo(() => {
    if (users.length === 0) return 1;
    return Math.max(...users.map((u) => u.score), 1);
  }, [users]);

  const sorted = useMemo(() => {
    const arr = [...users];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "score":
          cmp = a.score - b.score;
          break;
        case "level":
          cmp = a.level - b.level;
          break;
        case "last_action_at":
          cmp =
            new Date(a.last_action_at).getTime() -
            new Date(b.last_action_at).getTime();
          break;
        case "preferred_name":
          cmp = (a.preferred_name ?? "").localeCompare(b.preferred_name ?? "", "ja");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [users, sortKey, sortDir]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {/* Name */}
              <th className="text-left px-5 py-3 w-[200px]">
                <button
                  type="button"
                  onClick={() => handleSort("preferred_name")}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 cursor-pointer"
                >
                  名前 / 会社名
                  <SortIcon active={sortKey === "preferred_name"} dir={sortDir} />
                </button>
              </th>
              {/* Industry */}
              <th className="text-left px-4 py-3 w-[80px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">業種</span>
              </th>
              {/* Level */}
              <th className="text-center px-4 py-3 w-[50px]">
                <button
                  type="button"
                  onClick={() => handleSort("level")}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 cursor-pointer mx-auto"
                >
                  Lv
                  <SortIcon active={sortKey === "level"} dir={sortDir} />
                </button>
              </th>
              {/* Exit */}
              <th className="text-left px-4 py-3 w-[130px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">推奨出口</span>
              </th>
              {/* Score */}
              <th className="text-left px-4 py-3 w-[140px]">
                <button
                  type="button"
                  onClick={() => handleSort("score")}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 cursor-pointer"
                >
                  スコア
                  <SortIcon active={sortKey === "score"} dir={sortDir} />
                </button>
              </th>
              {/* Last step */}
              <th className="text-left px-4 py-3 w-[200px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  直近完了ステップ
                </span>
              </th>
              {/* Last action */}
              <th className="text-left px-4 py-3 w-[110px]">
                <button
                  type="button"
                  onClick={() => handleSort("last_action_at")}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 cursor-pointer"
                >
                  最終アクション
                  <SortIcon active={sortKey === "last_action_at"} dir={sortDir} />
                </button>
              </th>
              {/* Lead source */}
              <th className="text-left px-4 py-3 w-[80px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">リード元</span>
              </th>
              {/* Badges */}
              <th className="text-left px-4 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">バッジ</span>
              </th>
              {/* Action (hover) */}
              <th className="w-[110px]" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((user) => {
              const isHovered = hoveredRow === user.id;

              return (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admindashboard/users/${user.id}`)}
                  onMouseEnter={() => setHoveredRow(user.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Name + company + avatar */}
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/admindashboard/users/${user.id}`} className="flex items-center gap-3">
                      <UserAvatar
                        name={user.preferred_name}
                        pictureUrl={user.profile_picture_url}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-gray-900 font-medium text-sm truncate hover:text-gray-600 transition-colors">
                          {user.preferred_name}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {user.company_name}
                        </div>
                      </div>
                    </Link>
                  </td>
                  {/* Industry */}
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {user.industry}
                  </td>
                  {/* Level */}
                  <td className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">
                    {user.level}
                  </td>
                  {/* Exit */}
                  <td className="px-4 py-3.5">
                    {user.recommended_exit ? (
                      <ExitBadge type={user.recommended_exit} />
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  {/* Score */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {user.score}
                    </span>
                    <div className="w-full h-[3px] bg-gray-100 rounded-full mt-1">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(user.score / maxScore) * 100}%` }}
                      />
                    </div>
                  </td>
                  {/* Last completed step */}
                  <td className="px-4 py-3.5 text-xs text-gray-500 truncate max-w-[200px]">
                    {user.last_completed_step ?? "-"}
                  </td>
                  {/* Last action */}
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {timeAgo(user.last_action_at)}
                  </td>
                  {/* Lead source */}
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {LEAD_SOURCE_LABELS[user.lead_source]}
                  </td>
                  {/* Badges */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.badges ?? []).length > 0
                        ? (user.badges ?? []).map((badge) => (
                            <Badge key={badge} type={badge} />
                          ))
                        : <span className="text-xs text-gray-300">-</span>}
                    </div>
                  </td>
                  {/* Quick action */}
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    {isHovered && (
                      <Link
                        href={`/admindashboard/users/${user.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="shrink-0"
                        >
                          <path
                            d="M2 6H10M10 6L7 3M10 6L7 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        カルテを見る
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          該当するユーザーがいません
        </div>
      )}
    </div>
  );
}
