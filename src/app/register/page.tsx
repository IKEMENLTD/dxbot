"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("この機能は現在準備中です。LINEで友だち追加していただくことでDX診断を開始できます。");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center px-4 sm:px-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="22" rx="12" ry="4" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
            <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="#06C755" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="#06C755" strokeWidth="1.5" opacity="0.8" />
            <path d="M16 20V6" stroke="#06C755" strokeWidth="2" strokeLinecap="round" />
            <path d="M11 10.5L16 6L21 10.5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold text-gray-900 tracking-wide">dxbot</span>
        </Link>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            無料で始める
          </h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            アカウントを作成してDXの第一歩を踏み出しましょう
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-6 mb-4">
            <p className="text-xs text-amber-700 text-center">
              新規登録機能は準備中です。LINEで友だち追加していただくことでDX診断を開始できます。
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-700 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                会社名
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="株式会社サンプル"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 focus:border-[#06C755] transition-all"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                お名前
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 focus:border-[#06C755] transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@example.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 focus:border-[#06C755] transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 focus:border-[#06C755] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#06C755] text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#05B04C] transition-colors"
            >
              新規登録（準備中）
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500 text-center">
            アカウントをお持ちの方は
            <Link href="/login" className="text-[#06C755] hover:text-[#05B04C] font-medium ml-1">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
