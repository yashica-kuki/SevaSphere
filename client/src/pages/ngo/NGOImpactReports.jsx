import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Paperclip, Link2, Send, Save, ArrowLeft, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { get, send } from "../../lib/q";
import { dateTime } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, Field, inputClass, QueryState, PageLoader } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, statusCol, textCol } from "../../components/grid/cells";
import { LevelBadge } from "../donor/DonorNgoDetail";

const listCols = [
  dateCol("reportedAt", "Date"),
  textCol("title", "Title", { flex: 2 }),
  statusCol("status", "Review status"),
  { field: "verificationLevel", headerName: "Verification", filter: "agTextColumnFilter", flex: 1.6, cellRenderer: (p) => <LevelBadge level={p.value} /> },
  { field: "peopleImpacted", headerName: "People", filter: "agNumberColumnFilter" },
];

export function NGOImpactReportList() {
  const nav = useNavigate();
  return (
    <>
      <PageHeader title="Impact reports" subtitle="Tell donors what their money achieved. Reports you submit are labelled “Reported by NGO” until a SevaSphere reviewer checks them." actions={<Btn onClick={() => nav("/ngo/impact-reports/new")}><Plus size={16} /> New report</Btn>} />
      <Notice tone="info" className="mb-4"><b>Reported vs verified.</b> Your figures are shown publicly as NGO-reported. Reviewers may mark a report <i>admin-reviewed</i> or <i>independently verified</i> after checking your evidence.</Notice>
      <ServerGrid endpoint="/ngo/grids/impact-reports" columns={listCols} searchPlaceholder="Search reports…" emptyMessage="No reports yet. Create your first one." onRowClicked={(r) => nav(`/ngo/impact-reports/${r.id}`)} />
    </>
  );
}

const emptyReport = { title: "", description: "", allocationId: "", beneficiaries: [{ group: "", count: "", note: "" }], fundUtilization: [{ category: "", amount: "", note: "" }] };

export function NGOImpactReportEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ngo-report", id], queryFn: () => get(`/ngo/impact-reports/${id}`), enabled: !isNew });
  const [f, setF] = useState(isNew ? emptyReport : null);
  const [evTitle, setEvTitle] = useState(""); const [link, setLink] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (q.data && !f) setF({ title: q.data.title, description: q.data.description, allocationId: q.data.allocationId ?? "", beneficiaries: q.data.beneficiaries.length ? q.data.beneficiaries.map((b) => ({ ...b, count: String(b.count) })) : emptyReport.beneficiaries, fundUtilization: q.data.fundUtilization.length ? q.data.fundUtilization.map((x) => ({ category: x.category, amount: String(x.amount.rupees), note: x.note })) : emptyReport.fundUtilization });
  }, [q.data, f]);

  const payload = () => ({
    title: f.title, description: f.description, allocationId: f.allocationId || null,
    beneficiaries: f.beneficiaries.filter((b) => b.group.trim()).map((b) => ({ group: b.group, count: Number(b.count || 0), note: b.note || "" })),
    fundUtilization: f.fundUtilization.filter((x) => x.category.trim() && x.amount !== "").map((x) => ({ category: x.category, amount: x.amount, note: x.note || "" })),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ngo-report", id] }); };
  const saveM = useMutation({
    mutationFn: () => (isNew ? send("post", "/ngo/impact-reports", payload()) : send("put", `/ngo/impact-reports/${id}`, payload())),
    onSuccess: (r) => { toast.success(r.message); if (isNew) nav(`/ngo/impact-reports/${r.data.id}`, { replace: true }); else refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const submitM = useMutation({
    mutationFn: async () => { await send("put", `/ngo/impact-reports/${id}`, payload()); return send("post", `/ngo/impact-reports/${id}/submit`); },
    onSuccess: (r) => { toast.success(r.message); refresh(); qc.invalidateQueries({ queryKey: ["ngo-report-list"] }); },
    onError: (e) => toast.error(e.message),
  });
  const delM = useMutation({ mutationFn: () => send("delete", `/ngo/impact-reports/${id}`), onSuccess: () => { toast.success("Draft deleted"); nav("/ngo/impact-reports"); }, onError: (e) => toast.error(e.message) });
  const addFile = useMutation({
    mutationFn: async () => { const file = fileRef.current?.files?.[0]; if (!file) throw new Error("Choose a file first"); const fd = new FormData(); fd.append("file", file); if (evTitle) fd.append("title", evTitle); return (await api.post(`/ngo/impact-reports/${id}/evidence`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data; },
    onSuccess: () => { toast.success("Evidence uploaded"); setEvTitle(""); if (fileRef.current) fileRef.current.value = ""; refresh(); }, onError: (e) => toast.error(e.message),
  });
  const addLink = useMutation({ mutationFn: () => send("post", `/ngo/impact-reports/${id}/evidence`, { title: evTitle || "Link", url: link }), onSuccess: () => { toast.success("Link added"); setLink(""); setEvTitle(""); refresh(); }, onError: (e) => toast.error(e.message) });
  const rmEv = useMutation({ mutationFn: (eid) => send("delete", `/ngo/impact-reports/${id}/evidence/${eid}`), onSuccess: refresh, onError: (e) => toast.error(e.message) });

  if (!isNew && q.isLoading) return <PageLoader />;
  if (!isNew && q.isError) return <Notice tone="error">{q.error.message}</Notice>;
  if (!f) return <PageLoader />;

  const r = q.data;
  const locked = r && !["DRAFT", "CORRECTIONS_REQUESTED"].includes(r.status);
  const setRow = (key, i, k, v) => setF((s) => ({ ...s, [key]: s[key].map((row, j) => (j === i ? { ...row, [k]: v } : row)) }));
  const addRow = (key, row) => setF((s) => ({ ...s, [key]: [...s[key], row] }));
  const delRow = (key, i) => setF((s) => ({ ...s, [key]: s[key].filter((_, j) => j !== i) }));
  const downloadEvidence = async (e) => {
    try { const res = await api.get(`/impact-evidence/${e.id}/download`, { responseType: "blob" }); window.open(URL.createObjectURL(res.data), "_blank", "noopener"); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <Link to="/ngo/impact-reports" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-forest"><ArrowLeft size={16} /> All reports</Link>
      <PageHeader title={isNew ? "New impact report" : f.title || "Impact report"} actions={r && <div className="flex items-center gap-2"><StatusBadge value={r.status} /><LevelBadge level={r.verificationLevel} /></div>} />
      {r?.status === "CORRECTIONS_REQUESTED" && <Notice tone="warn" className="mb-4"><b>Corrections requested:</b> {r.reviewNote}</Notice>}
      {r?.status === "REVIEWED" && <Notice tone="success" className="mb-4">Reviewed {dateTime(r.reviewedAt)}. {r.reviewNote}</Notice>}
      {locked && <Notice tone="info" className="mb-4">This report was submitted and is read-only{r.status === "SUBMITTED" ? " while it awaits review" : ""}.</Notice>}

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
        <Section title="Summary">
          <div className="grid gap-4">
            <Field label="Title" htmlFor="rt"><input id="rt" required minLength={3} maxLength={150} disabled={locked} className={inputClass} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="What was achieved?" htmlFor="rd" hint="Describe activities and outcomes. Stick to facts you can evidence."><textarea id="rd" required minLength={10} rows={5} disabled={locked} className={inputClass} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          </div>
        </Section>
        <Section title="Beneficiaries" description="Who benefited and how many people.">
          {f.beneficiaries.map((b, i) => (
            <div key={i} className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
              <input aria-label="Beneficiary group" placeholder="Group (e.g. Primary school children)" disabled={locked} className={inputClass} value={b.group} onChange={(e) => setRow("beneficiaries", i, "group", e.target.value)} />
              <input aria-label="Count" type="number" min="0" placeholder="Count" disabled={locked} className={inputClass} value={b.count} onChange={(e) => setRow("beneficiaries", i, "count", e.target.value)} />
              <input aria-label="Note" placeholder="Note (optional)" disabled={locked} className={inputClass} value={b.note} onChange={(e) => setRow("beneficiaries", i, "note", e.target.value)} />
              {!locked && <button type="button" aria-label="Remove row" onClick={() => delRow("beneficiaries", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
            </div>))}
          {!locked && <Btn variant="outline" onClick={() => addRow("beneficiaries", { group: "", count: "", note: "" })}><Plus size={16} /> Add group</Btn>}
        </Section>
        <Section title="Fund utilization" description="How donated funds were used (in ₹).">
          {f.fundUtilization.map((x, i) => (
            <div key={i} className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
              <input aria-label="Category" placeholder="Category (e.g. Books and uniforms)" disabled={locked} className={inputClass} value={x.category} onChange={(e) => setRow("fundUtilization", i, "category", e.target.value)} />
              <input aria-label="Amount in rupees" inputMode="decimal" placeholder="₹ amount" disabled={locked} className={inputClass} value={x.amount} onChange={(e) => setRow("fundUtilization", i, "amount", e.target.value)} />
              <input aria-label="Note" placeholder="Note (optional)" disabled={locked} className={inputClass} value={x.note} onChange={(e) => setRow("fundUtilization", i, "note", e.target.value)} />
              {!locked && <button type="button" aria-label="Remove row" onClick={() => delRow("fundUtilization", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
            </div>))}
          {!locked && <Btn variant="outline" onClick={() => addRow("fundUtilization", { category: "", amount: "", note: "" })}><Plus size={16} /> Add item</Btn>}
        </Section>

        {!locked && <div className="flex flex-wrap gap-3"><Btn type="submit" loading={saveM.isPending}><Save size={16} /> Save draft</Btn>
          {!isNew && <Btn variant="gold" loading={submitM.isPending} onClick={() => window.confirm("Submit this report for review? You will not be able to edit it afterwards unless corrections are requested.") && submitM.mutate()}><Send size={16} /> Submit for review</Btn>}
          {!isNew && r?.status === "DRAFT" && <Btn variant="danger" onClick={() => window.confirm("Delete this draft?") && delM.mutate()}><Trash2 size={16} /> Delete draft</Btn>}</div>}
      </form>

      {!isNew && (
        <Section title="Evidence" className="mt-6" description="Upload photos, receipts or documents (PDF, JPG, PNG, MP4 — max 10 MB), or link to public material. At least one item is required to submit. Uploaded files are stored privately and visible only to you and reviewers.">
          <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
            {r.evidence.length === 0 && <li className="p-4 text-sm text-[#64716B]">No evidence yet.</li>}
            {r.evidence.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="flex min-w-0 items-center gap-2"><FileText size={16} className="shrink-0 text-[#829087]" /><span className="truncate">{e.title}{e.fileName ? ` (${e.fileName})` : ""}</span></span>
                <span className="flex gap-2">{e.isFile ? <button type="button" onClick={() => downloadEvidence(e)} className="font-semibold text-forest underline">Open</button> : <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline">Open link</a>}
                  {!locked && <button type="button" aria-label="Remove evidence" onClick={() => rmEv.mutate(e.id)} className="text-red-600"><Trash2 size={16} /></button>}</span></li>))}
          </ul>
          {!locked && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border p-4"><p className="text-sm font-semibold">Upload a file</p>
                <input aria-label="Evidence title" className={inputClass} placeholder="Title (optional)" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
                <input ref={fileRef} aria-label="Evidence file" type="file" accept=".pdf,.jpg,.jpeg,.png,.mp4" className="block w-full text-sm" />
                <Btn variant="outline" loading={addFile.isPending} onClick={() => addFile.mutate()}><Paperclip size={16} /> Upload</Btn></div>
              <div className="space-y-2 rounded-xl border border-border p-4"><p className="text-sm font-semibold">Add a link</p>
                <input aria-label="Link URL" className={inputClass} placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
                <Btn variant="outline" loading={addLink.isPending} onClick={() => addLink.mutate()}><Link2 size={16} /> Add link</Btn></div>
            </div>)}
        </Section>
      )}
    </>
  );
}
