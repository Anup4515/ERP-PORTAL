"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  DataTable,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
} from "@/app/components/shared";

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

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        const res = await fetch("/api/classes");
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
  }, []);

  // Fetch subjects when class-section changes
  const fetchSubjects = useCallback(async (classSectionId: string) => {
    if (!classSectionId) {
      setSubjects([]);
      return;
    }
    try {
      setSubjectsLoading(true);
      const res = await fetch(`/api/subjects?class_section_id=${classSectionId}`);
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await res.json();
      setSubjects(json.data || []);
    } catch {
      setBanner({ type: "error", message: "Failed to load subjects. Please try again." });
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects(selectedClassSectionId);
  }, [selectedClassSectionId, fetchSubjects]);

  // Build class-section options for the Select dropdown
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

  // Modal helpers
  function openAddModal() {
    setEditingSubject(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(subject: Subject) {
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
        res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.class_section_id = parseInt(selectedClassSectionId, 10);
        res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save subject");
      }

      setBanner({
        type: "success",
        message: editingSubject
          ? "Subject updated successfully."
          : "Subject created successfully.",
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

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setBanner(null);

      const res = await fetch(`/api/subjects/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to delete subject");
      }

      setBanner({ type: "success", message: "Subject deleted successfully." });
      setDeleteTarget(null);
      fetchSubjects(selectedClassSectionId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete subject.";
      setBanner({ type: "error", message });
    } finally {
      setDeleting(false);
    }
  }

  // DataTable columns
  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code", render: (row: Record<string, unknown>) => (row.code as string) || "-" },
    {
      key: "teacher_name",
      label: "Teacher",
      render: (row: Record<string, unknown>) => (row.teacher_name as string) || "-",
    },
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
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as Subject)}
          >
            Delete
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
            <Button variant="primary" onClick={openAddModal}>
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
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingSubject ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </div>
  );
}
