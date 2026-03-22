"use client";

import { useState, useCallback } from "react";
import { EXIT_CONFIG, STATUS_CONFIG } from "@/lib/types";
import type { ExitType, CustomerStatus, LeadSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  apo: "APO",
  threads: "Threads",
  x: "X",
  instagram: "Instagram",
  referral: "紹介",
  other: "その他",
};

export interface FilterState {
  exit: ExitType | "all";
  status: CustomerStatus | "all";
  leadSource: LeadSource | "all";
  techstarsGradOnly: boolean;
  search: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer",
        active
          ? "bg-green-600 text-white border-green-600"
          : "bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      onFilterChange({ ...filters, search: value });
    },
    [filters, onFilterChange]
  );

  const setExit = useCallback(
    (exit: ExitType | "all") => {
      onFilterChange({ ...filters, exit });
    },
    [filters, onFilterChange]
  );

  const setStatus = useCallback(
    (status: CustomerStatus | "all") => {
      onFilterChange({ ...filters, status });
    },
    [filters, onFilterChange]
  );

  const setLeadSource = useCallback(
    (leadSource: LeadSource | "all") => {
      onFilterChange({ ...filters, leadSource });
    },
    [filters, onFilterChange]
  );

  const toggleTechstarsGrad = useCallback(() => {
    onFilterChange({ ...filters, techstarsGradOnly: !filters.techstarsGradOnly });
  }, [filters, onFilterChange]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
      {/* Row 1: Exit filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium w-16 shrink-0">出口</span>
        <div className="flex flex-wrap gap-2">
          <PillButton
            label="全て"
            active={filters.exit === "all"}
            onClick={() => setExit("all")}
          />
          {(Object.keys(EXIT_CONFIG) as ExitType[]).map((key) => (
            <PillButton
              key={key}
              label={EXIT_CONFIG[key].label}
              active={filters.exit === key}
              onClick={() => setExit(key)}
            />
          ))}
        </div>
      </div>

      {/* Row 2: Status filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium w-16 shrink-0">状態</span>
        <div className="flex flex-wrap gap-2">
          <PillButton
            label="全て"
            active={filters.status === "all"}
            onClick={() => setStatus("all")}
          />
          {(Object.keys(STATUS_CONFIG) as CustomerStatus[]).map((key) => (
            <PillButton
              key={key}
              label={STATUS_CONFIG[key].label}
              active={filters.status === key}
              onClick={() => setStatus(key)}
            />
          ))}
        </div>
      </div>

      {/* Row 3: Lead source filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium w-16 shrink-0">流入元</span>
        <div className="flex flex-wrap gap-2">
          <PillButton
            label="全て"
            active={filters.leadSource === "all"}
            onClick={() => setLeadSource("all")}
          />
          {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((key) => (
            <PillButton
              key={key}
              label={LEAD_SOURCE_LABELS[key]}
              active={filters.leadSource === key}
              onClick={() => setLeadSource(key)}
            />
          ))}
        </div>
      </div>

      {/* Row 4: TECHSTARS grad toggle + Search */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium w-16 shrink-0">特殊</span>
        {/* TECHSTARS checkbox-style toggle */}
        <button
          type="button"
          onClick={toggleTechstarsGrad}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer",
            filters.techstarsGradOnly
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          {/* Checkbox icon */}
          <div className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
            filters.techstarsGradOnly
              ? "bg-green-600 border-green-600"
              : "border-gray-300 bg-white"
          )}>
            {filters.techstarsGradOnly && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          TECHSTARS修了者のみ
        </button>

        {/* Search */}
        <div className="ml-auto relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 12.5C10 12.5 12.5 10 12.5 7C12.5 4 10 1.5 7 1.5C4 1.5 1.5 4 1.5 7C1.5 10 4 12.5 7 12.5ZM11 11L14.5 14.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder="名前/会社名で検索"
            value={searchValue}
            onChange={handleSearchChange}
            className="bg-gray-50 border border-gray-200 text-gray-900 text-xs pl-9 pr-4 py-2 w-52 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
