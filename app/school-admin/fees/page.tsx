"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  StatsCard,
  Tabs,
  LoadingSkeleton,
  ConfirmDialog,
} from "@/app/components/shared";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CurrencyRupeeIcon,
  ChartPieIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import { formatCurrency } from "@/app/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

interface Summary {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
  pending_count: number;
  partial_count: number;
  paid_count: number;
  waived_count: number;
  total_dues: number;
}

interface Structure {
  id: number;
  name: string;
  fee_type: string;
  amount: string | number;
  recurrence: "one_time" | "monthly";
  due_date: string | null;
  start_month: string | null;       // ISO YYYY-MM-DD (1st of month)
  end_month: string | null;
  due_day_of_month: number | null;
  class_section_id: number | null;
  class_name: string | null;
  section_name: string | null;
  assigned_count: number;
}

interface Due {
  id: number;
  structure_id: number;
  student_enrollment_id: number;
  amount_due: string | number;
  amount_paid: string | number;
  outstanding: string | number;
  status: "pending" | "partial" | "paid" | "waived";
  due_date: string | null;
  period_label: string;              // "" for one-time, "YYYY-MM" for monthly
  recurrence: "one_time" | "monthly";
  fee_name: string;
  fee_type: string;
  student_id: number;
  student_first_name: string;
  student_last_name: string;
  class_name: string;
  section_name: string;
  class_section_id: number;
}

interface Payment {
  id: number;
  due_id: number;
  amount: string | number;
  paid_date: string;
  payment_mode: string | null;
  reference_no: string | null;
  remarks: string | null;
  fee_name: string;
  student_first_name: string;
  student_last_name: string;
  class_name: string;
  section_name: string;
}

interface ClassRow {
  id: number;
  name: string;
  sections: { id: number; name: string; class_section_id: number }[];
}

const FEE_TYPES = [
  { value: "tuition",   label: "Tuition" },
  { value: "admission",   label: "Admission" },
  { value: "transport", label: "Transport" },
  { value: "exam",      label: "Exam" },
  { value: "other",     label: "Other" },
];

const PAYMENT_MODES = [
  { value: "",       label: "Select mode (optional)" },
  { value: "cash",   label: "Cash" },
  { value: "upi",    label: "UPI" },
  { value: "bank",   label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card",   label: "Card" },
];

const STATUS_STYLES: Record<Due["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  partial: "bg-blue-50 text-blue-700",
  paid:    "bg-green-50 text-green-700",
  waived:  "bg-gray-100 text-gray-600",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayMonth = () => new Date().toISOString().slice(0, 7);

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2026-04" or "2026-04-01" → "Apr 2026". Empty string → "" (one-time).
function fmtPeriod(period: string | null): string {
  if (!period) return "";
  const m = period.match(/^(\d{4})-(\d{2})/);
  if (!m) return period;
  const monthIdx = Number(m[2]) - 1;
  return `${MONTH_NAMES[monthIdx] ?? m[2]} ${m[1]}`;
}

// Pure month enumeration for the form preview — mirrors the API's
// enumerateMonths() (kept simple; max ±36 months by validation).
function enumerateMonthsForPreview(startISO: string, endISO: string): string[] {
  const parse = (s: string) => {
    const m = s.match(/^(\d{4})-(\d{2})/);
    return m ? { y: Number(m[1]), m: Number(m[2]) } : null;
  };
  const s = parse(startISO);
  const e = parse(endISO);
  if (!s || !e) return [];
  const out: string[] = [];
  let { y, m } = s;
  while (y < e.y || (y === e.y && m <= e.m) ) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (out.length > 60) break; // safety net
  }
  return out;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const { isViewingPastSession, withSessionId } = useViewingSession();
  const [activeTab, setActiveTab] = useState<"dues" | "structures" | "payments">("dues");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetch(withSessionId("/api/fees/summary"));
      const json = await res.json();
      if (json.data) setSummary(json.data);
    } catch {
      /* ignore */
    }
  }, [withSessionId]);

  const refreshClasses = useCallback(async () => {
    try {
      const res = await fetch(withSessionId("/api/classes"));
      const json = await res.json();
      setClasses(json.data ?? []);
    } catch {
      /* ignore */
    }
  }, [withSessionId]);

  useEffect(() => {
    refreshSummary();
    refreshClasses();
  }, [refreshSummary, refreshClasses]);

  const tabs = [
    { key: "dues",       label: "Dues" },
    { key: "structures", label: "Fee Structures" },
    { key: "payments",   label: "Payments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Fees</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track expected dues and collected payments per student
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Billed"
          value={summary ? formatCurrency(summary.total_billed) : "—"}
          icon={<CurrencyRupeeIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="Collected"
          value={summary ? formatCurrency(summary.total_collected) : "—"}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          className="bg-green-50/40"
        />
        <StatsCard
          title="Outstanding"
          value={summary ? formatCurrency(summary.total_outstanding) : "—"}
          icon={<ExclamationCircleIcon className="w-6 h-6" />}
          className="bg-amber-50/40"
        />
        <StatsCard
          title="Collection Rate"
          value={summary ? `${summary.collection_rate}%` : "—"}
          icon={<ChartPieIcon className="w-6 h-6" />}
        />
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as typeof activeTab)}
      />

      {activeTab === "dues" && (
        <DuesTab
          classes={classes}
          isReadOnly={isViewingPastSession}
          withSessionId={withSessionId}
          onChanged={refreshSummary}
        />
      )}
      {activeTab === "structures" && (
        <StructuresTab
          classes={classes}
          isReadOnly={isViewingPastSession}
          withSessionId={withSessionId}
          onChanged={refreshSummary}
        />
      )}
      {activeTab === "payments" && (
        <PaymentsTab withSessionId={withSessionId} />
      )}
    </div>
  );
}

// ─── Tab: Dues ────────────────────────────────────────────────────────────

function DuesTab({
  classes,
  isReadOnly,
  withSessionId,
  onChanged,
}: {
  classes: ClassRow[];
  isReadOnly: boolean;
  withSessionId: (url: string) => string;
  onChanged: () => void;
}) {
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | Due["status"]>("");
  const [classSectionFilter, setClassSectionFilter] = useState<string>("");
  // "" = all (no filter applied), "__one_time__" = one-time only,
  // "YYYY-MM"  = that specific month.
  // Replaces the old period dropdown — admins find fee_type more useful for
  // their workflow ("show me all tuition pendings" vs "show me May 2026").
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>("");

  const [collectFor, setCollectFor] = useState<Due | null>(null);
  const [waiveFor, setWaiveFor] = useState<Due | null>(null);

  const sectionOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: "All classes" }];
    for (const c of classes) {
      for (const s of c.sections ?? []) {
        if (s.class_section_id) {
          opts.push({
            value: String(s.class_section_id),
            label: `${c.name} · ${s.name}`,
          });
        }
      }
    }
    return opts;
  }, [classes]);

  const feeTypeOptions = useMemo(
    () => [{ value: "", label: "All types" }, ...FEE_TYPES],
    []
  );

  const fetchDues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (classSectionFilter) params.set("class_section_id", classSectionFilter);
      if (feeTypeFilter) params.set("fee_type", feeTypeFilter);
      const url = withSessionId(`/api/fees/dues?${params}`);
      const res = await fetch(url);
      const json = await res.json();
      setDues(json.data?.dues || []);
    } catch {
      setDues([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, classSectionFilter, feeTypeFilter, withSessionId]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          options={[
            { value: "",        label: "All" },
            { value: "pending", label: "Pending" },
            { value: "partial", label: "Partial" },
            { value: "paid",    label: "Paid" },
            { value: "waived",  label: "Waived" },
          ]}
          className="min-w-[160px]"
        />
        <Select
          label="Class"
          value={classSectionFilter}
          onChange={(e) => setClassSectionFilter(e.target.value)}
          options={sectionOptions}
          className="min-w-[200px]"
        />
        <Select
          label="Fee Type"
          value={feeTypeFilter}
          onChange={(e) => setFeeTypeFilter(e.target.value)}
          options={feeTypeOptions}
          className="min-w-[180px]"
        />
      </div>

      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : dues.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BanknotesIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No fee dues match the filters</p>
            <p className="text-xs text-gray-300 mt-1">
              Create a fee structure and assign it to students
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Outstanding</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dues.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-blue-50/30`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.student_first_name} {d.student_last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.class_name} · {d.section_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="font-medium text-gray-800 flex items-center gap-1.5 flex-wrap">
                        <span>{d.fee_name}</span>
                        {d.period_label && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-wide">
                            {fmtPeriod(d.period_label)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{d.fee_type}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(Number(d.amount_due))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700">
                      {formatCurrency(Number(d.amount_paid))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(Number(d.outstanding))}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(d.due_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[d.status]}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isReadOnly || d.status === "paid" || d.status === "waived"}
                          onClick={() => setCollectFor(d)}
                        >
                          Collect
                        </Button>
                        <button
                          onClick={() => setWaiveFor(d)}
                          disabled={isReadOnly || d.status === "paid" || d.status === "waived"}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-40"
                          title="Waive"
                        >
                          Waive
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

      {collectFor && (
        <CollectPaymentModal
          due={collectFor}
          onClose={() => setCollectFor(null)}
          onDone={() => {
            setCollectFor(null);
            fetchDues();
            onChanged();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!waiveFor}
        onClose={() => setWaiveFor(null)}
        onConfirm={async () => {
          if (!waiveFor) return;
          await fetch(`/api/fees/dues/${waiveFor.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "waived" }),
          });
          setWaiveFor(null);
          fetchDues();
          onChanged();
        }}
        title="Waive fee due"
        message={
          waiveFor
            ? `Waive ${waiveFor.fee_name} for ${waiveFor.student_first_name} ${waiveFor.student_last_name}? The outstanding amount will no longer appear in collection reports.`
            : ""
        }
        confirmLabel="Waive"
        variant="danger"
      />
    </div>
  );
}

// ─── Tab: Structures ──────────────────────────────────────────────────────

function StructuresTab({
  classes,
  isReadOnly,
  withSessionId,
  onChanged,
}: {
  classes: ClassRow[];
  isReadOnly: boolean;
  withSessionId: (url: string) => string;
  onChanged: () => void;
}) {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Structure | null>(null);
  const [deleting, setDeleting] = useState<Structure | null>(null);
  const [assigning, setAssigning] = useState<Structure | null>(null);

  const sectionOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "All sections in session" },
    ];
    for (const c of classes) {
      for (const s of c.sections ?? []) {
        if (s.class_section_id) {
          opts.push({
            value: String(s.class_section_id),
            label: `${c.name} · ${s.name}`,
          });
        }
      }
    }
    return opts;
  }, [classes]);

  const fetchStructures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withSessionId("/api/fees/structures"));
      const json = await res.json();
      setStructures(json.data || []);
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  }, [withSessionId]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          A fee structure is a template (e.g. &ldquo;Tuition Q1&rdquo;) that you assign to students.
        </p>
        <Button
          variant="primary"
          size="sm"
          disabled={isReadOnly}
          onClick={() => setShowAdd(true)}
        >
          <PlusIcon className="h-4 w-4" />
          New Structure
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : structures.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BanknotesIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No fee structures yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Create one to start tracking fees
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Applies to</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Schedule</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {structures.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-blue-50/30`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                        {s.fee_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.class_name && s.section_name
                        ? `${s.class_name} · ${s.section_name}`
                        : "Whole session"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(Number(s.amount))}
                      {s.recurrence === "monthly" && (
                        <span className="block text-[10px] text-gray-400 font-normal">/ month</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.recurrence === "monthly" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                            Monthly
                          </span>
                          <span className="text-xs">
                            {fmtPeriod(s.start_month)} – {fmtPeriod(s.end_month)}
                          </span>
                          {s.due_day_of_month && (
                            <span className="text-[11px] text-gray-400">
                              Due on day {s.due_day_of_month}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            One-time
                          </span>
                          <span className="text-xs">{fmtDate(s.due_date)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {s.assigned_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isReadOnly}
                          onClick={() => setAssigning(s)}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Assign
                        </Button>
                        <button
                          onClick={() => setEditing(s)}
                          disabled={isReadOnly}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(s)}
                          disabled={isReadOnly}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
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

      {(showAdd || editing) && (
        <StructureFormModal
          editing={editing}
          sectionOptions={sectionOptions}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onDone={() => {
            setShowAdd(false);
            setEditing(null);
            fetchStructures();
            onChanged();
          }}
        />
      )}

      {assigning && (
        <AssignStructureModal
          structure={assigning}
          sectionOptions={sectionOptions.filter((o) => o.value !== "")}
          onClose={() => setAssigning(null)}
          onDone={() => {
            setAssigning(null);
            fetchStructures();
            onChanged();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await fetch(`/api/fees/structures/${deleting.id}`, { method: "DELETE" });
          setDeleting(null);
          fetchStructures();
          onChanged();
        }}
        title="Delete fee structure"
        message={
          deleting
            ? `Delete "${deleting.name}"? This will also remove all ${deleting.assigned_count} assignment(s) and their payment history.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ─── Tab: Payments ────────────────────────────────────────────────────────

function PaymentsTab({
  withSessionId,
}: {
  withSessionId: (url: string) => string;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      const res = await fetch(withSessionId(`/api/fees/payments?${params}`));
      const json = await res.json();
      setPayments(json.data?.payments || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, withSessionId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const total = payments.reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="From"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="min-w-[160px]"
        />
        <Input
          label="To"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="min-w-[160px]"
        />
        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            Clear
          </Button>
        )}
        <div className="ml-auto text-sm text-gray-600">
          Sum:{" "}
          <span className="font-semibold text-primary-700 tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : payments.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BanknotesIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No payments recorded</p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDate(p.paid_date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.student_first_name} {p.student_last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.class_name} · {p.section_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.fee_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">
                      {formatCurrency(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {p.payment_mode || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.reference_no || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────

function StructureFormModal({
  editing,
  sectionOptions,
  onClose,
  onDone,
}: {
  editing: Structure | null;
  sectionOptions: { value: string; label: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    fee_type: editing?.fee_type ?? "tuition",
    amount: editing ? String(editing.amount) : "",
    recurrence: (editing?.recurrence ?? "one_time") as "one_time" | "monthly",
    due_date: editing?.due_date ? editing.due_date.slice(0, 10) : "",
    start_month: editing?.start_month ? editing.start_month.slice(0, 7) : todayMonth(),
    end_month: editing?.end_month ? editing.end_month.slice(0, 7) : todayMonth(),
    due_day_of_month: editing?.due_day_of_month != null ? String(editing.due_day_of_month) : "5",
    class_section_id: editing?.class_section_id ? String(editing.class_section_id) : "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isMonthly = form.recurrence === "monthly";

  const previewMonths = useMemo(() => {
    if (!isMonthly) return [];
    return enumerateMonthsForPreview(form.start_month, form.end_month);
  }, [isMonthly, form.start_month, form.end_month]);

  const previewText = useMemo(() => {
    if (!isMonthly) {
      return form.due_date
        ? `Will create 1 due per assigned student, due ${fmtDate(form.due_date)}.`
        : `Will create 1 due per assigned student.`;
    }
    if (previewMonths.length === 0) return "Pick a start and end month to see a preview.";
    const day = Number(form.due_day_of_month) || 1;
    const first = `${fmtPeriod(previewMonths[0])} (due day ${day})`;
    const last = fmtPeriod(previewMonths[previewMonths.length - 1]);
    const amountNum = Number(form.amount);
    const totalLabel =
      Number.isFinite(amountNum) && amountNum > 0
        ? ` · ${formatCurrency(amountNum * previewMonths.length)} per student over the window`
        : "";
    return `Will create ${previewMonths.length} due${previewMonths.length === 1 ? "" : "s"} per assigned student — ${first} through ${last}${totalLabel}.`;
  }, [isMonthly, previewMonths, form.due_day_of_month, form.amount, form.due_date]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    const amountNum = Number(form.amount);
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      e.amount = "Amount must be a positive number";
    }
    if (isMonthly) {
      if (!form.start_month) e.start_month = "Start month is required";
      if (!form.end_month) e.end_month = "End month is required";
      const day = Number(form.due_day_of_month);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        e.due_day_of_month = "Day must be between 1 and 31";
      }
      if (form.start_month && form.end_month && form.end_month < form.start_month) {
        e.end_month = "End month must be on or after start month";
      }
      if (previewMonths.length > 36) {
        e.end_month = "Window cannot exceed 36 months";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        fee_type: form.fee_type,
        amount: Number(form.amount),
        recurrence: form.recurrence,
        class_section_id: form.class_section_id ? Number(form.class_section_id) : null,
      };
      if (isMonthly) {
        body.start_month = form.start_month;
        body.end_month = form.end_month;
        body.due_day_of_month = Number(form.due_day_of_month);
        body.due_date = null;
      } else {
        body.due_date = form.due_date || null;
        body.start_month = null;
        body.end_month = null;
        body.due_day_of_month = null;
      }

      const res = await fetch(
        editing ? `/api/fees/structures/${editing.id}` : "/api/fees/structures",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        onDone();
      } else {
        const json = await res.json().catch(() => ({}));
        // parseOrError returns details: [{ field, message }] for zod failures.
        // Map them to per-field errors so the user sees what's wrong, not just
        // the generic "Validation failed" banner.
        const issues = Array.isArray(json?.details) ? json.details : [];
        if (issues.length > 0) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of issues) {
            const field = String(issue?.field ?? "");
            const message = String(issue?.message ?? "Invalid value");
            if (field) fieldErrors[field] = message;
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          } else {
            setErrors({ _form: json.error || "Failed to save fee structure" });
          }
        } else {
          setErrors({ _form: json.error || "Failed to save fee structure" });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={editing ? "Edit fee structure" : "New fee structure"}
      size="lg"
    >
      <div className="space-y-4">
        {errors._form && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors._form}
          </div>
        )}
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={isMonthly ? "e.g. Tuition Fee" : "e.g. Admission Fee"}
          error={errors.name}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            value={form.fee_type}
            onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
            options={FEE_TYPES}
          />
          <Input
            label={isMonthly ? "Amount per month (₹) *" : "Amount (₹) *"}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
          />
        </div>

        {/* Recurrence picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Recurrence *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, recurrence: "one_time" })}
              className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                form.recurrence === "one_time"
                  ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">One-time</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Charged once. e.g. admission, exam, uniform.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, recurrence: "monthly" })}
              className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                form.recurrence === "monthly"
                  ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">Monthly</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Repeats every month. e.g. tuition, transport.
              </div>
            </button>
          </div>
        </div>

        {/* Schedule fields — switch on recurrence */}
        {isMonthly ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Start month *"
              type="month"
              value={form.start_month}
              onChange={(e) => setForm({ ...form, start_month: e.target.value })}
              error={errors.start_month}
            />
            <Input
              label="End month *"
              type="month"
              value={form.end_month}
              onChange={(e) => setForm({ ...form, end_month: e.target.value })}
              error={errors.end_month}
            />
            <Input
              label="Due day of month *"
              type="number"
              min="1"
              max="31"
              value={form.due_day_of_month}
              onChange={(e) => setForm({ ...form, due_day_of_month: e.target.value })}
              error={errors.due_day_of_month}
            />
          </div>
        ) : (
          <Input
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        )}

        <Select
          label="Applies to"
          value={form.class_section_id}
          onChange={(e) => setForm({ ...form, class_section_id: e.target.value })}
          options={sectionOptions}
        />

        {/* Preview */}
        <div className="text-xs text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <span className="font-semibold text-indigo-700 mr-1">Preview:</span>
          {previewText}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={submit}>
            {editing ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignStructureModal({
  structure,
  sectionOptions,
  onClose,
  onDone,
}: {
  structure: Structure;
  sectionOptions: { value: string; label: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [classSectionId, setClassSectionId] = useState<string>(
    structure.class_section_id ? String(structure.class_section_id) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      if (classSectionId) body.class_section_id = Number(classSectionId);
      const res = await fetch(`/api/fees/structures/${structure.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(json.message || "Assigned");
        // Brief delay so user sees the count, then refresh.
        setTimeout(() => onDone(), 800);
      } else {
        // Surface zod field-level details when present.
        const issues = Array.isArray(json?.details) ? json.details : [];
        const detailMsg = issues
          .map((i: { field?: string; message?: string }) =>
            i?.field ? `${i.field}: ${i.message}` : i?.message
          )
          .filter(Boolean)
          .join(" · ");
        setError(detailMsg || json?.error || "Failed to assign");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const restrictedToOwn = structure.class_section_id !== null;

  return (
    <Modal isOpen onClose={onClose} title="Assign fee to students" size="md">
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">{structure.name}</span>
          {" — "}
          assigning to all active enrollments. Already-assigned students are skipped.
        </div>
        {restrictedToOwn ? (
          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            This structure is scoped to{" "}
            <span className="font-medium text-gray-700">
              {structure.class_name} · {structure.section_name}
            </span>{" "}
            — only students in that section will be assigned.
          </div>
        ) : (
          <Select
            label="Target class (optional — leave blank to assign to entire session)"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            options={[{ value: "", label: "All sections in session" }, ...sectionOptions]}
          />
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {result && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {result}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={submit}>
            Assign
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CollectPaymentModal({
  due,
  onClose,
  onDone,
}: {
  due: Due;
  onClose: () => void;
  onDone: () => void;
}) {
  const outstanding = Number(due.outstanding);
  const [form, setForm] = useState({
    amount: outstanding > 0 ? String(outstanding) : "",
    paid_date: todayISO(),
    payment_mode: "",
    reference_no: "",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const amt = Number(form.amount);
    if (!form.amount || !Number.isFinite(amt) || amt <= 0) {
      e.amount = "Amount must be a positive number";
    } else if (amt > outstanding) {
      e.amount = `Cannot exceed outstanding ${formatCurrency(outstanding)}`;
    }
    if (!form.paid_date) e.paid_date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_id: due.id,
          amount: Number(form.amount),
          paid_date: form.paid_date,
          payment_mode: form.payment_mode || null,
          reference_no: form.reference_no || null,
          remarks: form.remarks || null,
        }),
      });
      if (res.ok) {
        onDone();
      } else {
        const json = await res.json().catch(() => ({}));
        setErrors({ _form: json.error || "Failed to record payment" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Collect payment" size="lg">
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-800">
            {due.student_first_name} {due.student_last_name}
            {" · "}
            <span className="text-gray-500">
              {due.class_name} · {due.section_name}
            </span>
          </div>
          <div className="text-gray-600 mt-1">{due.fee_name}</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <div className="text-gray-400 uppercase">Due</div>
              <div className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(Number(due.amount_due))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 uppercase">Paid</div>
              <div className="font-semibold text-green-700 tabular-nums">
                {formatCurrency(Number(due.amount_paid))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 uppercase">Outstanding</div>
              <div className="font-semibold text-amber-700 tabular-nums">
                {formatCurrency(outstanding)}
              </div>
            </div>
          </div>
        </div>

        {errors._form && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors._form}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount (₹) *"
            type="number"
            inputMode="decimal"
            min="0"
            max={outstanding}
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
          />
          <Input
            label="Date *"
            type="date"
            value={form.paid_date}
            max={todayISO()}
            onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
            error={errors.paid_date}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment mode"
            value={form.payment_mode}
            onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
            options={PAYMENT_MODES}
          />
          <Input
            label="Reference no."
            value={form.reference_no}
            onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
            placeholder="Cheque/UTR/Txn ID"
          />
        </div>
        <Input
          label="Remarks"
          value={form.remarks}
          onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          placeholder="Optional notes"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={submit}>
            Record payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
