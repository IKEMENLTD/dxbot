"use client";

import { useState } from "react";
import LineSettings from "@/components/settings/LineSettings";
import TagSettings from "@/components/settings/TagSettings";
import LeadSourceSettings from "@/components/settings/LeadSourceSettings";
import TemplateSettings from "@/components/settings/TemplateSettings";
import ExitSettings from "@/components/settings/ExitSettings";
import StatusSettings from "@/components/settings/StatusSettings";
import StepSettings from "@/components/settings/StepSettings";
import CtaSettings from "@/components/settings/CtaSettings";
import ReminderSettings from "@/components/settings/ReminderSettings";
import DiagnosisSettings from "@/components/settings/DiagnosisSettings";

type TabKey = "line" | "tags" | "leadSource" | "templates" | "exit" | "status" | "steps" | "cta" | "reminder" | "diagnosis";

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
  { key: "steps", label: "ステップ管理" },
  { key: "cta", label: "CTA設定" },
  { key: "reminder", label: "リマインダー" },
  { key: "diagnosis", label: "診断設定" },
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
    case "steps":
      return <StepSettings />;
    case "cta":
      return <CtaSettings />;
    case "reminder":
      return <ReminderSettings />;
    case "diagnosis":
      return <DiagnosisSettings />;
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("line");

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1400px]">
      {/* ページタイトル */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">設定</h1>
        <p className="text-xs text-gray-500 mt-0.5">管理画面の各種設定</p>
      </div>

      {/* メインカード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {/* タブナビ */}
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="設定タブ">
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
