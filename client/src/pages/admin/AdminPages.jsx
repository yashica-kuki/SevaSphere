import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { get, send } from "../../lib/q";
import { inrFromAmount, dateTime, title } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, Field, inputClass, Modal, QueryState } from "../../components/portal/ui";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, moneyCol, statusCol, textCol, plainCol, StatusBadge } from "../../components/grid/cells";
import { ExecutionTimeline } from "../donor/DonorSevaKarma";
import { LevelBadge } from "../donor/DonorNgoDetail";

const useRefresh = () => { const [n, setN] = useState(0); return [n, () => setN((x) => x + 1)]; };

/* ---------- Users ---------- */
export function AdminUsers() {
  const [refresh, bump] = useRefresh();
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => send("patch", `/admin/users/${target.id}/status`, { isActive: !target.isActive, reason }),
    onSuccess: (r) => { toast.success(r.message); setTarget(null); setReason(""); bump(); },
    onError: (e) => toast.error(e.message),
  });
  const cols = [
    textCol("name", "Name", { flex: 1.4 }), textCol("email", "Email", { flex: 1.8 }),
    statusCol("role", "Role"),
    { field: "isActive", headerName: "Account", filter: false, cellRenderer: (p) => <StatusBadge value={p.value ? "ACTIVE" : "CANCELLED"} /> },
    dateCol("createdAt", "Joined"),
    { headerName: "", sortable: false, filter: false, maxWidth: 140, cellRenderer: (p) => p.data.role === "ADMIN" ? null : <button className="text-sm font-semibold text-forest underline" onClick={() => setTarget(p.data)}>{p.data.isActive ? "Suspend" : "Reactivate"}</button> },
  ];
  return (<>
    <PageHeader title="Users" subtitle="Suspending a donor pauses their schedules; suspending an NGO removes it from matching immediately." />
    <ServerGrid endpoint="/admin/grids/users" columns={cols} refreshKey={refresh} searchPlaceholder="Search name or email…" />
    <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={target ? `${target.isActive ? "Suspend" : "Reactivate"} ${target.name}` : ""}>
      <Field label="Reason (required, recorded in the audit log)" htmlFor="why"><textarea id="why" rows={3} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="mt-4 flex justify-end gap-2"><Btn variant="outline" onClick={() => setTarget(null)}>Cancel</Btn><Btn variant={target?.isActive ? "danger" : "primary"} disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>Confirm</Btn></div>
    </Modal></>);
}

/* ---------- Donations ---------- */
export function AdminDonations() {
  const qc = useQueryClient();
  const [refresh, bump] = useRefresh();
  const [sel, setSel] = useState(null);
  const [reason, setReason] = useState("");
  const detail = useQuery({ queryKey: ["admin-donation", sel], queryFn: () => get(`/admin/donations/${sel}`), enabled: Boolean(sel) });
  const refund = useMutation({
    mutationFn: () => send("post", `/admin/donations/${sel}/refund`, { reason }),
    onSuccess: (r) => { toast.success(r.message); setReason(""); bump(); qc.invalidateQueries({ queryKey: ["admin-donation", sel] }); },
    onError: (e) => toast.error(e.message),
  });
  const cols = [
    plainCol("id", "ID", { valueFormatter: (p) => p.value?.slice(0, 8).toUpperCase(), maxWidth: 120 }),
    dateCol("createdAt", "Date"), textCol("donor", "Donor", { sortable: true }), moneyCol("amount", "Amount (INR)"), statusCol("status", "Status"),
    plainCol("source", "Source"), plainCol("recipients", "Recipients", { flex: 2.4, minWidth: 260 }),
  ];
  return (<>
    <PageHeader title="Donations" subtitle="All donations with allocation and wallet-ledger detail. Click a row to investigate or refund." />
    <ServerGrid endpoint="/admin/grids/donations" columns={cols} refreshKey={refresh} searchPlaceholder="Search donor name or email…" onRowClicked={(r) => setSel(r.id)} />
    <Modal wide open={Boolean(sel)} onClose={() => setSel(null)} title="Donation detail">
      <QueryState query={detail}>{(d) => (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge value={d.status} /><b>{inrFromAmount(d.amount)}</b><span className="text-[#64716B]">{d.donor.name} ({d.donor.email}) · {dateTime(d.createdAt)} · {title(d.source)}</span></div>
          {d.execution && <p>Agent execution: <StatusBadge value={d.execution.status} /> {d.execution.error}</p>}
          <div><p className="mb-1 font-semibold">Allocations</p><ul className="divide-y divide-border rounded-xl border border-border">{d.allocations.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3"><span>{a.ngo} <span className="text-xs text-[#829087]">score {a.matchScore}</span></span><span className="flex items-center gap-2">{inrFromAmount(a.amount)} <StatusBadge value={a.status} /> payout: {title(a.payoutStatus || "—")}</span></li>)}</ul></div>
          <div><p className="mb-1 font-semibold">Wallet ledger</p><ul className="divide-y divide-border rounded-xl border border-border">{d.ledger.map((l) => <li key={l.id} className="flex justify-between gap-2 p-3"><span>{title(l.type)} · {l.description}</span><span>{inrFromAmount(l.amount)}</span></li>)}</ul></div>
          {d.status === "COMPLETED" && (<div className="rounded-xl border border-border p-3"><Field label="Refund to donor wallet (reason required)" htmlFor="rf"><input id="rf" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Btn className="mt-3" variant="danger" disabled={reason.trim().length < 3} loading={refund.isPending} onClick={() => window.confirm("Refund this donation?") && refund.mutate()}>Refund donation</Btn>
            <p className="mt-2 text-xs text-[#829087]">Not possible once any payout has been processed.</p></div>)}
        </div>)}</QueryState>
    </Modal></>);
}

/* ---------- Payments ---------- */
export function AdminPayments() {
  const cols = [dateCol("createdAt", "Date"), textCol("user", "User", { flex: 1.5 }), textCol("provider", "Provider"), plainCol("orderId", "Order ID", { flex: 1.3 }), plainCol("captureId", "Capture ID", { flex: 1.3 }),
    { field: "amount", headerName: "Amount", filter: false, sortable: false, valueGetter: (p) => `${p.data?.currency} ${p.data?.amount}` }, statusCol("status", "Status"), plainCol("outcome", "Outcome")];
  return (<><PageHeader title="Payments" subtitle="PayPal Sandbox transactions (USD). These never touch the simulated INR wallet." /><ServerGrid endpoint="/admin/grids/payments" columns={cols} searchPlaceholder="Search order, capture or email…" /></>);
}

/* ---------- Payouts ---------- */
export function AdminPayouts() {
  const [refresh, bump] = useRefresh();
  const [p, setP] = useState(null); const [ref, setRef] = useState("");
  const m = useMutation({ mutationFn: (status) => send("patch", `/admin/payouts/${p.id}`, { status, reference: ref || undefined }), onSuccess: (r) => { toast.success(r.message); setP(null); setRef(""); bump(); }, onError: (e) => toast.error(e.message) });
  const cols = [dateCol("createdAt", "Requested"), textCol("ngo", "NGO", { flex: 1.5 }), moneyCol("amount", "Amount (INR)"), statusCol("status", "Status"), textCol("reference", "Reference"), dateCol("processedAt", "Processed")];
  return (<>
    <PageHeader title="NGO payouts" subtitle="Payouts are created when a donation commits. Mark them as processed after the (simulated) transfer." />
    <ServerGrid endpoint="/admin/grids/payouts" columns={cols} refreshKey={refresh} searchPlaceholder="Search NGO or reference…" onRowClicked={(r) => ["REQUESTED", "PROCESSING"].includes(r.status) && setP(r)} />
    <Modal open={Boolean(p)} onClose={() => setP(null)} title={`Payout to ${p?.ngo ?? ""}`}>
      <p className="mb-3 text-sm">Amount {p && inrFromAmount({ rupees: p.amount })}</p>
      <Field label="Bank/transfer reference (required to complete)" htmlFor="pr"><input id="pr" className={inputClass} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      <div className="mt-4 flex flex-wrap justify-end gap-2">{p?.status === "REQUESTED" && <Btn variant="outline" loading={m.isPending} onClick={() => m.mutate("PROCESSING")}>Mark processing</Btn>}<Btn variant="danger" onClick={() => m.mutate("FAILED")}>Mark failed</Btn><Btn disabled={!ref.trim() && !p?.reference} loading={m.isPending} onClick={() => m.mutate("COMPLETED")}>Mark completed</Btn></div>
    </Modal></>);
}

/* ---------- Agents ---------- */
export function AdminAgents() {
  const [sel, setSel] = useState(null);
  const detail = useQuery({ queryKey: ["admin-exec", sel], queryFn: () => get(`/admin/agent/executions/${sel}`), enabled: Boolean(sel) });
  const cols = [dateCol("createdAt", "Started"), textCol("user", "User", { flex: 1.4 }), textCol("trigger", "Trigger"), statusCol("status", "Status"), textCol("currentNode", "Last node", { flex: 1.5 }), plainCol("steps", "Steps", { maxWidth: 90 }), plainCol("error", "Error", { flex: 2 })];
  return (<>
    <PageHeader title="Agent monitor" subtitle="LangGraph workflow runs. Open one to see each node, its duration, tool outputs and errors. Secrets are never stored in these logs." />
    <ServerGrid endpoint="/admin/grids/executions" columns={cols} searchPlaceholder="Search user or error…" onRowClicked={(r) => setSel(r.id)} />
    <Modal wide open={Boolean(sel)} onClose={() => setSel(null)} title="Workflow execution">
      <QueryState query={detail}>{(d) => (<div className="space-y-4 text-sm"><div className="flex flex-wrap gap-3"><StatusBadge value={d.status} /><span>{d.user} · {title(d.trigger)} · {dateTime(d.startedAt)}</span></div>{d.error && <Notice tone="error">{d.error}</Notice>}<ExecutionTimeline steps={d.steps} /></div>)}</QueryState>
    </Modal></>);
}

/* ---------- Impact review ---------- */
export function AdminImpact() {
  const [refresh, bump] = useRefresh();
  const [scope, setScope] = useState("queue");
  const [sel, setSel] = useState(null); const [note, setNote] = useState("");
  const detail = useQuery({ queryKey: ["admin-report", sel], queryFn: () => get(`/admin/impact-reports/${sel}`), enabled: Boolean(sel) });
  const review = useMutation({ mutationFn: (decision) => send("post", `/admin/impact-reports/${sel}/review`, { decision, note }), onSuccess: (r) => { toast.success(r.message); setSel(null); setNote(""); bump(); }, onError: (e) => toast.error(e.message) });
  const open = async (e) => { try { const res = await api.get(`/impact-evidence/${e.id}/download`, { responseType: "blob" }); window.open(URL.createObjectURL(res.data), "_blank", "noopener"); } catch (err) { toast.error(err.message); } };
  const cols = [dateCol("submittedAt", "Submitted"), textCol("ngo", "NGO", { flex: 1.4 }), textCol("title", "Report", { flex: 2 }), statusCol("status", "Status"), { field: "verificationLevel", headerName: "Verification", flex: 1.6, filter: "agTextColumnFilter", cellRenderer: (p) => <LevelBadge level={p.value} /> }, plainCol("evidenceCount", "Evidence", { maxWidth: 110 })];
  return (<>
    <PageHeader title="Impact review" subtitle="Check NGO-reported claims against evidence. Only “Independently verified” should be used when you have confirmed outcomes yourself." />
    <div className="mb-4 flex gap-2">{[["queue", "Awaiting review"], ["all", "All submitted"]].map(([id, l]) => <button key={id} onClick={() => setScope(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${scope === id ? "bg-forest text-white" : "border border-border bg-white text-forest"}`}>{l}</button>)}</div>
    <ServerGrid key={scope} endpoint="/admin/grids/impact-reports" extraParams={{ scope: scope === "all" ? "all" : undefined }} columns={cols} refreshKey={refresh} searchPlaceholder="Search NGO or title…" onRowClicked={(r) => setSel(r.id)} />
    <Modal wide open={Boolean(sel)} onClose={() => setSel(null)} title="Review report">
      <QueryState query={detail}>{(r) => (<div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2"><b>{r.ngo}</b><StatusBadge value={r.status} /><LevelBadge level={r.verificationLevel} /></div>
        <h4 className="text-base font-bold">{r.title}</h4><p>{r.description}</p>
        <div><p className="font-semibold">Beneficiaries (NGO-reported)</p><ul className="list-disc pl-5">{r.beneficiaries.map((b, i) => <li key={i}>{b.group}: {b.count} {b.note && `— ${b.note}`}</li>)}</ul></div>
        <div><p className="font-semibold">Fund utilization (NGO-reported)</p><ul className="list-disc pl-5">{r.fundUtilization.map((x, i) => <li key={i}>{x.category}: {inrFromAmount(x.amount)}</li>)}</ul></div>
        <div><p className="font-semibold">Evidence</p><ul className="divide-y divide-border rounded-xl border border-border">{r.evidence.map((e) => <li key={e.id} className="flex justify-between p-2"><span>{e.title}</span>{e.isFile ? <button className="font-semibold text-forest underline" onClick={() => open(e)}>Open file</button> : <a className="font-semibold text-forest underline" href={e.url} target="_blank" rel="noopener noreferrer">Open link</a>}</li>)}</ul></div>
        {r.status !== "DRAFT" && (<><Field label="Review note (required for corrections or verification)" htmlFor="rn"><textarea id="rn" rows={3} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2"><Btn variant="outline" loading={review.isPending} onClick={() => review.mutate("REVIEWED")}>Mark reviewed</Btn><Btn disabled={note.trim().length < 3} loading={review.isPending} onClick={() => review.mutate("VERIFIED")}>Mark independently verified</Btn><Btn variant="gold" disabled={note.trim().length < 3} loading={review.isPending} onClick={() => review.mutate("CORRECTIONS")}>Request corrections</Btn></div></>)}
      </div>)}</QueryState>
    </Modal></>);
}

/* ---------- Audit ---------- */
export function AdminAudit() {
  const cols = [dateCol("createdAt", "Time"), textCol("actor", "Actor", { flex: 1.4 }), textCol("action", "Action", { flex: 1.4 }), textCol("entity", "Entity"), plainCol("entityId", "Entity ID", { valueFormatter: (p) => p.value?.slice(0, 8) }), plainCol("metadata", "Details", { flex: 2, tooltipField: "metadata" })];
  return (<><PageHeader title="Audit logs" subtitle="Security- and money-relevant actions by admins, donors and the platform." /><ServerGrid endpoint="/admin/grids/audit-logs" columns={cols} searchPlaceholder="Search action, entity or actor…" pageSize={25} height={640} /></>);
}

/* ---------- Enquiries ---------- */
export function AdminEnquiries() {
  const [refresh, bump] = useRefresh();
  const [sel, setSel] = useState(null); const [status, setStatus] = useState("NEW"); const [adminNote, setAdminNote] = useState("");
  const m = useMutation({ mutationFn: () => send("patch", `/admin/enquiries/${sel.id}`, { status, adminNote }), onSuccess: (r) => { toast.success(r.message); setSel(null); bump(); }, onError: (e) => toast.error(e.message) });
  const cols = [dateCol("createdAt", "Received"), textCol("name", "From"), textCol("email", "Email", { flex: 1.5 }), plainCol("role", "Role", { maxWidth: 110 }), textCol("subject", "Subject", { flex: 2 }), statusCol("status", "Status")];
  return (<>
    <PageHeader title="Enquiries" subtitle="Messages from the public contact form and signed-in donors and NGOs." />
    <ServerGrid endpoint="/admin/grids/enquiries" columns={cols} refreshKey={refresh} searchPlaceholder="Search enquiries…" onRowClicked={(r) => { setSel(r); setStatus(r.status); setAdminNote(r.adminNote ?? ""); }} />
    <Modal wide open={Boolean(sel)} onClose={() => setSel(null)} title={sel?.subject ?? ""}>
      {sel && <div className="space-y-4 text-sm"><p className="text-[#64716B]">{sel.name} · {sel.email} · {dateTime(sel.createdAt)}</p><p className="whitespace-pre-wrap rounded-xl bg-ivory p-4">{sel.message}</p>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]"><Field label="Status" htmlFor="es"><select id="es" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select></Field>
          <Field label="Internal note" htmlFor="en"><input id="en" className={inputClass} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} /></Field></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={() => setSel(null)}>Close</Btn><Btn loading={m.isPending} onClick={() => m.mutate()}>Save</Btn></div></div>}
    </Modal></>);
}
