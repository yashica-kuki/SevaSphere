import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ShieldCheck, FileWarning } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { dateTime, title } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, QueryState } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";

const STEPS = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "VERIFIED"];
const COPY = {
  DRAFT: "Complete your profile and upload the required documents, then submit for review.",
  SUBMITTED: "Your application is in the review queue. We will update this page when a reviewer picks it up.",
  UNDER_REVIEW: "A reviewer is checking your documents.",
  VERIFIED: "Your organization is verified and can receive donations from the SevaSphere agent.",
  REJECTED: "Your application was rejected. Read the reviewer's note, correct the issues and submit again.",
  ACTION_REQUIRED: "The reviewer needs corrections before they can continue. Update the flagged items and resubmit.",
  SUSPENDED: "Your organization is suspended and cannot receive donations. Contact support.",
};

export default function NGOVerification() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ngo-verification"], queryFn: () => get("/ngo/verification") });
  const submit = useMutation({
    mutationFn: () => send("post", "/ngo/verification/submit"),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["ngo-verification"] }); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Verification" subtitle="Only verified organizations appear to donors and can receive donations." />
      <QueryState query={q}>{(v) => {
        const idx = STEPS.indexOf(v.status);
        return (
          <div className="space-y-6">
            <Section title="Status" actions={<StatusBadge value={v.status} />}>
              <ol className="mb-4 grid gap-3 sm:grid-cols-4">{STEPS.map((s, i) => (
                <li key={s} className={`rounded-xl border p-3 text-sm ${i <= idx ? "border-forest bg-sage/50 font-semibold text-forest" : "border-border text-[#829087]"}`}>{i + 1}. {title(s)}</li>))}</ol>
              <p className="text-sm text-[#4B5A54]">{COPY[v.status]}</p>
              {v.submittedAt && <p className="mt-1 text-xs text-[#829087]">Submitted {dateTime(v.submittedAt)}{v.reviewedAt ? ` · Reviewed ${dateTime(v.reviewedAt)}` : ""}</p>}
              {v.reviewNote && <Notice tone={v.status === "VERIFIED" ? "success" : "warn"} className="mt-4"><b>Reviewer note:</b> {v.reviewNote}</Notice>}
            </Section>
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Profile checklist" actions={<Link to="/ngo/profile" className="text-sm font-semibold text-forest underline">Edit profile</Link>}>
                <ul className="grid gap-2 sm:grid-cols-2">{v.checklist.profile.map((p) => (
                  <li key={p.field} className="flex items-center gap-2 text-sm">{p.complete ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-[#B5BDB8]" />}{title(p.field.replace(/([A-Z])/g, " $1"))}</li>))}</ul>
              </Section>
              <Section title="Required documents" actions={<Link to="/ngo/documents" className="text-sm font-semibold text-forest underline">Manage documents</Link>}>
                <ul className="space-y-3">{v.checklist.documents.map((d) => (
                  <li key={d.type} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2">{d.complete ? <CheckCircle2 size={16} className="text-emerald-600" /> : d.uploaded ? <FileWarning size={16} className="text-orange-600" /> : <Circle size={16} className="text-[#B5BDB8]" />}{title(d.type)}</span>
                    {d.uploaded ? <StatusBadge value={d.reviewStatus} /> : <span className="text-xs text-[#98A19B]">Not uploaded</span>}</li>))}</ul>
              </Section>
            </div>
            <div className="flex items-center gap-3">
              <Btn disabled={!v.canSubmit} loading={submit.isPending} onClick={() => submit.mutate()}><ShieldCheck size={16} /> Submit for verification</Btn>
              {!v.canSubmit && !["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(v.status) && <span className="text-sm text-[#64716B]">Complete every checklist item to enable submission.</span>}
            </div>
          </div>);
      }}</QueryState>
    </>
  );
}
