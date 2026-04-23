"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Input,
  Select,
  DataTable,
  Badge,
  Modal,
  ConfirmDialog,
} from "@/app/components/shared";
import {
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import { scrollToFirstError } from "@/app/lib/form-scroll";

interface ClassSection {
  class_section_id: string;
  name: string;
}

interface ClassWithSections {
  id: string;
  name: string;
  sections: ClassSection[];
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  status: string;
  enrollment_id: string;
  class_section_id: string;
  roll_number: string;
  student_type: string;
  enrollment_status: string;
  class_name: string;
  section_name: string;
}

interface StudentForm {
  first_name: string;
  last_name: string;
  email: string;
  class_section_id: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  father_name: string;
  mother_name: string;
  roll_number: string;
  student_type: string;
}

const INITIAL_FORM: StudentForm = {
  first_name: "",
  last_name: "",
  email: "",
  class_section_id: "",
  gender: "",
  date_of_birth: "",
  phone: "",
  father_name: "",
  mother_name: "",
  roll_number: "",
  student_type: "",
};

const GENDER_OPTIONS = [
  { value: "", label: "Select Gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const STUDENT_TYPE_OPTIONS = [
  { value: "", label: "Select Type" },
  { value: "regular", label: "Regular" },
  { value: "transfer", label: "Transfer" },
  { value: "repeater", label: "Repeater" },
];

const LIMIT = 50;

export default function StudentsPage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const searchParams = useSearchParams();
  const initialClassSectionId = searchParams.get("class_section_id") || "";
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterClassSectionId, setFilterClassSectionId] = useState(initialClassSectionId);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<StudentForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build class-section options for dropdowns
  const classSectionOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "All Classes" },
    ];
    classes.forEach((cls) => {
      (cls.sections || []).forEach((sec) => {
        if (sec.class_section_id) {
          opts.push({
            value: sec.class_section_id,
            label: `${cls.name} - ${sec.name}`,
          });
        }
      });
    });
    return opts;
  }, [classes]);

  const classSectionFormOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "Select Class & Section" },
    ];
    classes.forEach((cls) => {
      (cls.sections || []).forEach((sec) => {
        if (sec.class_section_id) {
          opts.push({
            value: sec.class_section_id,
            label: `${cls.name} - ${sec.name}`,
          });
        }
      });
    });
    return opts;
  }, [classes]);

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch(withSessionId("/api/classes"));
        const json = await res.json();
        if (json.data) {
          setClasses(json.data);
        }
      } catch {
        // ignore
      }
    }
    fetchClasses();
  }, [viewingSession?.id]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClassSectionId) params.set("class_section_id", filterClassSectionId);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(withSessionId(`/api/students?${params.toString()}`));
      const json = await res.json();
      if (json.data) {
        setStudents(json.data.students || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [filterClassSectionId, search, page, viewingSession?.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Status badge helper
  function statusBadge(status: string) {
    const s = (status || "").toLowerCase();
    const variant =
      s === "active"
        ? "success"
        : s === "inactive" || s === "dropped"
          ? "danger"
          : s === "graduated"
            ? "info"
            : "default";
    return <Badge variant={variant} size="sm">{status || "N/A"}</Badge>;
  }

  // Table columns
  const columns = [
    { key: "roll_number", label: "Roll No" },
    {
      key: "name",
      label: "Name",
      render: (row: Record<string, unknown>) => (
        <span className="font-medium text-gray-900">
          {row.first_name as string} {row.last_name as string}
        </span>
      ),
    },
    { key: "class_name", label: "Class" },
    { key: "section_name", label: "Section" },
    { key: "gender", label: "Gender" },
    { key: "email", label: "Email" },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) =>
        statusBadge((row.enrollment_status || row.status || "") as string),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/school-admin/students/${row.id}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDeleteId(row.id as string)}
            disabled={isViewingPastSession}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Form handlers
  function updateForm(field: keyof StudentForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateForm(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (!form.first_name.trim()) errors.first_name = "First name is required";
    if (!form.last_name.trim()) errors.last_name = "Last name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (!form.class_section_id) errors.class_section_id = "Class & section is required";
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = "Phone number must be exactly 10 digits";
    }
    if (!form.roll_number.trim()) {
      errors.roll_number = "Roll number is required";
    } else if (!/^\d+$/.test(form.roll_number.trim())) {
      errors.roll_number = "Roll number must be positive";
    } else if (Number(form.roll_number.trim()) <= 0) {
      errors.roll_number = "Roll number must be greater than 0";
    }
    if (!form.student_type) {
      errors.student_type = "Student type is required";
    }
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      if (dob >= new Date()) {
        errors.date_of_birth = "Date of birth must be in the past";
      }
    }
    setFormErrors(errors);
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async function handleAddStudent() {
    const { valid, errors } = validateForm();
    if (!valid) {
      scrollToFirstError(
        [
          "first_name",
          "last_name",
          "email",
          "class_section_id",
          "gender",
          "date_of_birth",
          "phone",
          "father_name",
          "mother_name",
          "roll_number",
          "student_type",
        ],
        { errors }
      );
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        class_section_id: form.class_section_id,
      };
      if (form.gender) body.gender = form.gender;
      if (form.date_of_birth) body.date_of_birth = form.date_of_birth;
      if (form.phone) body.phone = form.phone;
      if (form.father_name) body.father_name = form.father_name;
      if (form.mother_name) body.mother_name = form.mother_name;
      if (form.roll_number) body.roll_number = form.roll_number;
      if (form.student_type) body.student_type = form.student_type;

      const res = await fetch(withSessionId("/api/students"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create student");
      }

      setShowAddModal(false);
      setForm(INITIAL_FORM);
      setFormErrors({});
      fetchStudents();
    } catch (err) {
      setFormErrors({ _general: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Import
  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch(withSessionId("/api/students/import"), {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.data) {
        setImportResult({
          imported: json.data.imported || 0,
          errors: json.data.errors || [],
        });
        fetchStudents();
      }
    } catch {
      setImportResult({ imported: 0, errors: ["Import failed. Please try again."] });
    } finally {
      setImporting(false);
    }
  }

  // Export
  async function handleExport() {
    const params = new URLSearchParams();
    if (filterClassSectionId) params.set("class_section_id", filterClassSectionId);
    const url = withSessionId(`/api/students/export${params.toString() ? `?${params.toString()}` : ""}`);
    window.open(url, "_blank");
  }

  // Delete
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(withSessionId(`/api/students/${deleteId}`), { method: "DELETE" });
      setDeleteId(null);
      fetchStudents();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
            Students
          </h1>
          <p className="text-gray-500 mt-1 text-base">
            Manage student records and enrollments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
            Import CSV
          </Button> */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export Excel
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} disabled={isViewingPastSession}>
            Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <Select
            name="classFilter"
            options={classSectionOptions}
            value={filterClassSectionId}
            onChange={(e) => {
              setFilterClassSectionId(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            name="search"
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No students found"
      />

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setForm(INITIAL_FORM);
          setFormErrors({});
        }}
        title="Add Student"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {formErrors._general && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {formErrors._general}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              name="first_name"
              value={form.first_name}
              onChange={(e) => updateForm("first_name", e.target.value)}
              error={formErrors.first_name}
            />
            <Input
              label="Last Name *"
              name="last_name"
              value={form.last_name}
              onChange={(e) => updateForm("last_name", e.target.value)}
              error={formErrors.last_name}
            />
          </div>

          <Input
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            error={formErrors.email}
          />

          <Select
            label="Class & Section *"
            name="class_section_id"
            options={classSectionFormOptions}
            value={form.class_section_id}
            onChange={(e) => updateForm("class_section_id", e.target.value)}
            error={formErrors.class_section_id}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              name="gender"
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(e) => updateForm("gender", e.target.value)}
            />
            <Input
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => updateForm("date_of_birth", e.target.value)}
              error={formErrors.date_of_birth}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit phone number"
              maxLength={10}
              error={formErrors.phone}
            />
            <Input
              label="Roll Number *"
              name="roll_number"
              type="number"
              min={1}
              inputMode="numeric"
              value={form.roll_number}
              onChange={(e) => updateForm("roll_number", e.target.value)}
              error={formErrors.roll_number}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Father's Name"
              name="father_name"
              value={form.father_name}
              onChange={(e) => updateForm("father_name", e.target.value)}
            />
            <Input
              label="Mother's Name"
              name="mother_name"
              value={form.mother_name}
              onChange={(e) => updateForm("mother_name", e.target.value)}
            />
          </div>

          <Select
            label="Student Type *"
            id="student_type"
            name="student_type"
            options={STUDENT_TYPE_OPTIONS}
            value={form.student_type}
            onChange={(e) => updateForm("student_type", e.target.value)}
            error={formErrors.student_type}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setForm(INITIAL_FORM);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleAddStudent}>
              Add Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }}
        title="Import Students from CSV"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
                setImportResult(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {importResult && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700">
                Successfully imported {importResult.imported} student(s).
              </p>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportResult(null);
              }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              loading={importing}
              disabled={!importFile}
              onClick={handleImport}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </div>
  );
}
