import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, CheckCircle2, XCircle, AlertTriangle, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getVerificationDetails, startVerificationReview, reviewDocument, decideVerification, downloadNGODocument } from "../../services/adminService";
import { dateTime, title } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, Field, inputClass, QueryState, Modal } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";

export default function VerificationDetail() {
  const { ngoId } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-ngo", ngoId], queryFn: async () => (await getVerificationDetails(ngoId)).data });
  const [dlg, setDlg] = useState(null); // { kind:'doc'|'ngo', decision, id }
  const [note, setNote] = useState("");
  const done = (m) => { toast.success(m || "Saved"); setDlg(null); setNote(""); qc.invalidateQueries({ queryKey: ["admin-ngo", ngoId] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); };
  const fail = (e) => toast.error(e.message);
  const start = useMutation({ mutationFn: () => startVerificationReview(ngoId), onSuccess: (r) => done(r.message), onError: fail });
  const docM = useMutation({ mutationFn: () => reviewDocument(ngoId, dlg.id, dlg.decision, note), onSuccess: (r) => done(r.message), onError: fail });
  const decM = useMutation({ mutationFn: () => decideVerification(ngoId, dlg.decision, note), onSuccess: (r) => done(r.message), onError: fail });
  const needsNote = dlg && dlg.decision !== "APPROVED" && dlg.decision !== "APPROVE";

  return (
    <>
      <Link to="/admin/verifications" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-forest"><ArrowLeft size={16} /> Verification queue</Link>
      <QueryState query={q}>{(n) => (
        <div className="space-y-6">
          <PageHeader title={n.organizationName} subtitle={`${n.user?.email} · registered ${dateTime(n.user?.createdAt)}`} actions={<StatusBadge value={n.status} />} />
          {n.reviewNote && <Notice tone="info"><b>Last note:</b> {n.reviewNote}</Notice>}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Profile">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">{[["Legal name", n.legalName], ["Registration no.", n.registrationNumber], ["Phone", n.phone], ["Website", n.website], ["Address", [n.address, n.city, n.state, n.country].filter(Boolean).join(", ")], ["Minimum donation", n.minimumDonation != null ? `₹${n.minimumDonation}` : null]].map(([k, v]) => <div key={k}><dt className="text-xs uppercase text-[#829087]">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>)}</dl>
              {["description", "mission", "vision"].map((k) => <div key={k} className="mt-4"><p className="text-xs uppercase text-[#829087]">{k}</p><p className="text-sm">{n[k] || "—"}</p></div>)}
            </Section>
            <Section title="Documents" description="Files are served privately through authenticated downloads.">
              {n.documents.length === 0 ? <p className="text-sm text-[#64716B]">No documents uploaded.</p> : (
                <ul className="space-y-3">{n.documents.map((d) => (
                  <li key={d.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{title(d.type)}</p><StatusBadge value={d.reviewStatus} /></div>
                    <p className="text-xs text-[#829087]">{d.fileName} · {dateTime(d.createdAt)}</p>{d.reviewReason && <p className="mt-1 text-xs text-orange-700">Note: {d.reviewReason}</p>}
                    <div className="mt-2 flex flex-wrap gap-2"><Btn variant="outline" className="!px-3 !py-1.5" onClick={() => downloadNGODocument(d.id).catch((e) => toast.error(e.message))}><Download size={14} /> Open</Btn>
                      <Btn variant="outline" className="!px-3 !py-1.5" onClick={() => setDlg({ kind: "doc", decision: "APPROVED", id: d.id })}><CheckCircle2 size={14} /> Approve</Btn>
                      <Btn variant="outline" className="!px-3 !py-1.5" onClick={() => setDlg({ kind: "doc", decision: "ACTION_REQUIRED", id: d.id })}><AlertTriangle size={14} /> Needs action</Btn>
                      <Btn variant="outline" className="!px-3 !py-1.5" onClick={() => setDlg({ kind: "doc", decision: "REJECTED", id: d.id })}><XCircle size={14} /> Reject</Btn></div></li>))}</ul>)}
            </Section>
          </div>
          <Section title="Decision">
            <div className="flex flex-wrap gap-3">
              {n.status === "SUBMITTED" && <Btn variant="outline" loading={start.isPending} onClick={() => start.mutate()}><PlayCircle size={16} /> Start review</Btn>}
              <Btn disabled={!["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "REJECTED"].includes(n.status)} onClick={() => setDlg({ kind: "ngo", decision: "APPROVE" })}><CheckCircle2 size={16} /> Approve NGO</Btn>
              <Btn variant="gold" disabled={!["SUBMITTED", "UNDER_REVIEW"].includes(n.status)} onClick={() => setDlg({ kind: "ngo", decision: "ACTION_REQUIRED" })}><AlertTriangle size={16} /> Request corrections</Btn>
              <Btn variant="danger" disabled={!["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(n.status)} onClick={() => setDlg({ kind: "ngo", decision: "REJECT" })}><XCircle size={16} /> Reject</Btn>
            </div>
            <p className="mt-3 text-xs text-[#829087]">Approval requires all required documents to be approved. Every decision is recorded in the audit log.</p>
          </Section>
          <Modal open={Boolean(dlg)} onClose={() => setDlg(null)} title={dlg ? `${title(dlg.decision)} ${dlg.kind === "doc" ? "document" : "NGO"}` : ""}>
            <Field label={needsNote ? "Reason / note (required)" : "Note (optional)"} htmlFor="note"><textarea id="note" rows={4} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="mt-4 flex justify-end gap-2"><Btn variant="outline" onClick={() => setDlg(null)}>Cancel</Btn>
              <Btn loading={docM.isPending || decM.isPending} disabled={needsNote && !note.trim()} onClick={() => (dlg.kind === "doc" ? docM.mutate() : decM.mutate())}>Confirm</Btn></div>
          </Modal>
        </div>)}</QueryState>
    </>
  );
}
