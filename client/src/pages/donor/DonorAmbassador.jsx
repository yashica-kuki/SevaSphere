import { useQuery } from "@tanstack/react-query";
import { Copy, Users, HandCoins } from "lucide-react";
import toast from "react-hot-toast";
import { get } from "../../lib/q";
import { dateOnly } from "../../lib/format";
import { PageHeader, Section, StatCard, QueryState, Btn, Notice } from "../../components/portal/ui";

export default function DonorAmbassador() {
  const q = useQuery({ queryKey: ["donor-ambassador"], queryFn: () => get("/donor/ambassador") });
  const copy = (t, what) => navigator.clipboard?.writeText(t).then(() => toast.success(`${what} copied`), () => toast.error("Copy failed"));
  return (
    <>
      <PageHeader title="Ambassador" subtitle="Invite friends to give with SevaSphere. Statistics count real sign-ups that used your link." />
      <QueryState query={q}>{(d) => (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Sign-ups via your link" value={d.stats.signups} icon={Users} />
            <StatCard label="Referrals who donated" value={d.stats.activeDonors} icon={HandCoins} tone="gold" />
            <StatCard label="Latest sign-up" value={d.stats.lastSignupAt ? dateOnly(d.stats.lastSignupAt) : "—"} />
          </div>
          <Section title="Your referral code">
            <div className="flex flex-wrap items-center gap-3"><code className="rounded-xl bg-sage px-4 py-2.5 text-lg font-bold tracking-wider text-forest">{d.referralCode}</code><Btn variant="outline" onClick={() => copy(d.referralCode, "Code")}><Copy size={16} /> Copy code</Btn></div>
          </Section>
          <Section title="Your referral link">
            <div className="flex flex-wrap items-center gap-3"><input readOnly aria-label="Referral link" className="min-w-[260px] flex-1 rounded-xl border border-border bg-ivory px-3.5 py-2.5 text-sm" value={d.referralLink} onFocus={(e) => e.target.select()} /><Btn onClick={() => copy(d.referralLink, "Link")}><Copy size={16} /> Copy link</Btn></div>
          </Section>
          <Notice tone="info">There are no rewards in this prototype; referrals are tracked so you can see the community you have helped grow.</Notice>
        </div>)}</QueryState>
    </>
  );
}
