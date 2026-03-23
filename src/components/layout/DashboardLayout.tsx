"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { width } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* デスクトップ/タブレット: 通常サイドバー */}
      {!isMobile && <Sidebar />}

      {/* モバイル: ハンバーガーメニュー + オーバーレイサイドバー */}
      {isMobile && (
        <>
          {/* ヘッダーバー */}
          <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#06C755] flex items-center px-4">
            <button
              onClick={toggleMenu}
              className="w-10 h-10 flex items-center justify-center text-white"
              aria-label="メニューを開く"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="ml-3 text-sm font-bold text-white tracking-wide">DXBOT</span>
          </header>

          {/* オーバーレイ背景 */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={closeMenu}
            />
          )}

          {/* スライドインサイドバー */}
          <div
            className={`fixed top-0 left-0 z-50 h-full transition-transform duration-300 ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar onNavigate={closeMenu} />
          </div>
        </>
      )}

      <main
        className="flex-1"
        style={isMobile ? { marginTop: "56px" } : { marginLeft: `${width}px` }}
      >
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
