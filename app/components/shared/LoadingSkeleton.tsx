"use client";

import React from "react";
import { cn } from "@/app/lib/utils";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({
  lines = 3,
  className,
}: LoadingSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 rounded-md bg-gray-200 animate-pulse",
            i === lines - 1 ? "w-3/5" : i % 2 === 0 ? "w-full" : "w-4/5"
          )}
        />
      ))}
    </div>
  );
}
