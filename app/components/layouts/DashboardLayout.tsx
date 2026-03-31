"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/app/lib/utils";
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
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  label: string;
  href: string;
  icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }
  >;
}

const schoolAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/school-admin/dashboard", icon: HomeIcon },
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
  { label: "Holistic", href: "/school-admin/holistic", icon: SparklesIcon },
  {
    label: "Reports",
    href: "/school-admin/reports",
    icon: DocumentChartBarIcon,
  },
  { label: "Settings", href: "/school-admin/settings", icon: Cog6ToothIcon },
];

const teacherNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher/dashboard", icon: HomeIcon },
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
  { label: "Marks", href: "/teacher/marks", icon: ChartBarIcon },
  { label: "Holistic", href: "/teacher/holistic", icon: SparklesIcon },
  { label: "Reports", href: "/teacher/reports", icon: DocumentChartBarIcon },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "school_admin" | "teacher";
}

export default function DashboardLayout({
  children,
  role,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = role === "school_admin" ? schoolAdminNav : teacherNav;
  const roleLabel = role === "school_admin" ? "School Admin" : "Teacher";
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
        {/* Logo */}
        <div
          className={cn(
            "flex items-center border-b border-white/15 py-6",
            collapsed ? "justify-center px-2" : "gap-3 px-6"
          )}
        >
          <Image
            src="/logo.png"
            alt="WiserWits"
            width={36}
            height={36}
            className="rounded-lg shrink-0"
          />
          {!collapsed && (
            <span className="text-xl font-bold text-white tracking-tight">
              WiserWits
            </span>
          )}
        </div>

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
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-accent-400 flex items-center justify-center text-primary-900 font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName}
                </p>
                <span className="inline-block text-xs bg-white/10 text-primary-200 px-2 py-0.5 rounded-full">
                  {roleLabel}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex items-center w-full text-sm text-primary-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors duration-200 cursor-pointer",
              collapsed
                ? "justify-center px-2 py-2"
                : "gap-2 px-3 py-2"
            )}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 lg:hidden bg-gradient-to-b from-primary-600 via-primary-700 to-primary-600 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-primary-200 hover:text-white transition-colors cursor-pointer"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col bg-gradient-to-b from-primary-600 via-primary-700 to-primary-600 transition-all duration-300",
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 pt-3">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 bg-white/80 backdrop-blur-sm rounded-md shadow-sm border border-gray-200/60">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-primary-900">
                {pageTitle}
              </h1>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronDoubleRightIcon className="w-5 h-5" />
                ) : (
                  <ChevronDoubleLeftIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Right: settings + notification + avatar */}
            <div className="flex items-center gap-3">
              <button className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <Cog6ToothIcon className="w-5.5 h-5.5" />
              </button>
              <button className="relative text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <BellIcon className="w-5.5 h-5.5" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  2
                </span>
              </button>
              <div className="w-9 h-9 rounded-full bg-primary-900 flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
