"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard/chat",
    label: "チャット",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4.5C4 3.67 4.67 3 5.5 3H14.5C15.33 3 16 3.67 16 4.5V12.5C16 13.33 15.33 14 14.5 14H8L5 17V14H5.5C4.67 14 4 13.33 4 12.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7.5 7.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7.5 10H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "熱い人リスト",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2.5C10 2.5 4 6.5 4 11C4 14.3 6.7 17 10 17C13.3 17 16 14.3 16 11C16 6.5 10 2.5 10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 17C10 17 8 15 8 13C8 11 10 9.5 10 9.5C10 9.5 12 11 12 13C12 15 10 17 10 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/funnel",
    label: "ファネルKPI",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.25 4H16.75L11.5 10.75V15.25L8.5 16.75V10.75L3.25 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "設定",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.66 4.34L14.24 5.76M5.76 14.24L4.34 15.66M15.66 15.66L14.24 14.24M5.76 5.76L4.34 4.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

{/*
  ロゴSVG: 水の波紋（池）から上昇する矢印（DX転換・成長）
  3つの同心円の波紋 + 中央から斜め上に伸びる矢印
*/}
function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 波紋（3段階） */}
      <ellipse cx="16" cy="22" rx="12" ry="4" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
      <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="#06C755" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="#06C755" strokeWidth="1.5" opacity="0.8" />
      {/* 上昇矢印 */}
      <path d="M16 20V6" stroke="#06C755" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 10.5L16 6L21 10.5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-gray-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5">
        <div className="flex items-center gap-3">
          <LogoIcon />
          <div>
            <div className="text-sm font-bold text-gray-900 tracking-wide">DXBOT</div>
            <div className="text-[10px] text-gray-400 tracking-wider">Admin v5.3</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all",
                isActive
                  ? "text-green-700 bg-green-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <span className={cn(isActive ? "text-green-600" : "text-gray-400")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-4">
        <div className="text-[11px] text-gray-400 font-medium">
          TECHSTARS / IKEMEN
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          池: 10人 / 成約: 4件
        </div>
      </div>
    </aside>
  );
}
