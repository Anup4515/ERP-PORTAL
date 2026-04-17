"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  LoadingSkeleton,
} from "@/app/components/shared";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface TeacherDetail {
  user_id: number;
  name: string;
  email: string;
  phone_number: string | null;
  teacher_id: number;
  subject_specialization: string | null;
  qualification: string | null;
  experience: number | null;
  date_of_joining: string | null;
  teacher_type: string | null;
  bio: string | null;
  address: string | null;
  profile_image: string | null;
  number_of_hours: number | null;
}

interface ClassAssignment {
  class_section_id: number;
  class_name: string;
  section_name: string;
  role: string;
}

interface SubjectAssignment {
  id: number;
  subject_name: string;
  class_name: string;
  section_name: string;
}

interface Assignments {
  class_assignments: ClassAssignment[];
  subject_assignments: SubjectAssignment[];
}

interface Section {
  id: number;
  name: string;
  class_section_id: number | null;
}

interface ClassData {
  id: number;
  name: string;
  sections: Section[];
}

interface SubjectData {
  id: number;
  name: string;
  code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
}

interface EditForm {
  name: string;
  phone_number: string;
  subject_specialization: string;
  qualification: string;
  date_of_joining: string;
  bio: string;
  address: string;
}

export default function TeacherDetailPage() {
  const params = useParams();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: "",
    phone_number: "",
    subject_specialization: "",
    qualification: "",
    date_of_joining: "",
    bio: "",
    address: "",
  });

  // Assignment modal state
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classFormClassId, setClassFormClassId] = useState("");
  const [classFormSectionId, setClassFormSectionId] = useState("");
  const [classFormRole, setClassFormRole] = useState("");
  const [subjectFormClassId, setSubjectFormClassId] = useState("");
  const [subjectFormSectionId, setSubjectFormSectionId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchTeacher = useCallback(async () => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`);
      const json = await res.json();
      if (json.data) {
        setTeacher(json.data);
        setForm({
          name: json.data.name || "",
          phone_number: json.data.phone_number || "",
          subject_specialization: json.data.subject_specialization || "",
          qualification: json.data.qualification || "",
          date_of_joining: json.data.date_of_joining ? json.data.date_of_joining.split("T")[0] : "",
          bio: json.data.bio || "",
          address: json.data.address || "",
        });
      }
    } catch {
      // silently fail
    }
  }, [teacherId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/assignments`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAssignments(json.data);
        }
      }
    } catch {
      // silently fail — assignments endpoint may not exist yet
    }
  }, [teacherId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchTeacher(), fetchAssignments()]);
      setLoading(false);
    }
    load();
  }, [fetchTeacher, fetchAssignments]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === "phone_number" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
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

  const handleSave = async () => {
    if (!teacher || !validateForm()) return;
    setSaving(true);
    try {
      const body: Record<string, string | number> = { name: form.name };
      if (form.phone_number) body.phone_number = form.phone_number;
      if (form.subject_specialization)
        body.subject_specialization = form.subject_specialization;
      if (form.qualification) body.qualification = form.qualification;
      body.date_of_joining = form.date_of_joining || "";
      if (form.bio) body.bio = form.bio;
      if (form.address) body.address = form.address;

      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsEditing(false);
        await fetchTeacher();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  // Fetch classes for assignment dropdowns
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const json = await res.json();
        setClasses(json.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch subjects for a class-section
  const fetchSubjectsForSection = useCallback(async (classSectionId: string) => {
    try {
      const res = await fetch(`/api/subjects?class_section_id=${classSectionId}`);
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.data || []);
      }
    } catch {
      setSubjects([]);
    }
  }, []);

  // Get sections for a selected class
  const getSelectedClassSections = (classId: string) => {
    const cls = classes.find((c) => String(c.id) === classId);
    return cls?.sections.filter((s) => s.class_section_id) || [];
  };

  // Get class_section_id from class + section selection
  const getClassSectionId = (classId: string, sectionId: string) => {
    const cls = classes.find((c) => String(c.id) === classId);
    const sec = cls?.sections.find((s) => String(s.id) === sectionId);
    return sec?.class_section_id;
  };

  // Open class assignment modal
  const openClassAssignModal = () => {
    setClassFormClassId("");
    setClassFormSectionId("");
    setClassFormRole("");
    setAssignError(null);
    fetchClasses();
    setShowClassModal(true);
  };

  // Open subject assignment modal
  const openSubjectAssignModal = () => {
    setSubjectFormClassId("");
    setSubjectFormSectionId("");
    setSelectedSubjectIds([]);
    setSubjects([]);
    setAssignError(null);
    fetchClasses();
    setShowSubjectModal(true);
  };

  // Save class assignment
  const handleSaveClassAssignment = async () => {
    const classSectionId = getClassSectionId(classFormClassId, classFormSectionId);
    if (!classSectionId || !classFormRole) {
      setAssignError("Please select class, section, and role.");
      return;
    }

    setAssignSaving(true);
    setAssignError(null);
    try {
      // Merge with existing assignments
      const existing = assignments?.class_assignments || [];
      const newAssignments = [
        ...existing.map((a) => ({
          class_section_id: a.class_section_id,
          role: a.role,
        })),
        { class_section_id: classSectionId, role: classFormRole },
      ];

      const res = await fetch(`/api/teachers/${teacherId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_assignments: newAssignments,
          subject_assignments: (assignments?.subject_assignments || []).map((s) => s.id),
        }),
      });

      if (res.ok) {
        setShowClassModal(false);
        await fetchAssignments();
      } else {
        const json = await res.json();
        setAssignError(json.error || "Failed to save assignment.");
      }
    } catch {
      setAssignError("Failed to save assignment.");
    } finally {
      setAssignSaving(false);
    }
  };

  // Save subject assignment
  const handleSaveSubjectAssignment = async () => {
    if (selectedSubjectIds.length === 0) {
      setAssignError("Please select at least one subject.");
      return;
    }

    setAssignSaving(true);
    setAssignError(null);
    try {
      // Merge with existing subject assignments
      const existingSubjectIds = (assignments?.subject_assignments || []).map((s) => s.id);
      const allSubjectIds = [...new Set([...existingSubjectIds, ...selectedSubjectIds])];

      const res = await fetch(`/api/teachers/${teacherId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_assignments: (assignments?.class_assignments || []).map((a) => ({
            class_section_id: a.class_section_id,
            role: a.role,
          })),
          subject_assignments: allSubjectIds,
        }),
      });

      if (res.ok) {
        setShowSubjectModal(false);
        await fetchAssignments();
      } else {
        const json = await res.json();
        setAssignError(json.error || "Failed to save assignment.");
      }
    } catch {
      setAssignError("Failed to save assignment.");
    } finally {
      setAssignSaving(false);
    }
  };

  // Remove a class assignment
  const handleRemoveClassAssignment = async (classSectionId: number) => {
    setAssignSaving(true);
    try {
      const remaining = (assignments?.class_assignments || [])
        .filter((a) => a.class_section_id !== classSectionId)
        .map((a) => ({ class_section_id: a.class_section_id, role: a.role }));

      await fetch(`/api/teachers/${teacherId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_assignments: remaining,
          subject_assignments: (assignments?.subject_assignments || []).map((s) => s.id),
        }),
      });
      await fetchAssignments();
    } catch {
      // silently fail
    } finally {
      setAssignSaving(false);
    }
  };

  // Remove a subject assignment
  const handleRemoveSubjectAssignment = async (subjectId: number) => {
    setAssignSaving(true);
    try {
      const remainingSubjectIds = (assignments?.subject_assignments || [])
        .filter((s) => s.id !== subjectId)
        .map((s) => s.id);

      await fetch(`/api/teachers/${teacherId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_assignments: (assignments?.class_assignments || []).map((a) => ({
            class_section_id: a.class_section_id,
            role: a.role,
          })),
          subject_assignments: remainingSubjectIds,
        }),
      });
      await fetchAssignments();
    } catch {
      // silently fail
    } finally {
      setAssignSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (teacher) {
      setForm({
        name: teacher.name || "",
        phone_number: teacher.phone_number || "",
        subject_specialization: teacher.subject_specialization || "",
        qualification: teacher.qualification || "",
        date_of_joining: teacher.date_of_joining ? teacher.date_of_joining.split("T")[0] : "",
        bio: teacher.bio || "",
        address: teacher.address || "",
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/school-admin/teachers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Teachers
        </Link>
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <Link
          href="/school-admin/teachers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Teachers
        </Link>
        <Card>
          <p className="text-gray-500 text-center py-8">Teacher not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/school-admin/teachers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Teachers
      </Link>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary-900">
            Teacher Profile
          </h2>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              error={formErrors.name}
            />
            <Input
              label="Email"
              name="email"
              value={teacher.email}
              disabled
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
            />
            <Input
              label="Qualification"
              name="qualification"
              value={form.qualification}
              onChange={handleFormChange}
            />
            <div>
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
                <p className="text-xs text-gray-500 mt-1">
                  Experience: <span className="font-medium text-primary-700">
                    {(() => {
                      const doj = new Date(form.date_of_joining);
                      const now = new Date();
                      const years = Math.floor((now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                      const months = Math.floor(((now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) % 12);
                      if (years > 0) return `${years} yr${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
                      return `${months} month${months !== 1 ? "s" : ""}`;
                    })()}
                  </span>
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Bio
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleFormChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Short bio..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleFormChange}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Address..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <InfoRow label="Name" value={teacher.name} />
            <InfoRow label="Email" value={teacher.email} />
            <InfoRow label="Phone" value={teacher.phone_number} />
            <InfoRow
              label="Specialization"
              value={teacher.subject_specialization}
            />
            <InfoRow label="Qualification" value={teacher.qualification} />
            <InfoRow
              label="Date of Joining"
              value={
                teacher.date_of_joining
                  ? new Date(teacher.date_of_joining).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : null
              }
            />
            <InfoRow
              label="Experience"
              value={
                teacher.experience != null
                  ? `${teacher.experience} year${teacher.experience !== 1 ? "s" : ""}`
                  : null
              }
            />
            <div className="md:col-span-2">
              <InfoRow label="Bio" value={teacher.bio} />
            </div>
            <div className="md:col-span-2">
              <InfoRow label="Address" value={teacher.address} />
            </div>
          </div>
        )}
      </Card>

      {/* Class Assignments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary-900">
            Class Assignments
          </h2>
          <Button variant="primary" size="sm" onClick={openClassAssignModal}>
            <PlusIcon className="h-4 w-4" />
            Add Assignment
          </Button>
        </div>
        {assignments?.class_assignments &&
        assignments.class_assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.class_assignments.map((a, i) => (
                  <tr
                    key={i}
                    className="hover:bg-primary-50/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-700">
                      {a.class_name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{a.section_name}</td>
                    <td className="px-6 py-3 text-gray-700 capitalize">
                      {a.role?.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRemoveClassAssignment(a.class_section_id)}
                        disabled={assignSaving}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove assignment"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No class assignments found.</p>
        )}
      </Card>

      {/* Subject Assignments */}
      {/* <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary-900">
            Subject Assignments
          </h2>
          <Button variant="primary" size="sm" onClick={openSubjectAssignModal}>
            <PlusIcon className="h-4 w-4" />
            Assign Subject
          </Button>
        </div>
        {assignments?.subject_assignments &&
        assignments.subject_assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.subject_assignments.map((a, i) => (
                  <tr
                    key={i}
                    className="hover:bg-primary-50/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-700">
                      {a.subject_name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {a.class_name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{a.section_name}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRemoveSubjectAssignment(a.id)}
                        disabled={assignSaving}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove assignment"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No subject assignments found.
          </p>
        )}
      </Card> */}

      {/* Add Class Assignment Modal */}
      <Modal
        isOpen={showClassModal}
        onClose={() => setShowClassModal(false)}
        title="Add Class Assignment"
      >
        <div className="space-y-4">
          {assignError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{assignError}</p>
          )}
          <Select
            label="Class"
            value={classFormClassId}
            onChange={(e) => {
              setClassFormClassId(e.target.value);
              setClassFormSectionId("");
            }}
            options={[
              { value: "", label: "Select a class" },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Select
            label="Section"
            value={classFormSectionId}
            onChange={(e) => setClassFormSectionId(e.target.value)}
            options={[
              { value: "", label: "Select a section" },
              ...getSelectedClassSections(classFormClassId).map((s) => ({
                value: String(s.id),
                label: s.name,
              })),
            ]}
            disabled={!classFormClassId}
          />
          <Select
            label="Role"
            value={classFormRole}
            onChange={(e) => setClassFormRole(e.target.value)}
            options={[
              { value: "", label: "Select a role" },
              { value: "class_teacher", label: "Class Teacher" },
              { value: "second_incharge", label: "Second Incharge" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowClassModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={assignSaving}
              onClick={handleSaveClassAssignment}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Subject Modal */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Assign Subjects"
      >
        <div className="space-y-4">
          {assignError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{assignError}</p>
          )}
          <Select
            label="Class"
            value={subjectFormClassId}
            onChange={(e) => {
              setSubjectFormClassId(e.target.value);
              setSubjectFormSectionId("");
              setSubjects([]);
              setSelectedSubjectIds([]);
            }}
            options={[
              { value: "", label: "Select a class" },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Select
            label="Section"
            value={subjectFormSectionId}
            onChange={(e) => {
              setSubjectFormSectionId(e.target.value);
              setSelectedSubjectIds([]);
              const csId = getClassSectionId(subjectFormClassId, e.target.value);
              if (csId) {
                fetchSubjectsForSection(String(csId));
              } else {
                setSubjects([]);
              }
            }}
            options={[
              { value: "", label: "Select a section" },
              ...getSelectedClassSections(subjectFormClassId).map((s) => ({
                value: String(s.id),
                label: s.name,
              })),
            ]}
            disabled={!subjectFormClassId}
          />
          {subjects.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Select Subjects
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {subjects.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(sub.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubjectIds((prev) => [...prev, sub.id]);
                        } else {
                          setSelectedSubjectIds((prev) =>
                            prev.filter((id) => id !== sub.id)
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {sub.name}
                      {sub.teacher_name && (
                        <span className="text-gray-400 ml-1">
                          (assigned to {sub.teacher_name})
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {subjectFormSectionId && subjects.length === 0 && (
            <p className="text-sm text-gray-500">
              No subjects found for this class-section. Add subjects in Settings first.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSubjectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={assignSaving}
              onClick={handleSaveSubjectAssignment}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "-"}</dd>
    </div>
  );
}
