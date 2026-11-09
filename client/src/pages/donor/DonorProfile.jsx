import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { PageHeader, Section, Field, inputClass, Btn, PageLoader, Notice } from "../../components/portal/ui";
import { useAuth } from "../../context/AuthContext";

export default function DonorProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["donor-profile"], queryFn: () => get("/donor/profile") });
  const [f, setF] = useState(null);
  useEffect(() => { if (q.data && !f) setF({ name: q.data.name, phone: q.data.phone ?? "", address: q.data.address ?? "", city: q.data.city ?? "", state: q.data.state ?? "", anonymous: q.data.anonymous }); }, [q.data, f]);
  const save = useMutation({ mutationFn: () => send("put", "/donor/profile", f), onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["donor-profile"] }); }, onError: (e) => toast.error(e.message) });
  const pw = useState({ currentPassword: "", newPassword: "" });
  const [p, setP] = pw;
  const changePw = useMutation({ mutationFn: () => send("post", "/auth/password", p), onSuccess: (r) => { toast.success(r.message); setP({ currentPassword: "", newPassword: "" }); }, onError: (e) => toast.error(e.message) });
  if (q.isLoading || !f) return <PageLoader />;
  if (q.isError) return <Notice tone="error">{q.error.message}</Notice>;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <>
      <PageHeader title="Profile" subtitle="Your details and privacy settings. Giving preferences live under SevaSphere Agent." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Personal details">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <Field label="Full name" htmlFor="n"><input id="n" required minLength={2} className={inputClass} value={f.name} onChange={set("name")} /></Field>
            <Field label="Email" htmlFor="e" hint="Email cannot be changed here"><input id="e" disabled className={inputClass} value={user?.email} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" htmlFor="p"><input id="p" className={inputClass} value={f.phone} onChange={set("phone")} /></Field><Field label="City" htmlFor="c"><input id="c" className={inputClass} value={f.city} onChange={set("city")} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="State" htmlFor="s"><input id="s" className={inputClass} value={f.state} onChange={set("state")} /></Field><Field label="Address" htmlFor="a"><input id="a" className={inputClass} value={f.address} onChange={set("address")} /></Field></div>
            <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={f.anonymous} onChange={(e) => setF((s) => ({ ...s, anonymous: e.target.checked }))} /><span><b>Donate anonymously.</b> NGOs only see “Anonymous”. (Applies the next time you authorize.)</span></label>
            <Btn type="submit" loading={save.isPending}>Save profile</Btn>
          </form>
        </Section>
        <Section title="Change password">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); changePw.mutate(); }}>
            <Field label="Current password" htmlFor="cp"><input id="cp" type="password" autoComplete="current-password" required className={inputClass} value={p.currentPassword} onChange={(e) => setP({ ...p, currentPassword: e.target.value })} /></Field>
            <Field label="New password" htmlFor="np" hint="At least 8 characters"><input id="np" type="password" autoComplete="new-password" required minLength={8} className={inputClass} value={p.newPassword} onChange={(e) => setP({ ...p, newPassword: e.target.value })} /></Field>
            <Btn type="submit" loading={changePw.isPending}>Update password</Btn>
          </form>
        </Section>
      </div>
    </>
  );
}
