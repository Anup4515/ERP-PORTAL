"use client";

import React from "react";
import { cn } from "@/app/lib/utils";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-0 -mb-px" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer",
                isActive
                  ? "text-primary-600 border-accent-400"
                  : "text-gray-500 border-transparent hover:text-primary-600 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
