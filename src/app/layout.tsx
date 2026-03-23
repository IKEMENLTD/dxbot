import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "dxbot - 中小企業のDXコーチング",
  description: "ITが苦手でも大丈夫。御社のペースで、DXを始めませんか。dxbotは中小企業に寄り添うDXコーチングサービスです。",
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
