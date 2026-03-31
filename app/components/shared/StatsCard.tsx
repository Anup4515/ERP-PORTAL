"use client";

import React from "react";
import { cn } from "@/app/lib/utils";

interface StatsCardTrend {
  value: number;
  isPositive: boolean;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: StatsCardTrend;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-all duration-200",
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-50 text-primary-600 shrink-0">
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-primary-900">{value}</p>

        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.isPositive ? (
              <svg
                className="w-4 h-4 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
