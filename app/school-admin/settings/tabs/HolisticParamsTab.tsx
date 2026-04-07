"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  LoadingSkeleton,
  ConfirmDialog,
} from "@/app/components/shared";

interface SubParameter {
  id: number;
  name: string;
  sort_order: number;
}

interface Parameter {
  id: number;
  name: string;
  stage: string | null;
  sort_order: number;
  sub_parameters: SubParameter[];
}

const STAGE_OPTIONS = [
  { value: "", label: "Select Stage" },
  { value: "foundational", label: "Foundational (Nursery - Class 2)" },
  { value: "preparatory", label: "Preparatory (Class 3 - 5)" },
  { value: "middle", label: "Middle (Class 6 - 8)" },
  { value: "secondary", label: "Secondary (Class 9 - 12)" },
];

export default function HolisticParamsTab() {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add Parameter modal
  const [showAddParam, setShowAddParam] = useState(false);
  const [paramForm, setParamForm] = useState({ name: "", stage: "", sort_order: "" });
  const [addingParam, setAddingParam] = useState(false);

  // Add Sub-Parameter modal
  const [showAddSub, setShowAddSub] = useState(false);
  const [subParentId, setSubParentId] = useState<number | null>(null);
  const [subForm, setSubForm] = useState({ name: "", sort_order: "" });
  const [addingSub, setAddingSub] = useState(false);

  // Load Defaults confirmation
  const [showLoadDefaultsConfirm, setShowLoadDefaultsConfirm] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const fetchParameters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/holistic/parameters");
      if (!res.ok) throw new Error("Failed to fetch parameters");
      const json = await res.json();
      setParameters(json.data);
    } catch {
      setBanner({ type: "error", message: "Failed to load parameters. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleAddParameter(e: React.FormEvent) {
    e.preventDefault();
    if (!paramForm.name.trim()) return;

    try {
      setAddingParam(true);
      const body: { name: string; stage?: string; sort_order?: number } = { name: paramForm.name.trim() };
      if (paramForm.stage) body.stage = paramForm.stage;
      if (paramForm.sort_order) body.sort_order = Number(paramForm.sort_order);

      const res = await fetch("/api/holistic/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create parameter");
      }
      setBanner({ type: "success", message: "Parameter added successfully." });
      setShowAddParam(false);
      setParamForm({ name: "", stage: "", sort_order: "" });
      await fetchParameters();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create parameter.";
      setBanner({ type: "error", message });
    } finally {
      setAddingParam(false);
    }
  }

  function openAddSubModal(parameterId: number) {
    setSubParentId(parameterId);
    setSubForm({ name: "", sort_order: "" });
    setShowAddSub(true);
  }

  async function handleAddSubParameter(e: React.FormEvent) {
    e.preventDefault();
    if (!subForm.name.trim() || subParentId === null) return;

    try {
      setAddingSub(true);
      const body: { parameter_id: number; name: string; sort_order?: number } = {
        parameter_id: subParentId,
        name: subForm.name.trim(),
      };
      if (subForm.sort_order) body.sort_order = Number(subForm.sort_order);

      const res = await fetch("/api/holistic/sub-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to create sub-parameter");
      }
      setBanner({ type: "success", message: "Sub-parameter added successfully." });
      setShowAddSub(false);
      setSubForm({ name: "", sort_order: "" });
      await fetchParameters();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create sub-parameter.";
      setBanner({ type: "error", message });
    } finally {
      setAddingSub(false);
    }
  }

  async function handleLoadDefaults() {
    try {
      setLoadingDefaults(true);
      const res = await fetch("/api/holistic/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ load_defaults: "all" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to load defaults");
      }
      setBanner({ type: "success", message: "Default parameters loaded successfully." });
      await fetchParameters();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load default parameters.";
      setBanner({ type: "error", message });
    } finally {
      setLoadingDefaults(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <LoadingSkeleton lines={8} />
      </Card>
    );
  }

  return (
    <div>
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            banner.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Holistic Development Parameters</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage parameters and sub-parameters for holistic student development
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button
            variant="outline"
            size="md"
            loading={loadingDefaults}
            onClick={() => setShowLoadDefaultsConfirm(true)}
          >
            Load Defaults
          </Button> */}
          <Button variant="primary" size="md" onClick={() => setShowAddParam(true)}>
            Add Parameter
          </Button>
        </div>
      </div>

      {/* Parameter List */}
      {parameters.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            title="No Parameters Found"
            description="Get started by adding parameters manually or load the default set of holistic development parameters."
            action={{
              label: "Load Defaults",
              onClick: () => setShowLoadDefaultsConfirm(true),
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {STAGE_OPTIONS.filter((s) => s.value).map((stageOpt) => {
            const stage = stageOpt.value;
            const stageParams = parameters.filter((p) => p.stage === stage);
            const isStageExpanded = expandedStage === stage;

            return (
              <Card key={stage} padding="none">
                {/* Stage Header */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedStage(isStageExpanded ? null : stage)}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isStageExpanded ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-primary-900">{stageOpt.label}</span>
                    <Badge variant="info" size="sm">
                      {stageParams.length} parameter{stageParams.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Stage Body — list of parameters */}
                {isStageExpanded && (
                  <div className="border-t border-gray-100">
                    {stageParams.length === 0 ? (
                      <p className="text-sm text-gray-400 italic px-5 py-4">No parameters for this stage.</p>
                    ) : (
                      stageParams.map((param) => {
                        const isParamExpanded = expandedId === param.id;
                        return (
                          <div key={param.id} className="border-b border-gray-50 last:border-b-0">
                            {/* Parameter Row */}
                            <div
                              className="flex items-center justify-between px-5 py-3 pl-10 cursor-pointer hover:bg-gray-50/70 transition-colors"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(param.id); }}
                            >
                              <div className="flex items-center gap-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isParamExpanded ? "rotate-90" : ""}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-gray-800">{param.name}</span>
                                <Badge variant="default" size="sm">
                                  {param.sub_parameters.length} sub
                                </Badge>
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" onClick={() => openAddSubModal(param.id)}>
                                  Add Sub-Parameter
                                </Button>
                              </div>
                            </div>

                            {/* Sub-parameters */}
                            {isParamExpanded && (
                              <div className="px-5 pl-16 pb-3 pt-1">
                                {param.sub_parameters.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No sub-parameters yet.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {param.sub_parameters
                                      .sort((a, b) => a.sort_order - b.sort_order)
                                      .map((sub) => (
                                        <div
                                          key={sub.id}
                                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs"
                                        >
                                          <span className="font-medium text-gray-700">{sub.name}</span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Parameter Modal */}
      <Modal
        isOpen={showAddParam}
        onClose={() => setShowAddParam(false)}
        title="Add Parameter"
        size="sm"
      >
        <form onSubmit={handleAddParameter}>
          <div className="space-y-4">
            <Input
              label="Parameter Name *"
              id="param_name"
              name="param_name"
              value={paramForm.name}
              onChange={(e) => setParamForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Physical Development"
            />
            <Select
              label="Stage *"
              name="param_stage"
              value={paramForm.stage}
              onChange={(e) => setParamForm((prev) => ({ ...prev, stage: e.target.value }))}
              options={STAGE_OPTIONS}
            />
            <Input
              label="Sort Order"
              id="param_sort_order"
              name="param_sort_order"
              type="number"
              value={paramForm.sort_order}
              onChange={(e) => setParamForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setShowAddParam(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={addingParam}
              disabled={!paramForm.name.trim()}
            >
              Add Parameter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Sub-Parameter Modal */}
      <Modal
        isOpen={showAddSub}
        onClose={() => setShowAddSub(false)}
        title="Add Sub-Parameter"
        size="sm"
      >
        <form onSubmit={handleAddSubParameter}>
          <div className="space-y-4">
            <Input
              label="Sub-Parameter Name *"
              id="sub_name"
              name="sub_name"
              value={subForm.name}
              onChange={(e) => setSubForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Gross Motor Skills"
            />
            <Input
              label="Sort Order"
              id="sub_sort_order"
              name="sub_sort_order"
              type="number"
              value={subForm.sort_order}
              onChange={(e) => setSubForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setShowAddSub(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={addingSub}
              disabled={!subForm.name.trim()}
            >
              Add Sub-Parameter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Load Defaults Confirmation */}
      <ConfirmDialog
        isOpen={showLoadDefaultsConfirm}
        onClose={() => setShowLoadDefaultsConfirm(false)}
        onConfirm={handleLoadDefaults}
        title="Load Default Parameters"
        message="This will add the 6 default holistic development parameters along with their sub-parameters. Do you want to proceed?"
        confirmLabel="Load Defaults"
        variant="primary"
      />
    </div>
  );
}
