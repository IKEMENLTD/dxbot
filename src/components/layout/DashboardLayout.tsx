"use client";

import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { width } = useSidebar();

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <main className="flex-1" style={{ marginLeft: `${width}px` }}>
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
