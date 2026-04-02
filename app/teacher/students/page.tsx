"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Select,
  Card,
  Button,
  Input,
  Modal,
  LoadingSkeleton,
} from "@/app/components/shared";
import {
  PlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

interface AssignedClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
}

interface Student {
  enrollment_id: number;
  student_id: number;
  roll_number: number | null;
  first_name: string;
  last_name: string;
  email: string | null;
  gender: string | null;
  phone: string | null;
}

interface StudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  father_name: string | null;
  mother_name: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
}

const emptyAddForm = {
  first_name: "",
  last_name: "",
  email: "",
  gender: "",
  date_of_birth: "",
  phone: "",
  roll_number: "",
  father_name: "",
  mother_name: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
};

export default function TeacherStudentsPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("class_section_id") || "";

  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [selectedCs, setSelectedCs] = useState(preselected);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // View/Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentDetail | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Fetch classes
  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setClasses(json.data);
          if (!preselected && json.data.length > 0) {
            setSelectedCs(String(json.data[0].class_section_id));
          }
        }
      })
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, [preselected]);

  const fetchStudents = useCallback(async () => {
    if (!selectedCs) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/students?class_section_id=${selectedCs}`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedCs]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Add student
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddStudent = async () => {
    if (!addForm.first_name || !addForm.last_name || !addForm.email) {
      setAddError("First name, last name, and email are required.");
      return;
    }
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          class_section_id: Number(selectedCs),
          roll_number: addForm.roll_number ? Number(addForm.roll_number) : null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm(emptyAddForm);
        await fetchStudents();
      } else {
        const json = await res.json();
        setAddError(json.error || "Failed to add student.");
      }
    } catch {
      setAddError("Failed to add student.");
    } finally {
      setAddSaving(false);
    }
  };

  // Open edit
  const openEditModal = async (studentId: number) => {
    setEditLoading(true);
    setEditError("");
    setShowEditModal(true);
    try {
      const res = await fetch(`/api/teacher/students/${studentId}`);
      if (res.ok) {
        const json = await res.json();
        const s = json.data as StudentDetail;
        setEditStudent(s);
        setEditForm({
          first_name: s.first_name || "",
          last_name: s.last_name || "",
          middle_name: s.middle_name || "",
          gender: s.gender || "",
          date_of_birth: s.date_of_birth ? s.date_of_birth.split("T")[0] : "",
          phone: s.phone || "",
          alternate_phone: s.alternate_phone || "",
          address: s.address || "",
          city: s.city || "",
          state: s.state || "",
          postal_code: s.postal_code || "",
          father_name: s.father_name || "",
          mother_name: s.mother_name || "",
          guardian_name: s.guardian_name || "",
          guardian_phone: s.guardian_phone || "",
          guardian_email: s.guardian_email || "",
        });
      }
    } catch {
      /* ignore */
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSave = async () => {
    if (!editStudent) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/teacher/students/${editStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditStudent(null);
        await fetchStudents();
      } else {
        const json = await res.json();
        setEditError(json.error || "Failed to update.");
      }
    } catch {
      setEditError("Failed to update student.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary-900">Students</h1>
        {selectedCs && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAddForm(emptyAddForm);
              setAddError("");
              setShowAddModal(true);
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Add Student
          </Button>
        )}
      </div>

      <div className="max-w-xs">
        <Select
          label="Class - Section"
          value={selectedCs}
          onChange={(e) => setSelectedCs(e.target.value)}
          options={[
            { value: "", label: classesLoading ? "Loading..." : "Select class" },
            ...classes.map((c) => ({
              value: String(c.class_section_id),
              label: `${c.class_name} - ${c.section_name}`,
            })),
          ]}
        />
      </div>

      {loading ? (
        <LoadingSkeleton lines={8} />
      ) : students.length > 0 ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Roll
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Gender
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, idx) => (
                  <tr
                    key={s.enrollment_id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                  >
                    <td className="px-4 py-3 text-gray-500 font-medium">
                      {s.roll_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {s.gender || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.phone || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.email || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(s.student_id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="View & Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : selectedCs ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            No students found in this class.
          </p>
        </Card>
      ) : null}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Student"
        size="lg"
      >
        <div className="space-y-4">
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {addError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name *" name="first_name" value={addForm.first_name} onChange={handleAddChange} />
            <Input label="Last Name *" name="last_name" value={addForm.last_name} onChange={handleAddChange} />
            <Input label="Email *" name="email" type="email" value={addForm.email} onChange={handleAddChange} />
            <Input label="Phone" name="phone" value={addForm.phone} onChange={handleAddChange} />
            <Select
              label="Gender"
              name="gender"
              value={addForm.gender}
              onChange={handleAddChange}
              options={[
                { value: "", label: "Select" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
            <Input label="Date of Birth" name="date_of_birth" type="date" value={addForm.date_of_birth} onChange={handleAddChange} />
            <Input label="Roll Number" name="roll_number" type="number" value={addForm.roll_number} onChange={handleAddChange} />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 pt-2">
            Parent / Guardian Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Father's Name" name="father_name" value={addForm.father_name} onChange={handleAddChange} />
            <Input label="Mother's Name" name="mother_name" value={addForm.mother_name} onChange={handleAddChange} />
            <Input label="Guardian Name" name="guardian_name" value={addForm.guardian_name} onChange={handleAddChange} />
            <Input label="Guardian Phone" name="guardian_phone" value={addForm.guardian_phone} onChange={handleAddChange} />
            <Input label="Guardian Email" name="guardian_email" type="email" value={addForm.guardian_email} onChange={handleAddChange} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={addSaving} onClick={handleAddStudent}>
              Add Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditStudent(null);
        }}
        title="Edit Student"
        size="lg"
      >
        {editLoading ? (
          <LoadingSkeleton lines={8} />
        ) : editStudent ? (
          <div className="space-y-4">
            {editError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}
            <h3 className="text-sm font-semibold text-gray-700">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" name="first_name" value={editForm.first_name} onChange={handleEditChange} />
              <Input label="Last Name" name="last_name" value={editForm.last_name} onChange={handleEditChange} />
              <Input label="Middle Name" name="middle_name" value={editForm.middle_name} onChange={handleEditChange} />
              <Select
                label="Gender"
                name="gender"
                value={editForm.gender}
                onChange={handleEditChange}
                options={[
                  { value: "", label: "Select" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
              <Input label="Date of Birth" name="date_of_birth" type="date" value={editForm.date_of_birth} onChange={handleEditChange} />
              <Input label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} />
              <Input label="Alternate Phone" name="alternate_phone" value={editForm.alternate_phone} onChange={handleEditChange} />
            </div>

            <h3 className="text-sm font-semibold text-gray-700 pt-2">
              Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Address" name="address" value={editForm.address} onChange={handleEditChange} />
              </div>
              <Input label="City" name="city" value={editForm.city} onChange={handleEditChange} />
              <Input label="State" name="state" value={editForm.state} onChange={handleEditChange} />
              <Input label="Postal Code" name="postal_code" value={editForm.postal_code} onChange={handleEditChange} />
            </div>

            <h3 className="text-sm font-semibold text-gray-700 pt-2">
              Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Father's Name" name="father_name" value={editForm.father_name} onChange={handleEditChange} />
              <Input label="Mother's Name" name="mother_name" value={editForm.mother_name} onChange={handleEditChange} />
              <Input label="Guardian Name" name="guardian_name" value={editForm.guardian_name} onChange={handleEditChange} />
              <Input label="Guardian Phone" name="guardian_phone" value={editForm.guardian_phone} onChange={handleEditChange} />
              <Input label="Guardian Email" name="guardian_email" type="email" value={editForm.guardian_email} onChange={handleEditChange} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditStudent(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" loading={editSaving} onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
