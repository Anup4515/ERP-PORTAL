"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Select,
  Card,
  Modal,
  Input,
  LoadingSkeleton,
  Badge,
} from "@/app/components/shared";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

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

interface Exam {
  id: number;
  class_section_id: number;
  name: string;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "upcoming" | "in_progress" | "completed";
  class_name: string;
  section_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function ExamsPage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [filterCs, setFilterCs] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCsIds, setSelectedCsIds] = useState<string[]>([]);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addExamType, setAddExamType] = useState("other");
  const [addStartDate, setAddStartDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Build class-section options
  const csOptions: { value: string; label: string }[] = [];
  for (const cls of classes) {
    for (const sec of cls.sections) {
      if (sec.class_section_id) {
        csOptions.push({ value: String(sec.class_section_id), label: `${cls.name} - ${sec.name}` });
      }
    }
  }

  useEffect(() => {
    fetch(withSessionId("/api/classes")).then((r) => r.json()).then((j) => { if (j.data) setClasses(j.data); }).catch(() => {});
  }, [viewingSession?.id]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (filterCs) params.set("class_section_id", filterCs);
    try {
      const res = await fetch(withSessionId(`/api/exams?${params}`));
      if (res.ok) {
        const json = await res.json();
        setExams(json.data?.exams || []);
        setTotal(json.data?.total || 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterCs, page, viewingSession?.id]);

  useEffect(() => { fetchExams(); }, [fetchExams]);
  useEffect(() => { setPage(1); }, [filterCs]);

  const totalPages = Math.ceil(total / pageSize);

  const allCsIds = csOptions.map((o) => o.value);
  const allSelected = allCsIds.length > 0 && selectedCsIds.length === allCsIds.length;

  const toggleCsId = (id: string) => {
    setSelectedCsIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedCsIds(allSelected ? [] : [...allCsIds]);
  };

  const resetAddForm = () => {
    setSelectedCsIds([]); setAddName(""); setAddCode(""); setAddExamType("other"); setAddStartDate(""); setAddEndDate(""); setAddError("");
  };

  const handleAdd = async () => {
    if (selectedCsIds.length === 0 || !addName) { setAddError("Select at least one class and enter exam name."); return; }
    setAddSaving(true); setAddError("");
    try {
      const res = await fetch(withSessionId("/api/exams"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_section_ids: selectedCsIds.map(Number),
          name: addName,
          code: addCode || null,
          exam_type: addExamType,
          start_date: addStartDate || null,
          end_date: addEndDate || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        resetAddForm();
        await fetchExams();
      } else {
        const j = await res.json(); setAddError(j.error || "Failed to create.");
      }
    } catch { setAddError("Failed to create exam."); }
    finally { setAddSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this exam and all its marks?")) return;
    await fetch(withSessionId(`/api/exams/${id}`), { method: "DELETE" });
    fetchExams();
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary-900">Exams</h1>
        <Button variant="primary" size="sm" onClick={() => { resetAddForm(); setShowAddModal(true); }} disabled={isViewingPastSession}>
          <PlusIcon className="h-4 w-4" /> Create Exam
        </Button>
      </div>

      <div className="max-w-xs">
        <Select label="Filter by Class" value={filterCs} onChange={(e) => setFilterCs(e.target.value)}
          options={[{ value: "", label: "All Classes" }, ...csOptions]} />
      </div>

      {loading ? <LoadingSkeleton lines={6} /> : exams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">No exams found. Create your first exam.</p></Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Exam Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">End</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exams.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {e.name}
                      {e.code && <span className="ml-2 text-xs text-gray-400">({e.code})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.class_name} - {e.section_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.start_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.end_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[e.status] || ""}`}>
                        {e.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/school-admin/exams/${e.id}`} className={`p-1.5 rounded-lg transition-colors ${isViewingPastSession ? "opacity-40 pointer-events-none" : "text-gray-500 hover:text-primary-600 hover:bg-primary-50"}`} title="Edit Schedule" aria-disabled={isViewingPastSession} tabIndex={isViewingPastSession ? -1 : undefined}>
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(e.id)} disabled={isViewingPastSession} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none" title="Delete">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* Create Exam Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create Exam">
        <div className="space-y-4">
          {addError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</p>}

          {/* Class selection with checkboxes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Classes *
            </label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {/* All Classes toggle */}
              <label className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900">All Classes</span>
                {selectedCsIds.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{selectedCsIds.length} selected</span>
                )}
              </label>
              {csOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCsIds.includes(opt.value)}
                    onChange={() => toggleCsId(opt.value)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Input label="Exam Name *" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Mid Term, Final Exam" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Code" value={addCode} onChange={(e) => setAddCode(e.target.value)} placeholder="e.g. MID-1" />
            <Select
              label="Exam Type"
              value={addExamType}
              onChange={(e) => setAddExamType(e.target.value)}
              options={[
                { value: "other", label: "Other" },
                { value: "unit_test", label: "Unit Test" },
                { value: "mid_term", label: "Mid-Term" },
                { value: "final_annual", label: "Final / Annual" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input type="date" value={addStartDate} onChange={(e) => setAddStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input type="date" value={addEndDate} onChange={(e) => setAddEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" loading={addSaving} onClick={handleAdd} disabled={isViewingPastSession}>Create Exam</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
