import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { dateTime } from "../../lib/format";
import { PageHeader, Section, Field, inputClass, Btn, QueryState, Empty } from "./ui";
import { StatusBadge } from "../grid/cells";

export default function EnquiryForm({ intro }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ subject: "", message: "" });
  const mine = useQuery({ queryKey: ["my-enquiries"], queryFn: () => get("/enquiries") });
  const m = useMutation({
    mutationFn: () => send("post", "/enquiries", f),
    onSuccess: (r) => { toast.success(r.message); setF({ subject: "", message: "" }); qc.invalidateQueries({ queryKey: ["my-enquiries"] }); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Contact the SevaSphere team" subtitle={intro} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="New enquiry">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
            <Field label="Subject" htmlFor="subj"><input id="subj" required minLength={3} maxLength={150} className={inputClass} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
            <Field label="Message" htmlFor="msg" hint="At least 10 characters"><textarea id="msg" required minLength={10} maxLength={5000} rows={6} className={inputClass} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
            <Btn type="submit" loading={m.isPending}>Send enquiry</Btn>
          </form>
        </Section>
        <Section title="Your enquiries">
          <QueryState query={mine}>{(rows) => rows.length === 0 ? <Empty title="No enquiries yet" /> : (
            <ul className="divide-y divide-border">{rows.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium text-charcoal">{r.subject}</p><p className="text-xs text-[#98A19B]">{dateTime(r.createdAt)}</p></div><StatusBadge value={r.status} /></li>)}</ul>)}</QueryState>
        </Section>
      </div>
    </>
  );
}
