"use client";

import { useState } from "react";
import type { User, CustomerStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

interface NotesActionsProps {
  user: User;
}

const STATUS_OPTIONS: CustomerStatus[] = [
  "prospect",
  "contacted",
  "meeting",
  "customer",
  "churned",
  "techstars_active",
  "techstars_grad",
];

export default function NotesActions({ user }: NotesActionsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus>(user.customer_status);
  const isTechstarsActive = user.customer_status === "techstars_active";

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        メモ & アクション
      </h3>

      {/* Note input */}
      <div className="mb-4">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="メモを入力..."
          className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors mb-4"
      >
        メモを保存
      </button>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="bg-gray-900 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-gray-800 transition-colors"
        >
          <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          再診断送信
        </button>

        {isTechstarsActive && (
          <button
            type="button"
            className="bg-orange-600 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-orange-700 transition-colors"
          >
            <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            TECHSTARS修了登録
          </button>
        )}
      </div>

      {/* Status change */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 shrink-0">ステータス:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as CustomerStatus)}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
