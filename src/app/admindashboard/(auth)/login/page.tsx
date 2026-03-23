"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  success?: boolean;
  error?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }

      router.push("/admindashboard");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* ロゴ */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="16" cy="22" rx="12" ry="4" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
                <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="#06C755" strokeWidth="1.5" opacity="0.5" />
                <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="#06C755" strokeWidth="1.5" opacity="0.8" />
                <path d="M16 20V6" stroke="#06C755" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 10.5L16 6L21 10.5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="text-xl font-bold text-gray-900 tracking-wide">DXBOT</div>
                <div className="text-xs text-gray-400">Admin Dashboard</div>
              </div>
            </div>
          </div>

          <h1 className="text-center text-gray-900 text-lg font-semibold mb-1">
            管理ダッシュボード
          </h1>
          <p className="text-center text-gray-500 text-sm mb-6">
            パスワードを入力してログイン
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-orange-600 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-green-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          DXBOT Admin Dashboard
        </p>
      </div>
    </div>
  );
}
