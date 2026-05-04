"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/shared/Button";
import Input from "@/app/components/shared/Input";
import Modal from "@/app/components/shared/Modal";
import DataTable from "@/app/components/shared/DataTable";
import Badge from "@/app/components/shared/Badge";
import EmptyState from "@/app/components/shared/EmptyState";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Session {
  id: string;
  partner_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

interface SessionFormData {
  name: string;
  start_date: string;
  end_date: string;
}

const initialFormData: SessionFormData = {
  name: "",
  start_date: "",
  end_date: "",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SessionsTab() {
  const router = useRouter();
  const { isViewingPastSession, refreshSessions } = useViewingSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  // Delete + Set Current actions have been removed from the UI. Sessions are
  // immutable once created — only the current session can be edited (name +
  // shrink dates) and new sessions are created via Session Transition.

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      const json = await res.json();
      setSessions(json.data ?? []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openCreateModal = () => {
    if (isViewingPastSession) return;
    setEditingSession(null);
    setFormData(initialFormData);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (session: Session) => {
    if (isViewingPastSession) return;
    setEditingSession(session);
    setFormData({
      name: session.name,
      start_date: session.start_date?.slice(0, 10) ?? "",
      end_date: session.end_date?.slice(0, 10) ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSession(null);
    setFormData(initialFormData);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const url = editingSession
        ? `/api/sessions/${editingSession.id}`
        : "/api/sessions";
      const method = editingSession ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setFormError(json?.error || "Failed to save session. Please check your inputs.");
        return;
      }
      closeModal();
      await Promise.all([fetchSessions(), refreshSessions()]);
    } catch (err) {
      console.error("Failed to save session:", err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };


  const columns = [
    { key: "name", label: "Name" },
    {
      key: "start_date",
      label: "Start Date",
      render: (row: Record<string, unknown>) => formatDate(row.start_date as string),
    },
    {
      key: "end_date",
      label: "End Date",
      render: (row: Record<string, unknown>) => formatDate(row.end_date as string),
    },
    {
      key: "is_current",
      label: "Status",
      render: (row: Record<string, unknown>) =>
        row.is_current ? (
          <Badge variant="success" size="sm">Current</Badge>
        ) : (
          <Badge variant="default" size="sm">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => {
        const session = row as unknown as Session;
        // Only the current session is editable. Past sessions are view-only.
        if (!session.is_current) return <span className="text-gray-400 text-sm">—</span>;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(session)}
            disabled={isViewingPastSession}
          >
            Edit
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Academic Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your academic sessions and set the current active session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length === 0 ? (
            // No sessions yet — the only path forward is to create the first one.
            <Button variant="primary" size="md" onClick={openCreateModal} disabled={isViewingPastSession}>
              Add Session
            </Button>
          ) : (
            // At least one session exists — new sessions must go through Session
            // Transition so promotions, enrollment carry-over, and is_current
            // flipping happen atomically. Raw "Add Session" is intentionally hidden.
            <Button
              variant="secondary"
              size="md"
              disabled={isViewingPastSession}
              onClick={() => {
                if (isViewingPastSession) return;
                router.push("/school-admin/transition");
              }}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Session Transition
            </Button>
          )}
        </div>
      </div>

      {!loading && sessions.length === 0 ? (
        <EmptyState
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          title="No sessions yet"
          description="Create your first academic session to get started."
          action={isViewingPastSession ? undefined : { label: "Add Session", onClick: openCreateModal }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={sessions as unknown as Record<string, unknown>[]}
          loading={loading}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingSession ? "Edit Session" : "Add Session"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="px-3 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
              {formError}
            </div>
          )}
          <Input
            label="Session Name"
            id="session-name"
            placeholder="e.g. 2025-26"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Start Date"
            id="session-start-date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
            // On edit, dates can only shrink: start may move forward (later)
            // but never earlier than its original value.
            min={editingSession ? editingSession.start_date?.slice(0, 10) : undefined}
            max={editingSession ? editingSession.end_date?.slice(0, 10) : undefined}
          />
          <Input
            label="End Date"
            id="session-end-date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
            // On edit, end may move earlier but never past its original value.
            min={editingSession ? editingSession.start_date?.slice(0, 10) : undefined}
            max={editingSession ? editingSession.end_date?.slice(0, 10) : undefined}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={saving}
            >
              {editingSession ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
