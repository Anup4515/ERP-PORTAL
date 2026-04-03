"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  LoadingSkeleton,
  ConfirmDialog,
} from "@/app/components/shared";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface Staff {
  id: number;
  name: string;
  designation: string;
  department: string | null;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  experience: number | null;
  address: string | null;
  status: string;
}

const DESIGNATIONS = [
  "Vice Principal",
  "HOD",
  "Coordinator",
  "Subject Teacher",
  "Lab Assistant",
  "Librarian",
  "Accountant",
  "Other",
];

const emptyForm = {
  name: "",
  designation: "",
  department: "",
  phone: "",
  email: "",
  qualification: "",
  experience: "",
  address: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const json = await res.json();
        setStaff(json.data || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filtered = search.trim()
    ? staff.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.designation.toLowerCase().includes(search.toLowerCase()) ||
          s.department?.toLowerCase().includes(search.toLowerCase())
      )
    : staff;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (formErrors[e.target.name]) {
      setFormErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.designation) errors.designation = "Designation is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body: Record<string, string | number | null> = {
        name: form.name,
        designation: form.designation,
      };
      if (form.department) body.department = form.department;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.qualification) body.qualification = form.qualification;
      if (form.experience) body.experience = Number(form.experience);
      if (form.address) body.address = form.address;

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm(emptyForm);
        fetchStaff();
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (s: Staff) => {
    setSelectedStaff(s);
    setForm({
      name: s.name,
      designation: s.designation,
      department: s.department || "",
      phone: s.phone || "",
      email: s.email || "",
      qualification: s.qualification || "",
      experience: s.experience != null ? String(s.experience) : "",
      address: s.address || "",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!validate() || !selectedStaff) return;
    setSubmitting(true);
    try {
      const body: Record<string, string | number | null> = {
        name: form.name,
        designation: form.designation,
        department: form.department || null,
        phone: form.phone || null,
        email: form.email || null,
        qualification: form.qualification || null,
        experience: form.experience ? Number(form.experience) : null,
        address: form.address || null,
      };

      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedStaff(null);
        setForm(emptyForm);
        fetchStaff();
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    await fetch(`/api/staff/${selectedStaff.id}`, { method: "DELETE" });
    setSelectedStaff(null);
    fetchStaff();
  };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Name *"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full name"
          error={formErrors.name}
        />
        <Select
          label="Designation *"
          name="designation"
          value={form.designation}
          onChange={handleChange}
          options={[
            { value: "", label: "Select designation" },
            ...DESIGNATIONS.map((d) => ({ value: d, label: d })),
          ]}
          error={formErrors.designation}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Department"
          name="department"
          value={form.department}
          onChange={handleChange}
          placeholder="e.g. Science, Admin"
        />
        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone number"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email (for contact only)"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="email@example.com"
        />
        <Input
          label="Qualification"
          name="qualification"
          value={form.qualification}
          onChange={handleChange}
          placeholder="e.g. M.Sc, B.Ed"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Experience (years)"
          name="experience"
          type="number"
          value={form.experience}
          onChange={handleChange}
        />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Address
          </label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Address"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowAddModal(false);
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
          {isEdit ? "Save Changes" : "Add Staff"}
        </Button>
      </div>
    </div>
  );

  // Group by designation
  const designationCounts = new Map<string, number>();
  for (const s of staff) {
    designationCounts.set(s.designation, (designationCounts.get(s.designation) || 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Staff</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage non-teaching staff and other personnel (no login access)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setForm(emptyForm);
            setFormErrors({});
            setShowAddModal(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Summary badges */}
      {staff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
            Total: {staff.length}
          </span>
          {[...designationCounts.entries()].map(([d, count]) => (
            <span
              key={d}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
            >
              {d}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, designation, or department..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : staff.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <UsersIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No staff added yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Add HODs, coordinators, and other personnel
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Qualification
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    } hover:bg-blue-50/30`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {s.designation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.qualification || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaff(s);
                            setShowDeleteDialog(true);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setForm(emptyForm);
          setFormErrors({});
        }}
        title="Add Staff"
        size="lg"
      >
        {renderForm(false)}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaff(null);
          setForm(emptyForm);
          setFormErrors({});
        }}
        title="Edit Staff"
        size="lg"
      >
        {renderForm(true)}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedStaff(null);
        }}
        onConfirm={handleDelete}
        title="Remove Staff"
        message={`Are you sure you want to remove ${selectedStaff?.name || "this staff member"}?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
