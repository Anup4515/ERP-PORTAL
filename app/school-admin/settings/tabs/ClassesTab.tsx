"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/app/components/shared/Card";
import Button from "@/app/components/shared/Button";
import Input from "@/app/components/shared/Input";
import Modal from "@/app/components/shared/Modal";
import Badge from "@/app/components/shared/Badge";
import EmptyState from "@/app/components/shared/EmptyState";
import LoadingSkeleton from "@/app/components/shared/LoadingSkeleton";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Section {
  id: number;
  name: string;
  room_no: string | null;
  class_section_id: number | null;
  class_teacher_id: number | null;
  max_students: number | null;
}

interface ClassWithSections {
  id: number;
  name: string;
  code: string | null;
  grade_level: number | null;
  display_order: number;
  status: string;
  sections: Section[];
}

interface AddClassForm {
  name: string;
  code: string;
  grade_level: string;
  sections: string;
}

interface AddSectionForm {
  name: string;
  room_no: string;
}

export default function ClassesTab() {
  const { isViewingPastSession, withSessionId, viewingSession } = useViewingSession();
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Class modal
  const [showAddClass, setShowAddClass] = useState(false);
  const [addClassForm, setAddClassForm] = useState<AddClassForm>({
    name: "",
    code: "",
    grade_level: "",
    sections: "",
  });
  const [addClassLoading, setAddClassLoading] = useState(false);
  const [addClassError, setAddClassError] = useState<string | null>(null);

  // Add Section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionClassId, setAddSectionClassId] = useState<number | null>(null);
  const [addSectionClassName, setAddSectionClassName] = useState("");
  const [addSectionForm, setAddSectionForm] = useState<AddSectionForm>({
    name: "",
    room_no: "",
  });
  const [addSectionLoading, setAddSectionLoading] = useState(false);
  const [addSectionError, setAddSectionError] = useState<string | null>(null);

  // Edit Class modal
  const [editingClass, setEditingClass] = useState<ClassWithSections | null>(null);
  const [editClassForm, setEditClassForm] = useState<AddClassForm>({
    name: "",
    code: "",
    grade_level: "",
    sections: "",
  });
  const [editClassLoading, setEditClassLoading] = useState(false);
  const [editClassError, setEditClassError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(withSessionId("/api/classes"));
      if (!res.ok) {
        throw new Error("Failed to fetch classes");
      }
      const json = await res.json();
      setClasses(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [withSessionId, viewingSession?.id]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addClassForm.name.trim()) return;

    setAddClassLoading(true);
    setAddClassError(null);

    try {
      const sectionsArray = addClassForm.sections
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const body: Record<string, unknown> = {
        name: addClassForm.name.trim(),
      };
      if (addClassForm.code.trim()) body.code = addClassForm.code.trim();
      if (addClassForm.grade_level.trim()) {
        body.grade_level = parseInt(addClassForm.grade_level, 10);
      }
      if (sectionsArray.length > 0) body.sections = sectionsArray;

      const res = await fetch(withSessionId("/api/classes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create class");
      }

      setShowAddClass(false);
      setAddClassForm({ name: "", code: "", grade_level: "", sections: "" });
      await fetchClasses();
    } catch (err) {
      setAddClassError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddClassLoading(false);
    }
  };

  const openAddSection = (classId: number, className: string) => {
    if (isViewingPastSession) return;
    setAddSectionClassId(classId);
    setAddSectionClassName(className);
    setAddSectionForm({ name: "", room_no: "" });
    setAddSectionError(null);
    setShowAddSection(true);
  };

  const openEditClass = (cls: ClassWithSections) => {
    if (isViewingPastSession) return;
    setEditingClass(cls);
    setEditClassForm({
      name: cls.name,
      code: cls.code || "",
      grade_level: cls.grade_level != null ? String(cls.grade_level) : "",
      sections: "",
    });
    setEditClassError(null);
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassForm.name.trim()) return;

    setEditClassLoading(true);
    setEditClassError(null);
    try {
      const body: Record<string, unknown> = { name: editClassForm.name.trim() };
      body.code = editClassForm.code.trim() || null;
      body.grade_level = editClassForm.grade_level.trim()
        ? parseInt(editClassForm.grade_level, 10)
        : null;

      const res = await fetch(withSessionId(`/api/classes/${editingClass.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update class");
      }
      setEditingClass(null);
      await fetchClasses();
    } catch (err) {
      setEditClassError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditClassLoading(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSectionForm.name.trim() || !addSectionClassId) return;

    setAddSectionLoading(true);
    setAddSectionError(null);

    try {
      const body: Record<string, unknown> = {
        name: addSectionForm.name.trim(),
      };
      if (addSectionForm.room_no.trim()) {
        body.room_no = addSectionForm.room_no.trim();
      }

      const res = await fetch(withSessionId(`/api/classes/${addSectionClassId}/sections`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add section");
      }

      setShowAddSection(false);
      setAddSectionForm({ name: "", room_no: "" });
      setAddSectionClassId(null);
      await fetchClasses();
    } catch (err) {
      setAddSectionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddSectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <LoadingSkeleton lines={4} />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchClasses}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Classes</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage your school classes and their sections
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddClass(true)} disabled={isViewingPastSession}>
          Add Class
        </Button>
      </div>

      {/* Classes List */}
      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create your first class to start organizing sections and students."
          action={isViewingPastSession ? undefined : {
            label: "Add Class",
            onClick: () => setShowAddClass(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} padding="none" className="flex flex-col">
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-semibold text-gray-900">
                        {cls.name}
                      </h4>
                      {cls.code && (
                        <Badge variant="info" size="sm">
                          {cls.code}
                        </Badge>
                      )}
                    </div>
                    {cls.grade_level !== null && (
                      <p className="text-sm text-gray-500 mt-1">
                        Grade Level: {cls.grade_level}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditClass(cls)}
                      disabled={isViewingPastSession}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Edit class"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body - Sections */}
              <div className="px-5 py-4 flex-1">
                {cls.sections.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No sections</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cls.sections.map((section) => (
                      <Badge key={section.id} variant="default" size="sm">
                        {section.name}
                        {section.room_no ? ` (${section.room_no})` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAddSection(cls.id, cls.name)}
                  disabled={isViewingPastSession}
                >
                  + Add Section
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <Modal
        isOpen={showAddClass}
        onClose={() => {
          setShowAddClass(false);
          setAddClassError(null);
        }}
        title="Add Class"
        size="md"
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 1, Grade 10"
            value={addClassForm.name}
            onChange={(e) =>
              setAddClassForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />

          <Input
            label="Code"
            placeholder="e.g. C1, G10 (optional)"
            value={addClassForm.code}
            onChange={(e) =>
              setAddClassForm((f) => ({ ...f, code: e.target.value }))
            }
          />

          <Input
            label="Grade Level"
            type="number"
            placeholder="e.g. 1, 10 (optional)"
            value={addClassForm.grade_level}
            onChange={(e) =>
              setAddClassForm((f) => ({ ...f, grade_level: e.target.value }))
            }
          />

          <Input
            label="Initial Sections"
            placeholder="e.g. A, B, C (comma-separated, optional)"
            value={addClassForm.sections}
            onChange={(e) =>
              setAddClassForm((f) => ({ ...f, sections: e.target.value }))
            }
          />

          {addClassError && (
            <p className="text-sm text-red-600">{addClassError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddClass(false);
                setAddClassError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={addClassLoading}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        isOpen={showAddSection}
        onClose={() => {
          setShowAddSection(false);
          setAddSectionError(null);
        }}
        title={`Add Section to ${addSectionClassName}`}
        size="sm"
      >
        <form onSubmit={handleAddSection} className="space-y-4">
          <Input
            label="Section Name"
            placeholder="e.g. A, B, Science"
            value={addSectionForm.name}
            onChange={(e) =>
              setAddSectionForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />

          <Input
            label="Room Number"
            placeholder="e.g. 101 (optional)"
            value={addSectionForm.room_no}
            onChange={(e) =>
              setAddSectionForm((f) => ({ ...f, room_no: e.target.value }))
            }
          />

          {addSectionError && (
            <p className="text-sm text-red-600">{addSectionError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSection(false);
                setAddSectionError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={addSectionLoading}>
              Add Section
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        isOpen={editingClass !== null}
        onClose={() => {
          setEditingClass(null);
          setEditClassError(null);
        }}
        title="Edit Class"
        size="md"
      >
        <form onSubmit={handleEditClass} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 1, Grade 10"
            value={editClassForm.name}
            onChange={(e) =>
              setEditClassForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />

          <Input
            label="Code"
            placeholder="e.g. C1, G10 (optional)"
            value={editClassForm.code}
            onChange={(e) =>
              setEditClassForm((f) => ({ ...f, code: e.target.value }))
            }
          />

          <Input
            label="Grade Level"
            type="number"
            placeholder="e.g. 1, 10 (optional)"
            value={editClassForm.grade_level}
            onChange={(e) =>
              setEditClassForm((f) => ({ ...f, grade_level: e.target.value }))
            }
          />

          {editClassError && (
            <p className="text-sm text-red-600">{editClassError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingClass(null);
                setEditClassError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={editClassLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
