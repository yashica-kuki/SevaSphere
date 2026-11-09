import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { send } from "../../lib/q";
import { PageHeader, Section, Field, inputClass, Btn } from "../../components/portal/ui";
import { useAuth } from "../../context/AuthContext";

export default function NGOSettings() {
  const { user } = useAuth();
  const [p, setP] = useState({ currentPassword: "", newPassword: "" });
  const m = useMutation({ mutationFn: () => send("post", "/auth/password", p), onSuccess: (r) => { toast.success(r.message); setP({ currentPassword: "", newPassword: "" }); }, onError: (e) => toast.error(e.message) });
  return (
    <>
      <PageHeader title="Settings" subtitle="Account security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Account"><dl className="space-y-3 text-sm"><div><dt className="text-xs uppercase text-[#829087]">Contact person</dt><dd className="font-semibold">{user?.name}</dd></div><div><dt className="text-xs uppercase text-[#829087]">Login email</dt><dd className="font-semibold">{user?.email}</dd></div></dl></Section>
        <Section title="Change password">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
            <Field label="Current password" htmlFor="cp"><input id="cp" type="password" required autoComplete="current-password" className={inputClass} value={p.currentPassword} onChange={(e) => setP({ ...p, currentPassword: e.target.value })} /></Field>
            <Field label="New password" htmlFor="np" hint="At least 8 characters"><input id="np" type="password" required minLength={8} autoComplete="new-password" className={inputClass} value={p.newPassword} onChange={(e) => setP({ ...p, newPassword: e.target.value })} /></Field>
            <Btn type="submit" loading={m.isPending}>Update password</Btn>
          </form>
        </Section>
      </div>
    </>
  );
}
