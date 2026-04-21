"use client";

import React, { useState } from "react";
import { Tabs } from "@/app/components/shared";
import SchoolProfileTab from "./tabs/SchoolProfileTab";
import SessionsTab from "./tabs/SessionsTab";
import ClassesTab from "./tabs/ClassesTab";
import SubjectsTab from "./tabs/SubjectsTab";
import GradingTab from "./tabs/GradingTab";
import HolisticParamsTab from "./tabs/HolisticParamsTab";
import { usePartnerBranding } from "@/app/components/providers/PartnerBrandingProvider";

const settingsTabs = [
  { key: "school-profile", label: "School Profile" },
  { key: "sessions", label: "Sessions" },
  { key: "classes", label: "Classes" },
  { key: "subjects", label: "Subjects" },
  { key: "grading", label: "Grading" },
  { key: "holistic-params", label: "Holistic Parameters" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("school-profile");
  const { label } = usePartnerBranding();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your {label} settings</p>
      </div>

      <Tabs tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "school-profile" && <SchoolProfileTab />}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "classes" && <ClassesTab />}
        {activeTab === "subjects" && <SubjectsTab />}
        {activeTab === "grading" && <GradingTab />}
        {activeTab === "holistic-params" && <HolisticParamsTab />}
      </div>
    </div>
  );
}
