"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/app/components/shared/Button";
import Input from "@/app/components/shared/Input";
import Modal from "@/app/components/shared/Modal";
import DataTable from "@/app/components/shared/DataTable";
import Badge from "@/app/components/shared/Badge";
import ConfirmDialog from "@/app/components/shared/ConfirmDialog";
import EmptyState from "@/app/components/shared/EmptyState";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null);

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
    setEditingSession(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const openEditModal = (session: Session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      start_date: session.start_date?.slice(0, 10) ?? "",
      end_date: session.end_date?.slice(0, 10) ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSession(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingSession
        ? `/api/sessions/${editingSession.id}`
        : "/api/sessions";
      const method = editingSession ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      closeModal();
      await fetchSessions();
    } catch (err) {
      console.error("Failed to save session:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/sessions/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchSessions();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleSetCurrent = async (sessionId: string) => {
    setSettingCurrent(sessionId);
    try {
      await fetch(`/api/sessions/${sessionId}/set-current`, { method: "POST" });
      await fetchSessions();
    } catch (err) {
      console.error("Failed to set current session:", err);
    } finally {
      setSettingCurrent(null);
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
        return (
          <div className="flex items-center gap-2">
            {!session.is_current && (
              <Button
                variant="outline"
                size="sm"
                loading={settingCurrent === session.id}
                onClick={() => handleSetCurrent(session.id)}
              >
                Set Current
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(session)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(session)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
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
        <Button variant="primary" size="md" onClick={openCreateModal}>
          Add Session
        </Button>
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
          action={{ label: "Add Session", onClick: openCreateModal }}
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
          />
          <Input
            label="End Date"
            id="session-end-date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        message={`Are you sure you want to delete the session "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
