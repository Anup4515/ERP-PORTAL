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
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import { scrollToFirstError } from "@/app/lib/form-scroll";

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
  { value: "percentage", label: "Percentage" },
  { value: "cgpa", label: "CGPA" },
];

const rangeColumns = [
  { key: "grade_label", label: "Grade Label" },
  { key: "min_percentage", label: "Min %" },
  { key: "max_percentage", label: "Max %" },
  { key: "gpa_value", label: "CGPA Value" },
  { key: "sort_order", label: "Sort Order" },
];

export default function GradingTab() {
  const { isViewingPastSession, withSessionId, viewingSession } = useViewingSession();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);

  const [ranges, setRanges] = useState<GradingRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);

  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [savingScheme, setSavingScheme] = useState(false);
  const [schemeForm, setSchemeForm] = useState({
    name: "",
    type: "percentage",
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

  const fetchScheme = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(withSessionId("/api/grading/schemes"));
      if (!res.ok) throw new Error("Failed to fetch grading scheme");
      const json = await res.json();

      setNoSession(false);
      setScheme(json.data || null);
    } catch {
      setBanner({ type: "error", message: "Failed to load grading scheme." });
    } finally {
      setLoading(false);
    }
  }, [withSessionId, viewingSession?.id]);

  const fetchRanges = useCallback(async (schemeId: string) => {
    try {
      setLoadingRanges(true);
      const res = await fetch(withSessionId(`/api/grading/ranges?scheme_id=${schemeId}`));
      if (!res.ok) throw new Error("Failed to fetch grading ranges");
      const json = await res.json();
      setRanges(json.data);
    } catch {
      setBanner({ type: "error", message: "Failed to load grading ranges." });
    } finally {
      setLoadingRanges(false);
    }
  }, [withSessionId, viewingSession?.id]);

  useEffect(() => {
    fetchScheme();
  }, [fetchScheme]);

  useEffect(() => {
    if (scheme && scheme.type === "cgpa") {
      fetchRanges(scheme.id);
    } else {
      setRanges([]);
    }
  }, [scheme, fetchRanges]);

  // --- Scheme Modal ---

  function openSchemeModal() {
    if (isViewingPastSession) return;
    setSchemeForm({ name: "", type: "percentage" });
    setSchemeErrors({});
    setShowSchemeModal(true);
  }

  function validateSchemeForm(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (!schemeForm.name.trim()) {
      errors.name = "Scheme name is required";
    }
    setSchemeErrors(errors);
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async function handleCreateScheme(e: React.FormEvent) {
    e.preventDefault();
    const { valid, errors } = validateSchemeForm();
    if (!valid) {
      scrollToFirstError(["name", "type"], { errors });
      return;
    }

    try {
      setSavingScheme(true);
      const res = await fetch(withSessionId("/api/grading/schemes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schemeForm.name.trim(),
          type: schemeForm.type,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create scheme");
      }
      setBanner({
        type: "success",
        message: "Grading scheme created successfully.",
      });
      setShowSchemeModal(false);
      await fetchScheme();
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
    if (isViewingPastSession) return;
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

  function validateRangeForm(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (!rangeForm.grade_label.trim()) {
      errors.grade_label = "Grade label is required";
    }
    if (
      rangeForm.min_percentage === "" ||
      isNaN(Number(rangeForm.min_percentage))
    ) {
      errors.min_percentage = "Valid min percentage is required";
    }
    if (
      rangeForm.max_percentage === "" ||
      isNaN(Number(rangeForm.max_percentage))
    ) {
      errors.max_percentage = "Valid max percentage is required";
    }
    if (
      rangeForm.min_percentage !== "" &&
      rangeForm.max_percentage !== "" &&
      Number(rangeForm.min_percentage) > Number(rangeForm.max_percentage)
    ) {
      errors.min_percentage = "Min % cannot be greater than Max %";
    }
    if (rangeForm.gpa_value === "" || isNaN(Number(rangeForm.gpa_value))) {
      errors.gpa_value = "Valid CGPA value is required";
    }
    if (rangeForm.sort_order !== "" && isNaN(Number(rangeForm.sort_order))) {
      errors.sort_order = "Must be a valid number";
    }
    setRangeErrors(errors);
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async function handleCreateRange(e: React.FormEvent) {
    e.preventDefault();
    if (!scheme) return;
    const { valid, errors } = validateRangeForm();
    if (!valid) {
      scrollToFirstError(
        ["grade_label", "min_percentage", "max_percentage", "gpa_value", "sort_order"],
        { errors }
      );
      return;
    }

    try {
      setSavingRange(true);
      const body: Record<string, unknown> = {
        grading_scheme_id: scheme.id,
        grade_label: rangeForm.grade_label.trim(),
        min_percentage: Number(rangeForm.min_percentage),
        max_percentage: Number(rangeForm.max_percentage),
        gpa_value: Number(rangeForm.gpa_value),
      };
      if (rangeForm.sort_order !== "") {
        body.sort_order = Number(rangeForm.sort_order);
      }

      const res = await fetch(withSessionId("/api/grading/ranges"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create range");
      }
      setBanner({
        type: "success",
        message: "Grading range added successfully.",
      });
      setShowRangeModal(false);
      await fetchRanges(scheme.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create range.";
      setBanner({ type: "error", message });
    } finally {
      setSavingRange(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <Card>
        <LoadingSkeleton lines={8} />
      </Card>
    );
  }

  if (noSession) {
    return (
      <Card>
        <EmptyState
          title="No Active Session"
          description="Please create and set a current session before configuring the grading scheme."
        />
      </Card>
    );
  }

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

      {/* Scheme Section */}
      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Grading Scheme
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Set the grading system for the current session. Once set, it cannot
            be changed until the next session.
          </p>
        </div>

        {!scheme ? (
          <EmptyState
            title="No Grading Scheme Set"
            description="Choose a grading system for this session. This is a one-time setup and cannot be changed mid-session."
            action={isViewingPastSession ? undefined : { label: "Set Grading Scheme", onClick: openSchemeModal }}
          />
        ) : (
          <div className="rounded-lg border-2 border-primary-500 bg-primary-50/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">
                  {scheme.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {scheme.type === "percentage"
                    ? "Students are graded using percentage scores directly."
                    : "Students are graded using CGPA with defined grade ranges."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={scheme.type === "percentage" ? "warning" : "default"}
                  size="sm"
                >
                  {typeLabel(scheme.type)}
                </Badge>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Locked for this session
            </div>
          </div>
        )}
      </Card>

      {/* CGPA Ranges Section - only shown for CGPA type */}
      {scheme && scheme.type === "cgpa" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                CGPA Grade Ranges
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Define percentage to CGPA mapping for this scheme
              </p>
            </div>
            <Button variant="primary" onClick={openRangeModal} disabled={isViewingPastSession}>
              Add Range
            </Button>
          </div>

          <DataTable
            columns={rangeColumns}
            data={ranges as unknown as Record<string, unknown>[]}
            loading={loadingRanges}
            emptyMessage="No CGPA ranges defined yet. Add ranges to map percentages to CGPA values."
          />
        </Card>
      )}

      {/* Set Scheme Modal */}
      <Modal
        isOpen={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
        title="Set Grading Scheme"
      >
        <form onSubmit={handleCreateScheme} className="space-y-4">
          <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              This is a one-time setup for the current session. Once set, the
              grading scheme cannot be changed until the next session.
            </p>
          </div>

          <Input
            label="Scheme Name *"
            id="scheme_name"
            value={schemeForm.name}
            onChange={(e) =>
              setSchemeForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. Annual Grading 2025-26"
            error={schemeErrors.name}
          />

          <Select
            label="Grading Type *"
            id="scheme_type"
            options={typeOptions}
            value={schemeForm.type}
            onChange={(e) =>
              setSchemeForm((prev) => ({ ...prev, type: e.target.value }))
            }
          />

          <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600">
              {schemeForm.type === "percentage"
                ? "Percentage: Students will be graded using raw percentage scores. No additional configuration needed."
                : "CGPA: You will need to define grade ranges (e.g., 90-100% = 10.0 CGPA) after creating the scheme."}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowSchemeModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingScheme}>
              Set Scheme
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Range Modal */}
      <Modal
        isOpen={showRangeModal}
        onClose={() => setShowRangeModal(false)}
        title="Add CGPA Range"
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
            placeholder="e.g. O, A+, A, B+"
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

          <Input
            label="CGPA Value *"
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
            placeholder="e.g. 10.0"
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
