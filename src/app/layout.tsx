import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full bg-[#F7F8FA] text-[#111111]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
