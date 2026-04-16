"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"

export interface AcademicSession {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: number
}

interface ViewingSessionContextValue {
  sessions: AcademicSession[]
  viewingSession: AcademicSession | null
  isViewingPastSession: boolean
  setViewingSessionId: (id: number) => void
  loading: boolean
  /** Append session_id to a URL. Handles both `?` and `&` cases. */
  withSessionId: (url: string) => string
}

const ViewingSessionContext = createContext<ViewingSessionContextValue>({
  sessions: [],
  viewingSession: null,
  isViewingPastSession: false,
  setViewingSessionId: () => {},
  loading: true,
  withSessionId: (url) => url,
})

export function useViewingSession() {
  return useContext(ViewingSessionContext)
}

const STORAGE_KEY = "wiserwits_viewing_session_id"

export default function ViewingSessionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [viewingSessionId, setViewingSessionIdState] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch all sessions for this partner
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions")
      if (!res.ok) {
        setSessions([])
        return
      }
      const json = await res.json()
      const data: AcademicSession[] = json.data ?? []
      setSessions(data)

      // Restore from sessionStorage or default to current
      const stored = sessionStorage.getItem(STORAGE_KEY)
      const storedId = stored ? Number(stored) : null
      const hasStored = storedId && data.some((s) => s.id === storedId)

      if (hasStored) {
        setViewingSessionIdState(storedId)
      } else {
        const current = data.find((s) => s.is_current === 1)
        if (current) {
          setViewingSessionIdState(current.id)
        }
      }
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      fetchSessions()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status, fetchSessions])

  const setViewingSessionId = useCallback((id: number) => {
    setViewingSessionIdState(id)
    sessionStorage.setItem(STORAGE_KEY, String(id))
  }, [])

  const viewingSession = useMemo(
    () => sessions.find((s) => s.id === viewingSessionId) ?? null,
    [sessions, viewingSessionId]
  )

  const isViewingPastSession = useMemo(
    () => viewingSession != null && viewingSession.is_current !== 1,
    [viewingSession]
  )

  const withSessionId = useCallback(
    (url: string) => {
      if (!viewingSession) return url
      const separator = url.includes("?") ? "&" : "?"
      return `${url}${separator}session_id=${viewingSession.id}`
    },
    [viewingSession]
  )

  const value = useMemo<ViewingSessionContextValue>(
    () => ({
      sessions,
      viewingSession,
      isViewingPastSession,
      setViewingSessionId,
      loading,
      withSessionId,
    }),
    [sessions, viewingSession, isViewingPastSession, setViewingSessionId, loading, withSessionId]
  )

  return (
    <ViewingSessionContext.Provider value={value}>
      {children}
    </ViewingSessionContext.Provider>
  )
}
