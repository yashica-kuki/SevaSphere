import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Heart, MapPin, BadgeCheck, Search } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { inrFromAmount } from "../../lib/format";
import { PageHeader, QueryState, Empty, inputClass, PageLoader } from "../../components/portal/ui";

export function ReportBadges({ reports }) {
  if (!reports.published) return <span className="text-xs text-[#98A19B]">No published impact reports yet</span>;
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{reports.published} NGO-reported</span>
      {reports.adminReviewed > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{reports.adminReviewed} admin-reviewed</span>}
      {reports.independentlyVerified > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{reports.independentlyVerified} independently verified</span>}
    </div>
  );
}

export default function DonorNgos() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ search: "", cause: "", location: "", impact: "", favorites: "" });
  const [page, setPage] = useState(1);
  const causes = useQuery({ queryKey: ["donor-causes"], queryFn: () => get("/donor/causes") });
  const q = useQuery({
    queryKey: ["donor-ngos", filters, page],
    queryFn: () => api_list({ ...filters, page }),
    placeholderData: (prev) => prev,
  });
  const fav = useMutation({
    mutationFn: ({ id, on }) => send(on ? "delete" : "post", `/donor/favorites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donor-ngos"] }),
    onError: (e) => toast.error(e.message),
  });
  const set = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };

  return (
    <>
      <PageHeader title="Discover NGOs" subtitle="Only verified, active organizations are shown. Impact claims are labelled by who has checked them." />
      <div className="surface-card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829087]" />
          <input aria-label="Search NGOs" className={`${inputClass} pl-9`} placeholder="Search by name or mission" value={filters.search} onChange={set("search")} /></div>
        <select aria-label="Filter by cause" className={inputClass} value={filters.cause} onChange={set("cause")}>
          <option value="">All causes</option>{causes.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <input aria-label="Filter by location" className={inputClass} placeholder="City or state" value={filters.location} onChange={set("location")} />
        <select aria-label="Filter by impact verification" className={inputClass} value={filters.impact} onChange={set("impact")}>
          <option value="">Any impact verification</option><option value="ANY_REPORTS">Has published reports</option><option value="ADMIN_REVIEWED">Admin-reviewed reports</option><option value="INDEPENDENTLY_VERIFIED">Independently verified</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.favorites === "true"} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, favorites: e.target.checked ? "true" : "" })); }} /> Favourites only</label>
      </div>

      <QueryState query={q} skeleton={<PageLoader label="Finding NGOs…" />}>
        {({ data, pagination }) => data.length === 0 ? (
          <Empty title="No NGOs match your filters" message="Try removing a filter or searching a different location." />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.map((n) => (
                <article key={n.id} className="surface-card flex flex-col p-5">
                  {n.logoUrl && (
                    <img
                      src={n.logoUrl}
                      alt={`${n.name} — illustrative photo`}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      className="-mx-6 -mt-6 mb-5 h-44 w-[calc(100%+3rem)] max-w-none rounded-t-2xl object-cover"
                    />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-lg font-bold text-forest">{n.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#64716B]"><MapPin size={13} /> {[n.city, n.state].filter(Boolean).join(", ") || "India"}</p></div>
                    <button onClick={() => fav.mutate({ id: n.id, on: n.isFavorite })} aria-pressed={n.isFavorite} aria-label={n.isFavorite ? "Remove from favourites" : "Add to favourites"} className="rounded-full p-2 hover:bg-sage">
                      <Heart size={18} className={n.isFavorite ? "fill-red-500 text-red-500" : "text-[#829087]"} />
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-[#4B5A54]">{n.mission || n.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{n.causes.map((c) => <span key={c.id} className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-medium text-forest">{c.name}</span>)}</div>
                  <div className="mt-3"><ReportBadges reports={n.reports} /></div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-xs text-[#64716B]">
                    <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck size={14} /> Verified</span>
                    <span>{n.minimumDonation ? `Min ${inrFromAmount(n.minimumDonation)}` : "No minimum"}</span>
                  </div>
                  <Link to={`/donor/ngos/${n.id}`} className="mt-4 rounded-xl bg-forest px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#194c40]">View details</Link>
                </article>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-[#64716B]">{pagination.total} NGO(s)</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-border bg-white px-4 py-2 disabled:opacity-40">Previous</button>
                <span className="px-2 py-2">Page {pagination.page} / {Math.max(1, pagination.totalPages)}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-border bg-white px-4 py-2 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}

import api from "../../services/api";
const api_list = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  return api.get("/donor/ngos", { params: clean }).then((r) => r.data);
};
