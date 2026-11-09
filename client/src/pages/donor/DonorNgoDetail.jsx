import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin, BadgeCheck, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { inrFromAmount, dateOnly } from "../../lib/format";
import { PageHeader, QueryState, Section, Notice, Btn, Empty } from "../../components/portal/ui";

const LEVEL = {
  NGO_REPORTED: { label: "Reported by NGO — not independently verified", cls: "bg-slate-100 text-slate-700" },
  ADMIN_REVIEWED: { label: "Reviewed by SevaSphere admin", cls: "bg-sky-50 text-sky-700" },
  INDEPENDENTLY_VERIFIED: { label: "Independently verified", cls: "bg-emerald-50 text-emerald-700" },
};
export const LevelBadge = ({ level }) => <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL[level]?.cls}`}>{LEVEL[level]?.label}</span>;

export default function DonorNgoDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["donor-ngo", id], queryFn: () => get(`/donor/ngos/${id}`) });
  const fav = useMutation({
    mutationFn: (on) => send(on ? "delete" : "post", `/donor/favorites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donor-ngo", id] }),
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <Link to="/donor/ngos" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-forest"><ArrowLeft size={16} /> All NGOs</Link>
      <QueryState query={q}>
        {(n) => (
          <div className="space-y-6">
            <PageHeader title={n.name} subtitle={n.mission || n.description}
              actions={<Btn variant="outline" onClick={() => fav.mutate(n.isFavorite)}><Heart size={16} className={n.isFavorite ? "fill-red-500 text-red-500" : ""} /> {n.isFavorite ? "Favourited" : "Add to favourites"}</Btn>} />
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#4B5A54]">
              <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck size={16} /> Verified NGO</span>
              <span className="inline-flex items-center gap-1"><MapPin size={16} /> {[n.city, n.state].filter(Boolean).join(", ")}</span>
              {n.website && <a href={n.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-forest underline"><Globe size={16} /> Website</a>}
              <span>Minimum donation: {n.minimumDonation ? inrFromAmount(n.minimumDonation) : "none"}</span>
            </div>
            <div className="flex flex-wrap gap-2">{n.causes.map((c) => <span key={c.id} className="rounded-full bg-sage px-3 py-1 text-sm font-medium text-forest">{c.name}</span>)}</div>
            {n.vision && <Section title="Vision"><p className="text-sm text-[#4B5A54]">{n.vision}</p></Section>}
            {n.initiatives.length > 0 && (
              <Section title="Active initiatives"><ul className="grid gap-3 md:grid-cols-2">{n.initiatives.map((i) => (
                <li key={i.id} className="rounded-xl border border-border p-4"><p className="font-semibold text-charcoal">{i.title}</p><p className="mt-1 text-sm text-[#64716B]">{i.description}</p></li>))}</ul></Section>
            )}
            <Section title="Impact reports" description="Each report shows who has checked its claims.">
              <Notice tone="info" className="mb-4">“Reported by NGO” means the organization submitted the figures itself. Only reports marked “Independently verified” were confirmed by SevaSphere reviewers.</Notice>
              {n.impactReports.length === 0 ? <Empty title="No published impact reports yet" /> : (
                <ul className="space-y-4">{n.impactReports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-charcoal">{r.title}</h4><LevelBadge level={r.verificationLevel} /></div>
                    <p className="mt-2 text-sm text-[#4B5A54]">{r.description}</p>
                    <p className="mt-2 text-xs text-[#829087]">{r.peopleImpacted ? `${r.peopleImpacted} people reported impacted · ` : ""}{r.amountUsed ? `${inrFromAmount(r.amountUsed)} reported used · ` : ""}{dateOnly(r.reportedAt)}</p>
                  </li>))}</ul>
              )}
            </Section>
            <Notice tone="info">Donations are made by the SevaSphere agent under your authorization. <Link to="/donor/sevakarma" className="font-semibold underline">Set up your giving policy</Link></Notice>
          </div>
        )}
      </QueryState>
    </>
  );
}
