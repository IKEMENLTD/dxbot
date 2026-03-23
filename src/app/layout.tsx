import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ui/Toast";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dxbot.jp";
const siteName = "dxbot";
const siteTitle = "dxbot - 中小企業のDXコーチング";
const siteDescription =
  "ITが苦手でも大丈夫。御社のペースで、DXを始めませんか。dxbotは中小企業に寄り添うDXコーチングサービスです。";
const ogImageUrl = `${siteUrl}/og-image.png`;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName,
    url: siteUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl],
  },
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
