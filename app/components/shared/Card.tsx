"use client";

import React from "react";
import { cn } from "@/app/lib/utils";

type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
