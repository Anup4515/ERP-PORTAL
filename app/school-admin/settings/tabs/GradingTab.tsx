"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  DataTable,
  Badge,
  EmptyState,
  LoadingSkeleton,
} from "@/app/components/shared";

interface Scheme {
  id: string;
  partner_id: string;
  session_id: string;
  name: string;
  type: string;
  is_default: boolean;
  created_at: string;
}

interface GradingRange {
  id: string;
  grading_scheme_id: string;
  grade_label: string;
  min_percentage: number;
  max_percentage: number;
  gpa_value: number | null;
  sort_order: number | null;
}

const typeOptions = [
  { value: "letter", label: "Letter Grade" },
  { value: "gpa", label: "GPA" },
  { value: "percentage", label: "Percentage" },
  { value: "cgpa", label: "CGPA" },
];

const typeBadgeVariant: Record<string, "info" | "success" | "warning" | "default"> = {
  letter: "info",
  gpa: "success",
  percentage: "warning",
  cgpa: "default",
};

const rangeColumns = [
  { key: "grade_label", label: "Grade Label" },
  { key: "min_percentage", label: "Min %" },
  { key: "max_percentage", label: "Max %" },
  { key: "gpa_value", label: "GPA Value" },
  { key: "sort_order", label: "Sort Order" },
];

export default function GradingTab() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);

  const [ranges, setRanges] = useState<GradingRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);

  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [savingScheme, setSavingScheme] = useState(false);
  const [schemeForm, setSchemeForm] = useState({
    name: "",
    type: "letter",
    is_default: false,
  });
  const [schemeErrors, setSchemeErrors] = useState<Record<string, string>>({});

  const [showRangeModal, setShowRangeModal] = useState(false);
  const [savingRange, setSavingRange] = useState(false);
  const [rangeForm, setRangeForm] = useState({
    grade_label: "",
    min_percentage: "",
    max_percentage: "",
    gpa_value: "",
    sort_order: "",
  });
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  const fetchSchemes = useCallback(async () => {
    try {
      setLoadingSchemes(true);
      const res = await fetch("/api/grading/schemes");
      if (!res.ok) throw new Error("Failed to fetch grading schemes");
      const json = await res.json();
      setSchemes(json.data);
    } catch {
      setBanner({ type: "error", message: "Failed to load grading schemes." });
    } finally {
      setLoadingSchemes(false);
    }
  }, []);

  const fetchRanges = useCallback(async (schemeId: string) => {
    try {
      setLoadingRanges(true);
      const res = await fetch(`/api/grading/ranges?scheme_id=${schemeId}`);
      if (!res.ok) throw new Error("Failed to fetch grading ranges");
      const json = await res.json();
      setRanges(json.data);
    } catch {
      setBanner({ type: "error", message: "Failed to load grading ranges." });
    } finally {
      setLoadingRanges(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  useEffect(() => {
    if (selectedSchemeId) {
      fetchRanges(selectedSchemeId);
    } else {
      setRanges([]);
    }
  }, [selectedSchemeId, fetchRanges]);

  function handleSelectScheme(schemeId: string) {
    setSelectedSchemeId((prev) => (prev === schemeId ? null : schemeId));
  }

  // --- Scheme Modal ---

  function openSchemeModal() {
    setSchemeForm({ name: "", type: "letter", is_default: false });
    setSchemeErrors({});
    setShowSchemeModal(true);
  }

  function validateSchemeForm(): boolean {
    const errors: Record<string, string> = {};
    if (!schemeForm.name.trim()) {
      errors.name = "Scheme name is required";
    }
    setSchemeErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateScheme(e: React.FormEvent) {
    e.preventDefault();
    if (!validateSchemeForm()) return;

    try {
      setSavingScheme(true);
      const res = await fetch("/api/grading/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schemeForm.name.trim(),
          type: schemeForm.type,
          is_default: schemeForm.is_default,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create scheme");
      }
      setBanner({ type: "success", message: "Grading scheme created successfully." });
      setShowSchemeModal(false);
      await fetchSchemes();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create scheme.";
      setBanner({ type: "error", message });
    } finally {
      setSavingScheme(false);
    }
  }

  // --- Range Modal ---

  function openRangeModal() {
    setRangeForm({
      grade_label: "",
      min_percentage: "",
      max_percentage: "",
      gpa_value: "",
      sort_order: "",
    });
    setRangeErrors({});
    setShowRangeModal(true);
  }

  function validateRangeForm(): boolean {
    const errors: Record<string, string> = {};
    if (!rangeForm.grade_label.trim()) {
      errors.grade_label = "Grade label is required";
    }
    if (rangeForm.min_percentage === "" || isNaN(Number(rangeForm.min_percentage))) {
      errors.min_percentage = "Valid min percentage is required";
    }
    if (rangeForm.max_percentage === "" || isNaN(Number(rangeForm.max_percentage))) {
      errors.max_percentage = "Valid max percentage is required";
    }
    if (
      rangeForm.min_percentage !== "" &&
      rangeForm.max_percentage !== "" &&
      Number(rangeForm.min_percentage) > Number(rangeForm.max_percentage)
    ) {
      errors.min_percentage = "Min % cannot be greater than Max %";
    }
    if (rangeForm.gpa_value !== "" && isNaN(Number(rangeForm.gpa_value))) {
      errors.gpa_value = "Must be a valid number";
    }
    if (rangeForm.sort_order !== "" && isNaN(Number(rangeForm.sort_order))) {
      errors.sort_order = "Must be a valid number";
    }
    setRangeErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateRange(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRangeForm() || !selectedSchemeId) return;

    try {
      setSavingRange(true);
      const body: Record<string, unknown> = {
        grading_scheme_id: selectedSchemeId,
        grade_label: rangeForm.grade_label.trim(),
        min_percentage: Number(rangeForm.min_percentage),
        max_percentage: Number(rangeForm.max_percentage),
      };
      if (rangeForm.gpa_value !== "") {
        body.gpa_value = Number(rangeForm.gpa_value);
      }
      if (rangeForm.sort_order !== "") {
        body.sort_order = Number(rangeForm.sort_order);
      }

      const res = await fetch("/api/grading/ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create range");
      }
      setBanner({ type: "success", message: "Grading range added successfully." });
      setShowRangeModal(false);
      await fetchRanges(selectedSchemeId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create range.";
      setBanner({ type: "error", message });
    } finally {
      setSavingRange(false);
    }
  }

  // --- Render ---

  if (loadingSchemes) {
    return (
      <Card>
        <LoadingSkeleton lines={8} />
      </Card>
    );
  }

  const selectedScheme = schemes.find((s) => s.id === selectedSchemeId);
  const typeLabel = (type: string) =>
    typeOptions.find((o) => o.value === type)?.label || type;

  return (
    <div className="space-y-6">
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

      {/* Schemes Section */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Grading Schemes
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage grading schemes and their grade ranges
            </p>
          </div>
          <Button variant="primary" onClick={openSchemeModal}>
            Add Scheme
          </Button>
        </div>

        {schemes.length === 0 ? (
          <EmptyState
            title="No Grading Schemes"
            description="Create your first grading scheme to define how students are graded."
            action={{ label: "Add Scheme", onClick: openSchemeModal }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                onClick={() => handleSelectScheme(scheme.id)}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                  selectedSchemeId === scheme.id
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {scheme.name}
                  </h3>
                  {scheme.is_default && (
                    <Badge variant="success" size="sm">
                      Default
                    </Badge>
                  )}
                </div>
                <Badge
                  variant={typeBadgeVariant[scheme.type] || "default"}
                  size="sm"
                >
                  {typeLabel(scheme.type)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ranges Section */}
      {selectedScheme && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Grade Ranges &mdash; {selectedScheme.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Define the grading ranges for this scheme
              </p>
            </div>
            <Button variant="primary" onClick={openRangeModal}>
              Add Range
            </Button>
          </div>

          <DataTable
            columns={rangeColumns}
            data={ranges as unknown as Record<string, unknown>[]}
            loading={loadingRanges}
            emptyMessage="No grading ranges defined yet. Add a range to get started."
          />
        </Card>
      )}

      {/* Add Scheme Modal */}
      <Modal
        isOpen={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
        title="Add Grading Scheme"
      >
        <form onSubmit={handleCreateScheme} className="space-y-4">
          <Input
            label="Scheme Name *"
            id="scheme_name"
            value={schemeForm.name}
            onChange={(e) =>
              setSchemeForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. Primary Grading"
            error={schemeErrors.name}
          />

          <Select
            label="Type"
            id="scheme_type"
            options={typeOptions}
            value={schemeForm.type}
            onChange={(e) =>
              setSchemeForm((prev) => ({ ...prev, type: e.target.value }))
            }
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={schemeForm.is_default}
              onChange={(e) =>
                setSchemeForm((prev) => ({
                  ...prev,
                  is_default: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Set as default scheme</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowSchemeModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingScheme}>
              Create Scheme
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Range Modal */}
      <Modal
        isOpen={showRangeModal}
        onClose={() => setShowRangeModal(false)}
        title="Add Grading Range"
      >
        <form onSubmit={handleCreateRange} className="space-y-4">
          <Input
            label="Grade Label *"
            id="grade_label"
            value={rangeForm.grade_label}
            onChange={(e) =>
              setRangeForm((prev) => ({
                ...prev,
                grade_label: e.target.value,
              }))
            }
            placeholder="e.g. A+, A, B+"
            error={rangeErrors.grade_label}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Percentage *"
              id="min_percentage"
              type="number"
              value={rangeForm.min_percentage}
              onChange={(e) =>
                setRangeForm((prev) => ({
                  ...prev,
                  min_percentage: e.target.value,
                }))
              }
              placeholder="0"
              error={rangeErrors.min_percentage}
            />
            <Input
              label="Max Percentage *"
              id="max_percentage"
              type="number"
              value={rangeForm.max_percentage}
              onChange={(e) =>
                setRangeForm((prev) => ({
                  ...prev,
                  max_percentage: e.target.value,
                }))
              }
              placeholder="100"
              error={rangeErrors.max_percentage}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GPA Value"
              id="gpa_value"
              type="number"
              step="0.01"
              value={rangeForm.gpa_value}
              onChange={(e) =>
                setRangeForm((prev) => ({
                  ...prev,
                  gpa_value: e.target.value,
                }))
              }
              placeholder="e.g. 4.0"
              error={rangeErrors.gpa_value}
            />
            <Input
              label="Sort Order"
              id="sort_order"
              type="number"
              value={rangeForm.sort_order}
              onChange={(e) =>
                setRangeForm((prev) => ({
                  ...prev,
                  sort_order: e.target.value,
                }))
              }
              placeholder="e.g. 1"
              error={rangeErrors.sort_order}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowRangeModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingRange}>
              Add Range
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
