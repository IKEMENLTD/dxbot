"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

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

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="22" rx="12" ry="4" stroke="white" strokeWidth="1.5" opacity="0.3" />
      <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <path d="M16 20V6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 10.5L16 6L21 10.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { width, setWidth, collapsed, toggle } = useSidebar();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const diff = ev.clientX - startX.current;
        setWidth(startWidth.current + diff);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, setWidth]
  );

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen bg-[#06C755] flex flex-col select-none"
      style={{ width: `${width}px` }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 overflow-hidden shrink-0">
        <div className={cn("flex items-center gap-3 min-w-0", collapsed && "justify-center")}>
          <div className="shrink-0">
            <LogoIcon />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-wide whitespace-nowrap">DXBOT</div>
              <div className="text-[10px] text-white/60 tracking-wider whitespace-nowrap">Admin v5.3</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-2 space-y-1 overflow-hidden" aria-label="メインナビゲーション">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center text-sm font-medium rounded-xl transition-colors relative group",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3",
                isActive
                  ? "text-white bg-white/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <span className={cn("shrink-0", isActive ? "text-white" : "text-white/60")}>
                {item.icon}
              </span>
              {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-3 py-3 overflow-hidden border-t border-white/10">
        {!collapsed && (
          <div className="px-2 mb-2">
            <div className="text-[11px] text-white/50 font-medium whitespace-nowrap">TECHSTARS / IKEMEN</div>
            <div className="text-[11px] text-white/50 mt-0.5 whitespace-nowrap">池: 10人 / 成約: 4件</div>
          </div>
        )}
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-2 rounded-xl py-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors",
            collapsed ? "justify-center w-full px-0" : "px-3"
          )}
          title={collapsed ? "サイドバーを開く" : "折りたたむ"}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを折りたたむ"}
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={cn("transition-transform", collapsed ? "rotate-180" : "")}
          >
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span className="text-xs whitespace-nowrap">折りたたむ</span>}
        </button>
      </div>

      {/* Drag handle - right edge */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute -right-2 top-0 w-4 h-full cursor-col-resize z-50 flex items-center justify-center group"
      >
        <div className="w-0.5 h-8 bg-green-300/50 rounded-full group-hover:bg-white/60 group-active:bg-white/80 transition-colors" />
      </div>
    </aside>
  );
}
