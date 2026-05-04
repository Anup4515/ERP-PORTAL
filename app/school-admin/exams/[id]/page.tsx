"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  LoadingSkeleton,
} from "@/app/components/shared";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

interface Exam {
  id: number;
  class_section_id: number;
  name: string;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  class_name: string;
  section_name: string;
}

interface Schedule {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string | null;
  exam_date: string | null;
  exam_time: string | null;
  duration_minutes: number | null;
  maximum_marks: number;
  room_number: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params.id as string;
  const { isViewingPastSession } = useViewingSession();

  const [exam, setExam] = useState<Exam | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit exam modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", code: "", start_date: "", end_date: "", status: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Edit schedule modal
  const [showSchedEditModal, setShowSchedEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [schedEditForm, setSchedEditForm] = useState({ exam_date: "", exam_time: "", duration_minutes: "", maximum_marks: "", room_number: "" });
  const [schedEditSaving, setSchedEditSaving] = useState(false);
  const [schedEditError, setSchedEditError] = useState("");

  const fetchExam = useCallback(async () => {
    try {
      const [examRes, schedRes] = await Promise.all([
        fetch(`/api/exams/${examId}`),
        fetch(`/api/exams/${examId}/schedule`),
      ]);
      if (examRes.ok) {
        const ej = await examRes.json();
        setExam(ej.data);
      }
      if (schedRes.ok) {
        const sj = await schedRes.json();
        setSchedules(sj.data || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  // Edit exam
  const openEditModal = () => {
    if (!exam) return;
    setEditForm({
      name: exam.name,
      code: exam.code || "",
      start_date: exam.start_date ? exam.start_date.split("T")[0] : "",
      end_date: exam.end_date ? exam.end_date.split("T")[0] : "",
      status: exam.status,
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (isViewingPastSession) return;
    setEditSaving(true);
    const res = await fetch(`/api/exams/${examId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setShowEditModal(false);
      await fetchExam();
    }
    setEditSaving(false);
  };

  // Edit schedule (date/time/marks for a subject)
  const openSchedEditModal = (sched: Schedule) => {
    setEditingSchedule(sched);
    setSchedEditForm({
      exam_date: sched.exam_date ? sched.exam_date.split("T")[0] : "",
      exam_time: sched.exam_time || "",
      duration_minutes: sched.duration_minutes ? String(sched.duration_minutes) : "",
      maximum_marks: String(sched.maximum_marks),
      room_number: sched.room_number || "",
    });
    setSchedEditError("");
    setShowSchedEditModal(true);
  };

  const handleSchedEditSave = async () => {
    if (isViewingPastSession) return;
    if (!editingSchedule) return;

    // Frontend date validation
    if (schedEditForm.exam_date && exam) {
      const date = new Date(schedEditForm.exam_date);
      if (exam.start_date && date < new Date(exam.start_date)) {
        setSchedEditError("Date cannot be before exam start date.");
        return;
      }
      if (exam.end_date && date > new Date(exam.end_date)) {
        setSchedEditError("Date cannot be after exam end date.");
        return;
      }
    }

    setSchedEditSaving(true);
    setSchedEditError("");

    // Use the schedule POST endpoint to update — but we need a PUT.
    // For now, delete and re-create with new data.
    // Actually, let me use the single-day PUT endpoint. But we don't have one for schedules.
    // Let's delete and re-add.
    try {
      // Delete old
      await fetch(`/api/exams/${examId}/schedule?schedule_id=${editingSchedule.id}`, { method: "DELETE" });
      // Re-create with updated values
      const res = await fetch(`/api/exams/${examId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: editingSchedule.subject_id,
          exam_date: schedEditForm.exam_date || null,
          exam_time: schedEditForm.exam_time || null,
          duration_minutes: schedEditForm.duration_minutes ? Number(schedEditForm.duration_minutes) : null,
          maximum_marks: Number(schedEditForm.maximum_marks) || 100,
          room_number: schedEditForm.room_number || null,
        }),
      });
      if (res.ok) {
        setShowSchedEditModal(false);
        await fetchExam();
      } else {
        const j = await res.json();
        setSchedEditError(j.error || "Failed to update.");
        // Re-fetch since we deleted
        await fetchExam();
      }
    } catch {
      setSchedEditError("Failed to update.");
    } finally {
      setSchedEditSaving(false);
    }
  };

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  if (loading)
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={10} />
      </div>
    );
  if (!exam)
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">Exam not found.</p>
      </Card>
    );

  return (
    <div className="space-y-6">
      <Link
        href="/school-admin/exams"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back to Exams
      </Link>

      {/* Exam Info */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-primary-900">
              {exam.name}
            </h2>
            <p className="text-sm text-gray-500">
              {exam.class_name} - {exam.section_name}
              {exam.code && ` | ${exam.code}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                STATUS_COLORS[exam.status] || ""
              }`}
            >
              {exam.status.replace("_", " ")}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={isViewingPastSession}
              onClick={openEditModal}
            >
              <PencilSquareIcon className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs uppercase">Start Date</span>
            <p className="font-medium">{formatDate(exam.start_date)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase">End Date</span>
            <p className="font-medium">{formatDate(exam.end_date)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase">Subjects</span>
            <p className="font-medium">{schedules.length}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase">
              Total Marks
            </span>
            <p className="font-medium">
              {schedules.reduce((s, sc) => s + Number(sc.maximum_marks), 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Schedule */}
      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">
          Exam Schedule
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Subjects are auto-added from the class. Click the edit icon to set
          date, time, duration, and max marks for each subject.
        </p>

        {schedules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No subjects found for this class-section. Add subjects in Settings
            first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Max Marks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Room
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.subject_name}
                      {s.subject_code && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({s.subject_code})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(s.exam_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.exam_time || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.duration_minutes ? `${s.duration_minutes} min` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {s.maximum_marks}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.room_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openSchedEditModal(s)}
                        disabled={isViewingPastSession}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isViewingPastSession ? "Read-only — past session" : "Edit schedule"}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Exam Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Exam"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Exam Name"
            value={editForm.name}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <Input
            label="Code"
            value={editForm.code}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, code: e.target.value }))
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, start_date: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, end_date: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, status: e.target.value }))
            }
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={editSaving}
              onClick={handleEditSave}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal
        isOpen={showSchedEditModal}
        onClose={() => setShowSchedEditModal(false)}
        title={
          editingSchedule
            ? `Edit Schedule — ${editingSchedule.subject_name}`
            : "Edit Schedule"
        }
        size="sm"
      >
        <div className="space-y-4">
          {schedEditError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {schedEditError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Exam Date
              </label>
              <input
                type="date"
                value={schedEditForm.exam_date}
                min={
                  exam.start_date ? exam.start_date.split("T")[0] : undefined
                }
                max={exam.end_date ? exam.end_date.split("T")[0] : undefined}
                onChange={(e) =>
                  setSchedEditForm((f) => ({
                    ...f,
                    exam_date: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Exam Time
              </label>
              <input
                type="time"
                value={schedEditForm.exam_time}
                onChange={(e) =>
                  setSchedEditForm((f) => ({
                    ...f,
                    exam_time: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Marks"
              type="number"
              value={schedEditForm.maximum_marks}
              onChange={(e) =>
                setSchedEditForm((f) => ({
                  ...f,
                  maximum_marks: e.target.value,
                }))
              }
            />
            <Input
              label="Duration (min)"
              type="number"
              value={schedEditForm.duration_minutes}
              onChange={(e) =>
                setSchedEditForm((f) => ({
                  ...f,
                  duration_minutes: e.target.value,
                }))
              }
            />
          </div>
          <Input
            label="Room Number"
            value={schedEditForm.room_number}
            onChange={(e) =>
              setSchedEditForm((f) => ({
                ...f,
                room_number: e.target.value,
              }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowSchedEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={schedEditSaving}
              onClick={handleSchedEditSave}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
