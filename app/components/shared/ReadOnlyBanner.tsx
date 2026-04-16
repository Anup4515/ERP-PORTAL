"use client"

import React from "react"
import { LockClosedIcon } from "@heroicons/react/24/outline"

interface ReadOnlyBannerProps {
  sessionName: string
  onSwitchBack: () => void
}

export default function ReadOnlyBanner({ sessionName, onSwitchBack }: ReadOnlyBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <LockClosedIcon className="h-4 w-4 shrink-0" />
        <span>
          Viewing data from <strong>{sessionName}</strong> — this is read-only.
          Changes can only be made in the current session.
        </span>
      </div>
      <button
        onClick={onSwitchBack}
        className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 underline"
      >
        Switch to current
      </button>
    </div>
  )
}
