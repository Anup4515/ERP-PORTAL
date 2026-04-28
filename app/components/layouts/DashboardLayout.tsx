"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/app/lib/utils";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import PartnerBrandingProvider, {
  usePartnerBranding,
} from "@/app/components/providers/PartnerBrandingProvider";
import ReadOnlyBanner from "@/app/components/shared/ReadOnlyBanner";
import {
  HomeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChartBarIcon,
  SparklesIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  RectangleGroupIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  InformationCircleIcon,
  UsersIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { BuildingLibraryIcon } from "@heroicons/react/24/solid";

interface NavItem {
  label: string;
  href: string;
  icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }
  >;
}

const schoolAdminNav: NavItem[] = [
  { label: "Home", href: "/school-admin/dashboard", icon: HomeIcon },
  { label: "Teachers", href: "/school-admin/teachers", icon: UserGroupIcon },
  { label: "Students", href: "/school-admin/students", icon: AcademicCapIcon },
  {
    label: "Attendance",
    href: "/school-admin/attendance",
    icon: ClipboardDocumentCheckIcon,
  },
  { label: "Calendar", href: "/school-admin/calendar", icon: CalendarDaysIcon },
  { label: "Exams", href: "/school-admin/exams", icon: DocumentTextIcon },
  { label: "Marks", href: "/school-admin/marks", icon: ChartBarIcon },
  { label: "Timetable", href: "/school-admin/timetable", icon: ClockIcon },
  { label: "Staff", href: "/school-admin/staff", icon: UsersIcon },
  { label: "Holistic", href: "/school-admin/holistic", icon: SparklesIcon },
  {
    label: "Reports",
    href: "/school-admin/reports",
    icon: DocumentChartBarIcon,
  },
  { label: "Data Health", href: "/school-admin/data-health", icon: HeartIcon },
  { label: "Messages", href: "/school-admin/chat", icon: ChatBubbleLeftRightIcon },
  { label: "Settings", href: "/school-admin/settings", icon: Cog6ToothIcon },
  { label: "Instructions", href: "/school-admin/instructions", icon: InformationCircleIcon },
];

const teacherNav: NavItem[] = [
  { label: "Home", href: "/teacher/dashboard", icon: HomeIcon },
  {
    label: "My Classes",
    href: "/teacher/classes",
    icon: RectangleGroupIcon,
  },
  { label: "Students", href: "/teacher/students", icon: AcademicCapIcon },
  {
    label: "Attendance",
    href: "/teacher/attendance",
    icon: ClipboardDocumentCheckIcon,
  },
  { label: "Calendar", href: "/teacher/calendar", icon: CalendarDaysIcon },
  { label: "Exams", href: "/teacher/exams", icon: DocumentTextIcon },
  { label: "Marks", href: "/teacher/marks", icon: ChartBarIcon },
  { label: "Timetable", href: "/teacher/timetable", icon: ClockIcon },
  { label: "Instructions", href: "/teacher/instructions", icon: InformationCircleIcon },
  { label: "Holistic", href: "/teacher/holistic", icon: SparklesIcon },
  { label: "Reports", href: "/teacher/reports", icon: DocumentChartBarIcon },
  { label: "Messages", href: "/teacher/chat", icon: ChatBubbleLeftRightIcon },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "school_admin" | "teacher";
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <PartnerBrandingProvider>
      <DashboardLayoutInner {...props} />
    </PartnerBrandingProvider>
  );
}

function DashboardLayoutInner({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { branding } = usePartnerBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    viewingSession,
    isViewingPastSession,
    setViewingSessionId,
  } = useViewingSession();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(e.target as Node)) {
        setSessionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentSession = sessions.find((s) => s.is_current === 1);

  const navItems = role === "school_admin" ? schoolAdminNav : teacherNav;
  const userName = role === "school_admin" ? "Admin" : "Teacher";
  const initials = userName.slice(0, 2).toUpperCase();

  // Determine active page title from nav
  const activeItem = navItems.find((item) => pathname.startsWith(item.href));
  const pageTitle = activeItem?.label ?? "Dashboard";

  function handleSignOut() {
    signOut({ callbackUrl: "/login" });
  }

  function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
    return (
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 py-4 space-y-1 overflow-y-auto",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm font-semibold transition-all duration-200",
                  collapsed
                    ? "justify-center px-2 py-3"
                    : "gap-3 px-4 py-3",
                  isActive
                    ? "bg-accent-400 text-primary-900 shadow-lg shadow-accent-400/20"
                    : "text-primary-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div
          className={cn(
            "py-4 border-t border-white/15",
            collapsed ? "px-2" : "px-4"
          )}
        >
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between px-2"
          )}>
            {!collapsed && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-accent-400 flex items-center justify-center text-primary-900 font-bold text-sm shrink-0">
                  {initials}
                </div>
                <p className="text-sm font-medium text-white truncate">
                  {userName}
                </p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-primary-200 hover:text-white hover:bg-white/5 rounded-lg p-2 transition-colors duration-200 cursor-pointer shrink-0"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const institutionName = branding?.partner_name ?? "WiserWits";
  const logoSrc = branding?.logo || "/logo.png";
  const isCustomLogo = Boolean(branding?.logo);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarCollapsed((c) => !c);
    } else {
      setSidebarOpen((o) => !o);
    }
  }

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Full-width top header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-[72px] bg-white border-b border-gray-200/70 shadow-sm">
        <div className="flex items-center justify-between h-full pr-3 sm:pr-4 lg:pr-6">
          {/* Left: hamburger (aligned to sidebar column) + institution branding */}
          <div className="flex items-center min-w-0">
            {/* Hamburger sits in a 72px column so it aligns with collapsed sidebar icons */}
            <div className="w-[72px] flex items-center justify-center shrink-0">
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg p-2 transition-colors cursor-pointer"
                title="Toggle sidebar"
              >
                <Bars3Icon className="w-7 h-7" />
              </button>
            </div>

            {/* Brand block */}
            <div className="flex items-center gap-2.5 min-w-0">
              {isCustomLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt={institutionName}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg shrink-0 object-contain border border-gray-200 bg-white"
                />
              ) : (
                <Image
                  src={logoSrc}
                  alt={institutionName}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg shrink-0"
                />
              )}
              <div className="flex flex-col leading-tight min-w-0">
                <span
                  className="text-base font-bold text-primary-900 tracking-tight truncate max-w-[160px] sm:max-w-[260px]"
                  title={institutionName}
                >
                  {institutionName}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-gray-400">
                  Powered by WiserWits
                </span>
              </div>
            </div>

            {/* Divider + page title (desktop only) */}
            {/* <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-gray-200">
              <h1 className="text-sm font-semibold text-gray-700 truncate">
                {pageTitle}
              </h1>
            </div> */}
          </div>

          {/* Right: session switcher + avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {sessions.length > 1 && viewingSession && (
              <div className="relative" ref={sessionDropdownRef}>
                <button
                  onClick={() => setSessionDropdownOpen(!sessionDropdownOpen)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                    isViewingPastSession
                      ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{viewingSession.name}</span>
                  <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 12 12">
                    <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {sessionDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Academic Sessions
                    </div>
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setViewingSessionId(s.id);
                          setSessionDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer",
                          s.id === viewingSession.id
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {s.name}
                        {s.is_current === 1 && (
                          <span className="ml-2 text-xs text-green-600 font-medium">(Current)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {role === "school_admin" ? (
              <Link
                href="/school-admin/settings"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-primary-200/60 flex items-center justify-center text-primary-700 shrink-0 shadow-sm hover:ring-primary-300 hover:from-primary-100 hover:to-primary-200 transition-colors cursor-pointer"
                title={`${institutionName} — School Profile`}
              >
                <BuildingLibraryIcon className="w-5 h-5" />
              </Link>
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-primary-200/60 flex items-center justify-center text-primary-700 shrink-0 shadow-sm"
                title={institutionName}
              >
                <BuildingLibraryIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-[72px] z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed top-[72px] bottom-0 left-0 z-40 w-64 lg:hidden bg-gradient-to-b from-primary-600 via-primary-700 to-primary-600 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:top-[72px] lg:bottom-0 lg:left-0 lg:z-30 lg:flex lg:flex-col bg-gradient-to-b from-primary-600 via-primary-700 to-primary-600 transition-all duration-300",
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          "pt-[72px] transition-all duration-300",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        {/* Read-only banner for past sessions */}
        {isViewingPastSession && viewingSession && currentSession && (
          <ReadOnlyBanner
            sessionName={viewingSession.name}
            onSwitchBack={() => setViewingSessionId(currentSession.id)}
          />
        )}

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
