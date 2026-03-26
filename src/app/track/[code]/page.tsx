"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

// ===== UA解析ヘルパー（軽量JS、ライブラリ不要） =====

interface DeviceInfo {
  deviceType: string;
  os: string;
  browser: string;
}

function parseUserAgent(ua: string): DeviceInfo {
  // デバイスタイプ
  let deviceType = "desktop";
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) {
    deviceType = "mobile";
  } else if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) {
    deviceType = "tablet";
  }

  // OS（iPhoneのUAは"Mac OS X"を含むためiOS判定を先にする）
  let os = "unknown";
  if (/iPhone|iPod/i.test(ua)) os = "iOS";
  else if (/iPad/i.test(ua)) os = "iPadOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // ブラウザ（LINE内ブラウザも検出）
  let browser = "unknown";
  if (/Line\//i.test(ua)) browser = "LINE";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/MSIE|Trident/i.test(ua)) browser = "IE";

  return { deviceType, os, browser };
}

// ===== ページ本体 =====

export default function TrackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const code = typeof params.code === "string" ? params.code : "";
    if (!code) {
      window.location.href = "/";
      return;
    }

    const ua = navigator.userAgent;
    const { deviceType, os, browser } = parseUserAgent(ua);

    const utmSource = searchParams.get("utm_source") ?? "";
    const utmMedium = searchParams.get("utm_medium") ?? "";
    const utmCampaign = searchParams.get("utm_campaign") ?? "";
    const utmContent = searchParams.get("utm_content") ?? "";
    const referer = document.referrer || "";
    const language = navigator.language || "";

    const payload = {
      deviceType,
      os,
      browser,
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      language,
      country: "",
    };

    // バックグラウンドでPOST送信
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`/api/track/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) {
          return res.json() as Promise<{ ok: boolean; destinationUrl?: string }>;
        }
        return null;
      })
      .then((data) => {
        if (data?.destinationUrl) {
          window.location.href = data.destinationUrl;
        } else {
          // APIから取得できなかった場合はフォールバック
          window.location.href = `/api/track/${encodeURIComponent(code)}`;
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // エラー時はGETフォールバック
        window.location.href = `/api/track/${encodeURIComponent(code)}`;
      });
  }, [params.code, searchParams]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f9fafb",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid #e5e7eb",
          borderTopColor: "#22c55e",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p
        style={{
          marginTop: 16,
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        LINE友だち追加画面へ移動中...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <noscript>
        <meta
          httpEquiv="refresh"
          content={`0;url=/api/track/${typeof params.code === "string" ? params.code : ""}`}
        />
      </noscript>
    </div>
  );
}
