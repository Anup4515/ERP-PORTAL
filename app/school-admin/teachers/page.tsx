"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

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
  experience: string;
}

const emptyForm: TeacherForm = {
  name: "",
  email: "",
  password: "",
  phone_number: "",
  subject_specialization: "",
  qualification: "",
  experience: "",
};

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<TeacherForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teachers");
      const json = await res.json();
      if (json.data) {
        setTeachers(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof TeacherForm]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (isEdit: boolean): boolean => {
    const errors: Partial<TeacherForm> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!isEdit) {
      if (!form.email.trim()) errors.email = "Email is required";
      if (!form.password.trim()) errors.password = "Password is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm(false)) return;
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
      if (form.experience) body.experience = Number(form.experience);

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

  const handleEdit = async () => {
    if (!validateForm(true) || !selectedTeacher) return;
    setSubmitting(true);
    try {
      const body: Record<string, string | number> = {
        name: form.name,
      };
      if (form.phone_number) body.phone_number = form.phone_number;
      if (form.subject_specialization)
        body.subject_specialization = form.subject_specialization;
      if (form.qualification) body.qualification = form.qualification;
      if (form.experience) body.experience = Number(form.experience);

      const res = await fetch(`/api/teachers/${selectedTeacher.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsEditOpen(false);
        setSelectedTeacher(null);
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

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      phone_number: teacher.phone_number || "",
      subject_specialization: teacher.subject_specialization || "",
      qualification: teacher.qualification || "",
      experience: teacher.experience != null ? String(teacher.experience) : "",
    });
    setFormErrors({});
    setIsEditOpen(true);
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
        <Link
          href={`/school-admin/teachers/${row.user_id}`}
          className="text-primary-600 hover:text-primary-800 font-medium hover:underline"
        >
          {row.name as string}
        </Link>
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
      render: (row: Record<string, unknown>) =>
        row.experience != null ? `${row.experience} yrs` : "-",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/school-admin/teachers/${row.user_id}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View & Assign"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={() => openEditModal(row as unknown as Teacher)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => openDeleteDialog(row as unknown as Teacher)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <Input
        label="Name"
        name="name"
        value={form.name}
        onChange={handleFormChange}
        placeholder="Full name"
        error={formErrors.name}
      />
      {!isEdit && (
        <>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleFormChange}
            placeholder="email@example.com"
            error={formErrors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleFormChange}
            placeholder="Password"
            error={formErrors.password}
          />
        </>
      )}
      <Input
        label="Phone Number"
        name="phone_number"
        value={form.phone_number}
        onChange={handleFormChange}
        placeholder="Phone number"
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
        label="Experience (years)"
        name="experience"
        type="number"
        value={form.experience}
        onChange={handleFormChange}
        placeholder="Years of experience"
      />
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            isEdit ? setIsEditOpen(false) : setIsAddOpen(false);
            setForm(emptyForm);
            setFormErrors({});
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={submitting}
          onClick={isEdit ? handleEdit : handleAdd}
        >
          {isEdit ? "Save Changes" : "Add Teacher"}
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
          description="Get started by adding your first teacher to the system."
          action={{
            label: "Add Teacher",
            onClick: () => {
              setForm(emptyForm);
              setFormErrors({});
              setIsAddOpen(true);
            },
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredTeachers as unknown as Record<string, unknown>[]}
          emptyMessage="No teachers match your search."
        />
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
        {renderForm(false)}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTeacher(null);
          setForm(emptyForm);
          setFormErrors({});
        }}
        title="Edit Teacher"
        size="lg"
      >
        {renderForm(true)}
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
