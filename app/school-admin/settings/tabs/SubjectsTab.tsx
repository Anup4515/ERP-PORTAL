"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  DataTable,
  EmptyState,
  LoadingSkeleton,
} from "@/app/components/shared";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Section {
  id: number;
  name: string;
  class_section_id: number;
}

interface ClassItem {
  id: number;
  name: string;
  sections: Section[];
}

interface ClassSectionOption {
  class_section_id: number;
  label: string;
}

interface Subject {
  id: number;
  class_section_id: number;
  name: string;
  code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  sort_order: number;
}

interface SubjectForm {
  name: string;
  code: string;
  sort_order: string;
}

const initialForm: SubjectForm = {
  name: "",
  code: "",
  sort_order: "0",
};

export default function SubjectsTab() {
  const { isViewingPastSession, withSessionId, viewingSession } = useViewingSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassSectionId, setSelectedClassSectionId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SubjectForm, string>>>({});
  const [saving, setSaving] = useState(false);

  // Multi-class selection for adding subjects
  const [selectedCsIds, setSelectedCsIds] = useState<Set<number>>(new Set());

  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        setClassesLoading(true);
        const res = await fetch(withSessionId("/api/classes"));
        if (!res.ok) throw new Error("Failed to fetch classes");
        const json = await res.json();
        setClasses(json.data || []);
      } catch {
        setBanner({ type: "error", message: "Failed to load classes. Please try again." });
      } finally {
        setClassesLoading(false);
      }
    }
    fetchClasses();
  }, [withSessionId, viewingSession?.id]);

  // Fetch subjects when class-section changes
  const fetchSubjects = useCallback(async (classSectionId: string) => {
    if (!classSectionId) {
      setSubjects([]);
      return;
    }
    try {
      setSubjectsLoading(true);
      const res = await fetch(withSessionId(`/api/subjects?class_section_id=${classSectionId}`));
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await res.json();
      setSubjects(json.data || []);
    } catch {
      setBanner({ type: "error", message: "Failed to load subjects. Please try again." });
    } finally {
      setSubjectsLoading(false);
    }
  }, [withSessionId, viewingSession?.id]);

  useEffect(() => {
    fetchSubjects(selectedClassSectionId);
  }, [selectedClassSectionId, fetchSubjects]);

  // Build class-section options
  const classSectionOptions = [
    { value: "", label: "-- Select Class & Section --" },
    ...classes.flatMap((cls) =>
      cls.sections
        .filter((sec) => sec.class_section_id)
        .map((sec) => ({
          value: String(sec.class_section_id),
          label: `${cls.name} - ${sec.name}`,
        }))
    ),
  ];

  // Flat list of all class-sections for multi-select checkboxes
  const allClassSections: ClassSectionOption[] = classes.flatMap((cls) =>
    cls.sections
      .filter((sec) => sec.class_section_id)
      .map((sec) => ({
        class_section_id: sec.class_section_id,
        label: `${cls.name} - ${sec.name}`,
      }))
  );

  function toggleCsId(csId: number) {
    setSelectedCsIds((prev) => {
      const next = new Set(prev);
      if (next.has(csId)) next.delete(csId);
      else next.add(csId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedCsIds.size === allClassSections.length) {
      setSelectedCsIds(new Set());
    } else {
      setSelectedCsIds(new Set(allClassSections.map((cs) => cs.class_section_id)));
    }
  }

  // Modal helpers
  function openAddModal() {
    if (isViewingPastSession) return;
    setEditingSubject(null);
    setForm(initialForm);
    setFormErrors({});
    // Pre-select the currently viewed class-section
    if (selectedClassSectionId) {
      setSelectedCsIds(new Set([parseInt(selectedClassSectionId, 10)]));
    } else {
      setSelectedCsIds(new Set());
    }
    setModalOpen(true);
  }

  function openEditModal(subject: Subject) {
    if (isViewingPastSession) return;
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code || "",
      sort_order: String(subject.sort_order ?? 0),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSubject(null);
    setForm(initialForm);
    setFormErrors({});
    setSelectedCsIds(new Set());
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof SubjectForm]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof SubjectForm, string>> = {};
    if (!form.name.trim()) {
      errors.name = "Subject name is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    // For new subjects, must have at least one class-section selected
    if (!editingSubject && selectedCsIds.size === 0) {
      setBanner({ type: "error", message: "Please select at least one class & section." });
      return;
    }

    try {
      setSaving(true);
      setBanner(null);

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        sort_order: form.sort_order ? parseInt(form.sort_order, 10) : 0,
      };

      let res: Response;

      if (editingSubject) {
        res = await fetch(withSessionId(`/api/subjects/${editingSubject.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.class_section_ids = Array.from(selectedCsIds);
        res = await fetch(withSessionId("/api/subjects"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save subject");
      }

      const json = await res.json();
      setBanner({
        type: "success",
        message: editingSubject
          ? "Subject updated successfully."
          : json.message || "Subject created successfully.",
      });
      closeModal();
      fetchSubjects(selectedClassSectionId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save subject.";
      setBanner({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }

  // DataTable columns
  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code", render: (row: Record<string, unknown>) => (row.code as string) || "-" },
    {
      key: "sort_order",
      label: "Sort Order",
      render: (row: Record<string, unknown>) => String(row.sort_order ?? 0),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openEditModal(row as unknown as Subject)}
            disabled={isViewingPastSession}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  if (classesLoading) {
    return (
      <Card>
        <LoadingSkeleton lines={6} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            banner.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {banner.message}
        </div>
      )}

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage subjects for each class and section
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="flex-1 max-w-sm">
            <Select
              label="Class & Section"
              name="class_section_id"
              options={classSectionOptions}
              value={selectedClassSectionId}
              onChange={(e) => setSelectedClassSectionId(e.target.value)}
            />
          </div>

          {selectedClassSectionId && (
            <Button variant="primary" onClick={openAddModal} disabled={isViewingPastSession}>
              Add Subject
            </Button>
          )}
        </div>

        {!selectedClassSectionId ? (
          <EmptyState
            title="Select a class and section"
            description="Choose a class and section from the dropdown above to manage its subjects."
          />
        ) : (
          <DataTable
            columns={columns}
            data={subjects as unknown as Record<string, unknown>[]}
            loading={subjectsLoading}
            emptyMessage="No subjects found for this class section. Click 'Add Subject' to create one."
          />
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingSubject ? "Edit Subject" : "Add Subject"}
      >
        <div className="space-y-4">
          <Input
            label="Subject Name *"
            id="subject-name"
            name="name"
            value={form.name}
            onChange={handleFormChange}
            placeholder="e.g. Mathematics"
            error={formErrors.name}
          />
          <Input
            label="Code"
            id="subject-code"
            name="code"
            value={form.code}
            onChange={handleFormChange}
            placeholder="e.g. MATH"
          />
          <Input
            label="Sort Order"
            id="subject-sort-order"
            name="sort_order"
            type="number"
            value={form.sort_order}
            onChange={handleFormChange}
            placeholder="0"
          />

          {/* Multi-class selection (only for new subjects) */}
          {!editingSubject && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Apply to Classes & Sections *
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
                >
                  {selectedCsIds.size === allClassSections.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                {allClassSections.map((cs) => (
                  <label
                    key={cs.class_section_id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCsIds.has(cs.class_section_id)}
                      onChange={() => toggleCsId(cs.class_section_id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{cs.label}</span>
                  </label>
                ))}
              </div>
              {selectedCsIds.size > 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  {selectedCsIds.size} class section{selectedCsIds.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingSubject ? "Update" : `Create${!editingSubject && selectedCsIds.size > 1 ? ` (${selectedCsIds.size} classes)` : ""}`}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
