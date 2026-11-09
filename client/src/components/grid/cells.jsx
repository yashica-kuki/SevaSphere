import { inr, dateTime, title } from "../../lib/format";

const tones = {
  COMPLETED: "bg-emerald-50 text-emerald-700", SUCCESS: "bg-emerald-50 text-emerald-700", VERIFIED: "bg-emerald-50 text-emerald-700", ACTIVE: "bg-emerald-50 text-emerald-700", APPROVED: "bg-emerald-50 text-emerald-700", REVIEWED: "bg-emerald-50 text-emerald-700", RESOLVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700", REQUESTED: "bg-amber-50 text-amber-700", PROCESSING: "bg-amber-50 text-amber-700", SUBMITTED: "bg-amber-50 text-amber-700", UNDER_REVIEW: "bg-amber-50 text-amber-700", RUNNING: "bg-amber-50 text-amber-700", IN_PROGRESS: "bg-amber-50 text-amber-700", NEW: "bg-sky-50 text-sky-700", PAUSED: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700", REJECTED: "bg-red-50 text-red-700", CANCELLED: "bg-slate-100 text-slate-600", REFUNDED: "bg-slate-100 text-slate-600", ACTION_REQUIRED: "bg-orange-50 text-orange-700", CORRECTIONS_REQUESTED: "bg-orange-50 text-orange-700",
};

export function StatusBadge({ value }) {
  if (!value) return null;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[value] || "bg-slate-100 text-slate-700"}`}>{title(value)}</span>;
}

export const statusCol = (field = "status", headerName = "Status", options = {}) => ({
  field, headerName, cellRenderer: (p) => <StatusBadge value={p.value} />, filter: "agTextColumnFilter", filterParams: { filterOptions: ["equals"], maxNumConditions: 1 }, ...options,
});
export const moneyCol = (field = "amount", headerName = "Amount (INR)", options = {}) => ({
  field, headerName, filter: "agNumberColumnFilter", valueFormatter: (p) => (p.value == null ? "" : inr(p.value)), type: "rightAligned", ...options,
});
export const dateCol = (field = "createdAt", headerName = "Date", options = {}) => ({
  field, headerName, filter: "agDateColumnFilter", valueFormatter: (p) => dateTime(p.value), minWidth: 170, ...options,
});
export const textCol = (field, headerName, options = {}) => ({ field, headerName, filter: "agTextColumnFilter", ...options });
export const plainCol = (field, headerName, options = {}) => ({ field, headerName, sortable: false, filter: false, ...options });
