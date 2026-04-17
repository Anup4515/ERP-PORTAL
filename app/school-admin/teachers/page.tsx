"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  DataTable,
  Modal,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
} from "@/app/components/shared";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Teacher {
  user_id: number;
  name: string;
  email: string;
  phone_number: string | null;
  teacher_id: number;
  subject_specialization: string | null;
  qualification: string | null;
  experience: number | null;
  teacher_type: string | null;
}

interface TeacherForm {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  subject_specialization: string;
  qualification: string;
  date_of_joining: string;
}

const emptyForm: TeacherForm = {
  name: "",
  email: "",
  password: "",
  phone_number: "",
  subject_specialization: "",
  qualification: "",
  date_of_joining: "",
};

export default function TeachersListPage() {
  const { isViewingPastSession } = useViewingSession();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<TeacherForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/teachers?${params}`);
      const json = await res.json();
      if (json.data) {
        setTeachers(json.data.teachers || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchTeachers(); }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTeachers, search]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(total / pageSize);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue =
      name === "phone_number" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (formErrors[name as keyof TeacherForm]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<TeacherForm> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (!form.password.trim()) {
      errors.password = "Password is required";
    } else if (form.password.trim().length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (form.phone_number.trim() && !/^\d{10}$/.test(form.phone_number.trim())) {
      errors.phone_number = "Phone number must be exactly 10 digits";
    }
    if (form.date_of_joining) {
      const doj = new Date(form.date_of_joining);
      if (doj > new Date()) {
        errors.date_of_joining = "Date of joining cannot be in the future";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const body: Record<string, string | number> = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.phone_number) body.phone_number = form.phone_number;
      if (form.subject_specialization)
        body.subject_specialization = form.subject_specialization;
      if (form.qualification) body.qualification = form.qualification;
      if (form.date_of_joining) body.date_of_joining = form.date_of_joining;

      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setForm(emptyForm);
        setFormErrors({});
        fetchTeachers();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeacher) return;
    try {
      const res = await fetch(`/api/teachers/${selectedTeacher.user_id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedTeacher(null);
        fetchTeachers();
      }
    } catch {
      // silently fail
    }
  };

  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: Record<string, unknown>) => (
        <span className="font-medium text-gray-900">
          {row.name as string}
        </span>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "phone_number",
      label: "Phone",
      render: (row: Record<string, unknown>) =>
        (row.phone_number as string) || "-",
    },
    {
      key: "subject_specialization",
      label: "Specialization",
      render: (row: Record<string, unknown>) =>
        (row.subject_specialization as string) || "-",
    },
    {
      key: "qualification",
      label: "Qualification",
      render: (row: Record<string, unknown>) =>
        (row.qualification as string) || "-",
    },
    {
      key: "experience",
      label: "Experience",
      render: (row: Record<string, unknown>) => {
        const doj = row.date_of_joining as string | null;
        if (!doj) return row.experience != null ? `${row.experience} yrs` : "-";
        const joining = new Date(doj);
        const now = new Date();
        const totalMonths = (now.getFullYear() - joining.getFullYear()) * 12 + (now.getMonth() - joining.getMonth());
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        if (years > 0) return `${years} yr${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
        return months > 0 ? `${months} mo` : "-";
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/school-admin/teachers/${row.user_id}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={() => { if (isViewingPastSession) return; openDeleteDialog(row as unknown as Teacher); }}
            disabled={isViewingPastSession}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderForm = () => (
    <div className="space-y-4">
      <Input
        label="Name *"
        name="name"
        value={form.name}
        onChange={handleFormChange}
        placeholder="Full name"
        error={formErrors.name}
      />
      <Input
        label="Email *"
        name="email"
        type="email"
        value={form.email}
        onChange={handleFormChange}
        placeholder="email@example.com"
        error={formErrors.email}
      />
      <Input
        label="Password *"
        name="password"
        type="password"
        value={form.password}
        onChange={handleFormChange}
        placeholder="Password (min 6 characters)"
        error={formErrors.password}
      />
      <Input
        label="Phone Number"
        name="phone_number"
        type="tel"
        inputMode="numeric"
        value={form.phone_number}
        onChange={handleFormChange}
        placeholder="10-digit phone number"
        maxLength={10}
        error={formErrors.phone_number}
      />
      <Input
        label="Subject Specialization"
        name="subject_specialization"
        value={form.subject_specialization}
        onChange={handleFormChange}
        placeholder="e.g. Mathematics"
      />
      <Input
        label="Qualification"
        name="qualification"
        value={form.qualification}
        onChange={handleFormChange}
        placeholder="e.g. M.Sc, B.Ed"
      />
      <Input
        label="Date of Joining"
        name="date_of_joining"
        type="date"
        value={form.date_of_joining}
        onChange={handleFormChange}
        max={new Date().toISOString().slice(0, 10)}
        error={formErrors.date_of_joining}
      />
      {form.date_of_joining && new Date(form.date_of_joining) <= new Date() && (
        <p className="text-sm text-gray-600 -mt-2">
          Experience: <span className="font-medium text-primary-700">
            {(() => {
              const doj = new Date(form.date_of_joining);
              const now = new Date();
              const years = Math.floor((now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
              const months = Math.floor(((now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) % 12);
              if (years > 0) return `${years} year${years > 1 ? "s" : ""}${months > 0 ? ` ${months} month${months > 1 ? "s" : ""}` : ""}`;
              return `${months} month${months !== 1 ? "s" : ""}`;
            })()}
          </span> 
        </p>
      )}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setIsAddOpen(false);
            setForm(emptyForm);
            setFormErrors({});
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={submitting}
          disabled={isViewingPastSession}
          onClick={handleAdd}
        >
          Add Teacher
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
              Teachers
            </h1>
            <p className="text-gray-500 mt-1 text-base">
              Manage your school&apos;s teaching staff
            </p>
          </div>
        </div>
        <LoadingSkeleton lines={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
            Teachers
          </h1>
          <p className="text-gray-500 mt-1 text-base">
            Manage your school&apos;s teaching staff
          </p>
        </div>
        <Button
          variant="primary"
          disabled={isViewingPastSession}
          onClick={() => {
            setForm(emptyForm);
            setFormErrors({});
            setIsAddOpen(true);
          }}
        >
          <PlusIcon className="h-5 w-5" />
          Add Teacher
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {teachers.length === 0 ? (
        <EmptyState
          icon={<UserGroupIcon className="h-12 w-12" />}
          title="No teachers found"
          description={search ? "No teachers match your search." : "Get started by adding your first teacher to the system."}
          action={!search ? {
            label: "Add Teacher",
            onClick: () => {
              setForm(emptyForm);
              setFormErrors({});
              setIsAddOpen(true);
            },
          } : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={teachers as unknown as Record<string, unknown>[]}
            emptyMessage="No teachers match your search."
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setForm(emptyForm);
          setFormErrors({});
        }}
        title="Add Teacher"
        size="lg"
      >
        {renderForm()}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedTeacher(null);
        }}
        onConfirm={handleDelete}
        title="Remove Teacher"
        message={`Are you sure you want to remove ${selectedTeacher?.name || "this teacher"}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
