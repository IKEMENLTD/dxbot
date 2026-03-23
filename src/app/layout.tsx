import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "DXBOT - 管理ダッシュボード",
  description: "DX転換池管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased light" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <body className="min-h-full bg-[#F7F8FA] text-[#111111]" suppressHydrationWarning>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
