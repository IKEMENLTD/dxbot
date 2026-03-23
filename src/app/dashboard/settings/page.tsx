"use client";

import { useState } from "react";
import LineSettings from "@/components/settings/LineSettings";
import TagSettings from "@/components/settings/TagSettings";
import LeadSourceSettings from "@/components/settings/LeadSourceSettings";
import TemplateSettings from "@/components/settings/TemplateSettings";
import ExitSettings from "@/components/settings/ExitSettings";
import StatusSettings from "@/components/settings/StatusSettings";

type TabKey = "line" | "tags" | "leadSource" | "templates" | "exit" | "status";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "line", label: "LINE連携" },
  { key: "tags", label: "タグ" },
  { key: "leadSource", label: "流入元" },
  { key: "templates", label: "定型文" },
  { key: "exit", label: "出口" },
  { key: "status", label: "ステータス" },
];

function TabContent({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "line":
      return <LineSettings />;
    case "tags":
      return <TagSettings />;
    case "leadSource":
      return <LeadSourceSettings />;
    case "templates":
      return <TemplateSettings />;
    case "exit":
      return <ExitSettings />;
    case "status":
      return <StatusSettings />;
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("line");

  return (
    <div>
      {/* ページタイトル */}
      <h1 className="text-xl font-bold text-gray-900 mb-6">設定</h1>

      {/* メインカード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {/* タブナビ */}
        <div className="flex gap-2 mb-6" role="tablist" aria-label="設定タブ">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-label={`${tab.label}の設定`}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? "px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white transition-colors"
                  : "px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
