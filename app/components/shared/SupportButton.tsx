"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LifebuoyIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import Select from "./Select";

interface SupportQuery {
  id: number;
  category: "billing" | "technical" | "feature" | "general";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  resolution_note: string | null;
  ts_created: number;
  ts_resolved: number | null;
  resolver_name: string | null;
}

const CATEGORIES = [
  { value: "general",   label: "General" },
  { value: "technical", label: "Technical" },
  { value: "feature",   label: "Feature request" },
];

const STATUS_VISUAL: Record<
  SupportQuery["status"],
  { label: string; chip: string; Icon: typeof ClockIcon }
> = {
  open:        { label: "Open",        chip: "bg-amber-50 text-amber-700",   Icon: ClockIcon },
  in_progress: { label: "In progress", chip: "bg-blue-50 text-blue-700",     Icon: ArrowPathIcon },
  resolved:    { label: "Resolved",    chip: "bg-green-50 text-green-700",   Icon: CheckCircleIcon },
};

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const emptyForm = { category: "general", subject: "", message: "" };

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadQueries = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/support");
      const json = await res.json();
      setQueries(json.data ?? []);
    } catch {
      setQueries([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadQueries();
  }, [open, loadQueries]);

  // Open queries badge — shows on the header button when there are unresolved
  // queries waiting for a response.
  const [openCount, setOpenCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/support?status=open")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setOpenCount((j.data ?? []).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]); // re-fetch when modal closes

  const submit = async () => {
    const fieldErrors: Record<string, string> = {};
    if (form.subject.trim().length < 3) fieldErrors.subject = "Subject must be at least 3 characters";
    if (form.message.trim().length < 10) fieldErrors.message = "Please describe your query in at least 10 characters";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    setErrors({});
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessMsg(json?.message || "Query submitted.");
        setForm(emptyForm);
        await loadQueries();
      } else {
        const issues = Array.isArray(json?.details) ? json.details : [];
        if (issues.length > 0) {
          const fe: Record<string, string> = {};
          for (const i of issues) {
            const f = String(i?.field ?? "");
            if (f) fe[f] = String(i?.message ?? "Invalid value");
          }
          setErrors(Object.keys(fe).length > 0 ? fe : { _form: json?.error || "Failed to submit" });
        } else {
          setErrors({ _form: json?.error || "Failed to submit" });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSuccessMsg(null);
        }}
        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200/60 text-amber-800 text-sm font-semibold shadow-sm hover:ring-amber-300 hover:from-amber-100 hover:to-amber-200 transition-colors cursor-pointer shrink-0"
      >
        <LifebuoyIcon className="w-4 h-4" />
        <span>Support</span>
        {openCount != null && openCount > 0 && (
          <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
            {openCount > 9 ? "9+" : openCount}
          </span>
        )}
      </button>

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setForm(emptyForm);
          setErrors({});
          setSuccessMsg(null);
        }}
        title="Support"
        size="lg"
      >
        <div className="space-y-5">
          {/* New-query form */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Submit a new query
            </h3>
            {successMsg && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                {successMsg}
              </div>
            )}
            {errors._form && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {errors._form}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Subject *"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Short summary"
                  error={errors.subject}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Message *
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                maxLength={5000}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe your question or issue. Include any relevant details (class, student, screen, etc.)."
              />
              {errors.message && (
                <p className="text-sm text-red-600 mt-1">{errors.message}</p>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="primary" loading={submitting} onClick={submit}>
                Submit query
              </Button>
            </div>
          </section>

          {/* Recent queries */}
          <section className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Your recent queries
            </h3>
            {loadingList ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : queries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No queries yet. Submit one above and our team will respond.
              </p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto -mr-2 pr-2">
                {queries.map((q) => {
                  const v = STATUS_VISUAL[q.status];
                  const StatusIcon = v.Icon;
                  return (
                    <li
                      key={q.id}
                      className="rounded-lg border border-gray-200 bg-gray-50/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {q.subject}
                          </p>
                          <p className="text-[11px] text-gray-400 capitalize">
                            {q.category} · {relativeTime(q.ts_created)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${v.chip}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {v.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                        {q.message}
                      </p>
                      {q.status === "resolved" && q.resolution_note && (
                        <div className="mt-2.5 rounded-md bg-green-50 border border-green-200 px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-[11px] font-semibold text-green-800 uppercase tracking-wide">
                              Response{q.resolver_name ? ` from ${q.resolver_name}` : ""}
                              {q.ts_resolved ? ` · ${relativeTime(q.ts_resolved)}` : ""}
                            </span>
                          </div>
                          <p className="text-xs text-green-900 whitespace-pre-wrap break-words">
                            {q.resolution_note}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </Modal>
    </>
  );
}
