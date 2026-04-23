"use client";

import React, { useEffect, useState, useCallback } from "react";
import { scrollToFirstError } from "@/app/lib/form-scroll";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Card,
  DataTable,
  Badge,
  Modal,
  Tabs,
  LoadingSkeleton,
} from "@/app/components/shared";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  height: string;
  weight: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  status: string;
  [key: string]: unknown;
}

interface Enrollment {
  id: string;
  session_name: string;
  class_name: string;
  section_name: string;
  roll_number: string;
  student_type: string;
  status: string;
  [key: string]: unknown;
}

interface ClassSection {
  class_section_id: string;
  name: string;
}

interface ClassWithSections {
  id: string;
  name: string;
  sections: ClassSection[];
}

const STUDENT_TYPE_OPTIONS = [
  { value: "", label: "Select Type" },
  { value: "regular", label: "Regular" },
  { value: "transfer", label: "Transfer" },
  { value: "repeater", label: "Repeater" },
];

const TAB_LIST = [
  { key: "profile", label: "Profile" },
  { key: "enrollments", label: "Enrollments" },
];

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { isViewingPastSession } = useViewingSession();

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Add enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [enrollForm, setEnrollForm] = useState({
    class_section_id: "",
    roll_number: "",
    student_type: "",
  });
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const fetchStudent = useCallback(async () => {
    try {
      const res = await fetch(`/api/students/${studentId}`);
      const json = await res.json();
      if (json.data) {
        setStudent(json.data);
      }
    } catch {
      // ignore
    }
  }, [studentId]);

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await fetch(`/api/students/${studentId}/enrollments`);
      const json = await res.json();
      if (json.data) {
        setEnrollments(json.data);
      }
    } catch {
      // ignore
    }
  }, [studentId]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudent(), fetchEnrollments()]);
      setLoading(false);
    }
    loadData();
  }, [fetchStudent, fetchEnrollments]);

  // Fetch classes when enrollment modal opens
  useEffect(() => {
    if (!showEnrollModal) return;
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.data) setClasses(json.data);
      } catch {
        // ignore
      }
    }
    fetchClasses();
  }, [showEnrollModal]);

  const classSectionOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "Select Class & Section" },
    ];
    classes.forEach((cls) => {
      (cls.sections || []).forEach((sec) => {
        opts.push({
          value: sec.class_section_id,
          label: `${cls.name} - ${sec.name}`,
        });
      });
    });
    return opts;
  }, [classes]);

  // Edit handlers
  function startEditing() {
    if (isViewingPastSession) return;
    if (!student) return;
    setEditForm({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      email: student.email || "",
      phone: student.phone || "",
      gender: student.gender || "",
      date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : "",
      blood_group: student.blood_group || "",
      height: student.height || "",
      weight: student.weight || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone || "",
      address: student.address || "",
      city: student.city || "",
      state: student.state || "",
      country: student.country || "",
      postal_code: student.postal_code || "",
    });
    setSaveError("");
    setEditing(true);
  }

  function updateEditForm(field: string, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateEditForm(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (!editForm.first_name?.trim()) errors.first_name = "First name is required";
    if (!editForm.last_name?.trim()) errors.last_name = "Last name is required";
    if (!editForm.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (editForm.phone?.trim() && !/^\d{10}$/.test(editForm.phone.trim())) {
      errors.phone = "Phone number must be exactly 10 digits";
    }
    if (editForm.guardian_phone?.trim() && !/^\d{10}$/.test(editForm.guardian_phone.trim())) {
      errors.guardian_phone = "Guardian phone must be exactly 10 digits";
    }
    if (editForm.postal_code?.trim() && !/^\d{6}$/.test(editForm.postal_code.trim())) {
      errors.postal_code = "Postal code must be exactly 6 digits";
    }
    if (editForm.date_of_birth) {
      const dob = new Date(editForm.date_of_birth);
      if (dob >= new Date()) {
        errors.date_of_birth = "Date of birth must be in the past";
      }
    }
    setEditErrors(errors);
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async function handleSave() {
    const { valid, errors } = validateEditForm();
    if (!valid) {
      scrollToFirstError(
        [
          "first_name",
          "last_name",
          "email",
          "phone",
          "gender",
          "date_of_birth",
          "father_name",
          "mother_name",
          "guardian_phone",
          "address",
          "city",
          "state",
          "postal_code",
        ],
        { errors }
      );
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update student");
      }
      setEditing(false);
      fetchStudent();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Enrollment handlers
  async function handleAddEnrollment() {
    if (!enrollForm.class_section_id) {
      setEnrollError("Class & section is required");
      return;
    }
    const roll = enrollForm.roll_number.trim();
    if (!roll) {
      setEnrollError("Roll number is required");
      return;
    }
    if (!/^\d+$/.test(roll)) {
      setEnrollError("Roll number must be numeric");
      return;
    }
    if (Number(roll) <= 0) {
      setEnrollError("Roll number must be greater than 0");
      return;
    }
    if (!enrollForm.student_type) {
      setEnrollError("Student type is required");
      return;
    }
    setEnrollSaving(true);
    setEnrollError("");
    try {
      const body: Record<string, string> = {
        class_section_id: enrollForm.class_section_id,
      };
      if (enrollForm.roll_number) body.roll_number = enrollForm.roll_number;
      if (enrollForm.student_type) body.student_type = enrollForm.student_type;

      const res = await fetch(`/api/students/${studentId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create enrollment");
      }
      setShowEnrollModal(false);
      setEnrollForm({ class_section_id: "", roll_number: "", student_type: "" });
      fetchEnrollments();
    } catch (err) {
      setEnrollError((err as Error).message);
    } finally {
      setEnrollSaving(false);
    }
  }

  function statusBadge(status: string) {
    const s = (status || "").toLowerCase();
    const variant =
      s === "active"
        ? "success"
        : s === "inactive" || s === "dropped"
          ? "danger"
          : s === "graduated" || s === "completed"
            ? "info"
            : s === "promoted"
              ? "warning"
              : "default";
    return <Badge variant={variant} size="sm">{status || "N/A"}</Badge>;
  }

  function formatDate(value: string | undefined): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Info field display helper
  function InfoField({ label, value }: { label: string; value: string | undefined }) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-sm text-gray-900">{value || "-"}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <Card>
          <LoadingSkeleton lines={8} />
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <Link
          href="/school-admin/students"
          className="text-sm text-primary-600 hover:underline"
        >
          &larr; Back to Students
        </Link>
        <Card>
          <p className="text-gray-500 text-center py-8">Student not found.</p>
        </Card>
      </div>
    );
  }

  const enrollmentColumns = [
    { key: "session_name", label: "Session" },
    { key: "class_name", label: "Class" },
    { key: "section_name", label: "Section" },
    { key: "roll_number", label: "Roll No" },
    { key: "student_type", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row: Record<string, unknown>) =>
        statusBadge((row.status || "") as string),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back link & header */}
      <Link
        href="/school-admin/students"
        className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1"
      >
        &larr; Back to Students
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-gray-500 mt-1 text-base">{student.email}</p>
        </div>
        <div>{statusBadge(student.status)}</div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TAB_LIST} activeTab={activeTab} onChange={setActiveTab} />

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {!editing ? (
            <>
              {/* View mode */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-primary-900">
                    Personal Information
                  </h2>
                  <Button variant="outline" size="sm" onClick={startEditing} disabled={isViewingPastSession}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InfoField label="First Name" value={student.first_name} />
                  <InfoField label="Last Name" value={student.last_name} />
                  <InfoField label="Email" value={student.email} />
                  <InfoField label="Phone" value={student.phone} />
                  <InfoField label="Gender" value={student.gender} />
                  <InfoField label="Date of Birth" value={formatDate(student.date_of_birth)} />
                  <InfoField label="Blood Group" value={student.blood_group} />
                  <InfoField label="Height" value={student.height} />
                  <InfoField label="Weight" value={student.weight} />
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-primary-900 mb-6">
                  Family Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InfoField label="Father's Name" value={student.father_name} />
                  <InfoField label="Mother's Name" value={student.mother_name} />
                  <InfoField label="Guardian Name" value={student.guardian_name} />
                  <InfoField label="Guardian Phone" value={student.guardian_phone} />
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-primary-900 mb-6">
                  Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <InfoField label="Address" value={student.address} />
                  <InfoField label="City" value={student.city} />
                  <InfoField label="State" value={student.state} />
                  <InfoField label="Country" value={student.country} />
                  <InfoField label="Postal Code" value={student.postal_code} />
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* Edit mode */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-primary-900">
                    Edit Student
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={saving}
                      onClick={handleSave}
                      disabled={isViewingPastSession}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                    {saveError}
                  </p>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Input
                        label="First Name *"
                        name="first_name"
                        value={(editForm.first_name as string) || ""}
                        onChange={(e) => updateEditForm("first_name", e.target.value)}
                        error={editErrors.first_name}
                      />
                      <Input
                        label="Last Name *"
                        name="last_name"
                        value={(editForm.last_name as string) || ""}
                        onChange={(e) => updateEditForm("last_name", e.target.value)}
                        error={editErrors.last_name}
                      />
                      <Input
                        label="Email *"
                        name="email"
                        type="email"
                        value={(editForm.email as string) || ""}
                        onChange={(e) => updateEditForm("email", e.target.value)}
                        error={editErrors.email}
                      />
                      <Input
                        label="Phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        value={(editForm.phone as string) || ""}
                        onChange={(e) => updateEditForm("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit phone number"
                        maxLength={10}
                        error={editErrors.phone}
                      />
                      <Select
                        label="Gender"
                        name="gender"
                        options={[
                          { value: "", label: "Select Gender" },
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                          { value: "Other", label: "Other" },
                        ]}
                        value={(editForm.gender as string) || ""}
                        onChange={(e) => updateEditForm("gender", e.target.value)}
                      />
                      <Input
                        label="Date of Birth"
                        name="date_of_birth"
                        type="date"
                        value={(editForm.date_of_birth as string) || ""}
                        onChange={(e) => updateEditForm("date_of_birth", e.target.value)}
                        error={editErrors.date_of_birth}
                      />
                      <Input
                        label="Blood Group"
                        name="blood_group"
                        value={(editForm.blood_group as string) || ""}
                        onChange={(e) => updateEditForm("blood_group", e.target.value)}
                      />
                      <Input
                        label="Height"
                        name="height"
                        value={(editForm.height as string) || ""}
                        onChange={(e) => updateEditForm("height", e.target.value)}
                      />
                      <Input
                        label="Weight"
                        name="weight"
                        value={(editForm.weight as string) || ""}
                        onChange={(e) => updateEditForm("weight", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Family Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Input
                        label="Father's Name"
                        name="father_name"
                        value={(editForm.father_name as string) || ""}
                        onChange={(e) => updateEditForm("father_name", e.target.value)}
                      />
                      <Input
                        label="Mother's Name"
                        name="mother_name"
                        value={(editForm.mother_name as string) || ""}
                        onChange={(e) => updateEditForm("mother_name", e.target.value)}
                      />
                      <Input
                        label="Guardian Name"
                        name="guardian_name"
                        value={(editForm.guardian_name as string) || ""}
                        onChange={(e) => updateEditForm("guardian_name", e.target.value)}
                      />
                      <Input
                        label="Guardian Phone"
                        name="guardian_phone"
                        type="tel"
                        inputMode="numeric"
                        value={(editForm.guardian_phone as string) || ""}
                        onChange={(e) => updateEditForm("guardian_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit phone number"
                        maxLength={10}
                        error={editErrors.guardian_phone}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Address
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Input
                        label="Address"
                        name="address"
                        value={(editForm.address as string) || ""}
                        onChange={(e) => updateEditForm("address", e.target.value)}
                      />
                      <Input
                        label="City"
                        name="city"
                        value={(editForm.city as string) || ""}
                        onChange={(e) => updateEditForm("city", e.target.value)}
                      />
                      <Input
                        label="State"
                        name="state"
                        value={(editForm.state as string) || ""}
                        onChange={(e) => updateEditForm("state", e.target.value)}
                      />
                      <Input
                        label="Country"
                        name="country"
                        value={(editForm.country as string) || ""}
                        onChange={(e) => updateEditForm("country", e.target.value)}
                      />
                      <Input
                        label="Postal Code"
                        name="postal_code"
                        value={(editForm.postal_code as string) || ""}
                        onChange={(e) => updateEditForm("postal_code", e.target.value)}
                        maxLength={6}
                        error={editErrors.postal_code}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === "enrollments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowEnrollModal(true)}
              disabled={isViewingPastSession}
            >
              Add Enrollment
            </Button>
          </div>

          <DataTable
            columns={enrollmentColumns}
            data={enrollments as unknown as Record<string, unknown>[]}
            emptyMessage="No enrollment records found"
          />

          {/* Add Enrollment Modal */}
          <Modal
            isOpen={showEnrollModal}
            onClose={() => {
              setShowEnrollModal(false);
              setEnrollForm({ class_section_id: "", roll_number: "", student_type: "" });
              setEnrollError("");
            }}
            title="Add Enrollment"
          >
            <div className="space-y-4">
              {enrollError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {enrollError}
                </p>
              )}

              <Select
                label="Class & Section *"
                name="class_section_id"
                options={classSectionOptions}
                value={enrollForm.class_section_id}
                onChange={(e) =>
                  setEnrollForm((prev) => ({ ...prev, class_section_id: e.target.value }))
                }
              />

              <Input
                label="Roll Number *"
                name="roll_number"
                type="number"
                min={1}
                inputMode="numeric"
                value={enrollForm.roll_number}
                onChange={(e) =>
                  setEnrollForm((prev) => ({ ...prev, roll_number: e.target.value }))
                }
              />

              <Select
                label="Student Type *"
                name="student_type"
                options={STUDENT_TYPE_OPTIONS}
                value={enrollForm.student_type}
                onChange={(e) =>
                  setEnrollForm((prev) => ({ ...prev, student_type: e.target.value }))
                }
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollForm({ class_section_id: "", roll_number: "", student_type: "" });
                    setEnrollError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={enrollSaving}
                  onClick={handleAddEnrollment}
                  disabled={isViewingPastSession}
                >
                  Add Enrollment
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
