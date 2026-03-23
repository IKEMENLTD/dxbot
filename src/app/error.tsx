"use client";

import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl font-bold text-red-500 mb-4">Error</div>
        <h1 className="text-2xl font-bold text-[#111111] mb-2">
          エラーが発生しました
        </h1>
        <p className="text-sm text-[#666666] mb-8">
          {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05a847] transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8C2 4.686 4.686 2 8 2C11.314 2 14 4.686 14 8C14 11.314 11.314 14 8 14C5.946 14 4.132 12.952 3.05 11.38"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M2 4V8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            もう一度試す
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#DDDDDD] text-[#111111] text-sm font-medium rounded-lg hover:bg-[#EEEEEE] transition-colors"
          >
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
}
