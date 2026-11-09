import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PageHeader } from "../../components/portal/ui";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, statusCol, textCol, plainCol } from "../../components/grid/cells";

const cols = [
  textCol("organizationName", "NGO", { flex: 2 }),
  textCol("email", "Contact email", { sortable: true, flex: 1.6 }),
  statusCol("status", "Status"),
  textCol("city", "City"),
  dateCol("submittedAt", "Submitted"),
  plainCol("documents", "Docs", { maxWidth: 90, valueGetter: (p) => `${p.data?.documentsApproved ?? 0}/${p.data?.documents ?? 0} ok` }),
];

export default function VerificationQueue() {
  const nav = useNavigate();
  const [scope, setScope] = useState("queue");
  return (
    <>
      <PageHeader title="NGO verification" subtitle="Open an application to review documents and approve, reject or request corrections." />
      <div className="mb-4 flex gap-2">{[["queue", "Needs review"], ["all", "All NGOs"]].map(([id, l]) => <button key={id} onClick={() => setScope(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${scope === id ? "bg-forest text-white" : "border border-border bg-white text-forest"}`}>{l}</button>)}</div>
      <ServerGrid key={scope} endpoint="/admin/grids/verifications" extraParams={{ scope: scope === "all" ? "all" : undefined }} columns={cols} searchPlaceholder="Search NGO, email or city…" emptyMessage="No applications in this view." onRowClicked={(r) => nav(`/admin/verifications/${r.id}`)} />
    </>
  );
}
