
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  Heart,
  HandHeart,
  FileText,
  Users,
  ExternalLink,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getPublicNGOById } from "../services/publicService.js";

export default function NGODetails() {
  const { id } = useParams();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-ngo", id],
    queryFn: () => getPublicNGOById(id),
    enabled: Boolean(id),
  });

  const ngo = data?.ngo || data;

  const reports = ngo?.impactReports || [];

  const location = [
    ngo?.address,
    ngo?.city,
    ngo?.state,
    ngo?.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/ngos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
        >
          <ArrowLeft size={17} />
          Back to organizations
        </Link>

        {isLoading && (
          <div className="mt-10 animate-pulse space-y-5">
            <div className="h-64 rounded-3xl bg-sage" />
            <div className="h-40 rounded-2xl bg-sage" />
            <div className="h-48 rounded-2xl bg-sage" />
          </div>
        )}

        {isError && (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load organization details."}
          </div>
        )}

        {!isLoading && !isError && ngo && ngo.status === "VERIFIED" && (
          <>
            <section className="mt-8 rounded-3xl bg-forest px-7 py-12 text-white md:px-12">
              <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
                <div className="max-w-3xl">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-gold">
                    <HandHeart size={34} />
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                      <ShieldCheck size={15} className="text-gold" />
                      Verified Organization
                    </span>
                  </div>

                  {ngo.logoUrl && <img src={ngo.logoUrl} alt="" className="mb-5 h-44 w-full max-w-md rounded-2xl object-cover" />}

                  <h1 className="mt-5 text-3xl font-bold md:text-5xl">
                    {ngo.organizationName}
                  </h1>

                  <p className="mt-5 leading-8 text-white/75">
                    {ngo.description ||
                      "An organization working to create meaningful social impact."}
                  </p>

                  {location && (
                    <div className="mt-6 flex items-center gap-2 text-sm text-white/75">
                      <MapPin size={17} className="text-gold" />
                      {location}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 md:min-w-44">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-forest transition hover:bg-[#e7c47e]"
                  >
                    <Heart size={18} />
                    Donate Now
                  </Link>

                  <span className="text-center text-xs text-white/60">
                    Support this organization's work
                  </span>
                </div>
              </div>
            </section>

            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              <section className="space-y-8 lg:col-span-2">
                <div className="rounded-2xl border border-[#E6E9E4] bg-white p-7">
                  <h2 className="text-2xl font-bold text-charcoal">
                    About the organization
                  </h2>

                  <p className="mt-4 whitespace-pre-line leading-8 text-charcoal/70">
                    {ngo.description ||
                      "No additional organization description is available."}
                  </p>

                  {ngo.registrationNumber && (
                    <div className="mt-6 border-t border-gray-100 pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                        Registration number
                      </p>
                      <p className="mt-2 font-semibold text-charcoal">
                        {ngo.registrationNumber}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#E6E9E4] bg-white p-7">
                  <h2 className="text-2xl font-bold text-charcoal">
                    Causes we support
                  </h2>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {(ngo.causes || []).length > 0 ? (
                      ngo.causes.map((item) => {
                        const cause = item.cause || item;

                        if (!cause.name) return null;

                        return (
                          <Link
                            key={item.id || cause.id || cause.name}
                            to={`/causes/${cause.slug}`}
                            className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-forest transition hover:bg-[#d5e5d9]"
                          >
                            {cause.name}
                          </Link>
                        );
                      })
                    ) : (
                      <p className="text-sm text-charcoal/60">
                        No causes have been added yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E6E9E4] bg-white p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-forest">
                        Transparency
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-charcoal">
                        Impact reports
                      </h2>
                    </div>

                    <FileText size={28} className="text-forest" />
                  </div>

                  {reports.length === 0 ? (
                    <div className="mt-6 rounded-xl bg-ivory p-8 text-center">
                      <HandHeart className="mx-auto h-9 w-9 text-forest" />
                      <h3 className="mt-3 font-semibold text-charcoal">
                        No impact reports yet
                      </h3>
                      <p className="mt-2 text-sm text-charcoal/60">
                        Impact reports will appear here when the organization
                        submits them.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {reports.map((report) => (
                        <article
                          key={report.id}
                          className="rounded-xl border border-gray-100 p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-lg font-bold text-charcoal">
                              {report.title}
                            </h3>

                            <span className="text-xs text-charcoal/50">
                              {report.reportedAt
                                ? new Date(report.reportedAt).toLocaleDateString()
                                : ""}
                            </span>
                          </div>

                          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-charcoal/70">
                            {report.description}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-5 text-sm text-charcoal/60">
                            {report.peopleImpacted != null && (
                              <span className="flex items-center gap-2">
                                <Users size={16} />
                                {report.peopleImpacted} people impacted
                              </span>
                            )}

                            {report.amountUsedPaise != null && (
                              <span className="font-semibold text-forest">
                                ₹{(
                                  Number(report.amountUsedPaise) / 100
                                ).toLocaleString("en-IN")} used
                              </span>
                            )}
                          </div>

                          {report.evidence?.length > 0 && (
                            <div className="mt-5 border-t border-gray-100 pt-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                                Supporting evidence
                              </p>

                              <div className="flex flex-wrap gap-3">
                                {report.evidence.map((item) => (
                                  <a
                                    key={item.id}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-medium text-forest hover:bg-[#d5e5d9]"
                                  >
                                    {item.title || item.type || "View evidence"}
                                    <ExternalLink size={14} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-2xl border border-[#E6E9E4] bg-white p-7">
                  <h2 className="text-xl font-bold text-charcoal">
                    Organization details
                  </h2>

                  <div className="mt-6 space-y-5">
                    {ngo.phone && (
                      <div className="flex items-start gap-3">
                        <Phone size={18} className="mt-1 text-forest" />
                        <div>
                          <p className="text-xs text-charcoal/50">Phone</p>
                          <a
                            href={`tel:${ngo.phone}`}
                            className="mt-1 text-sm font-medium text-charcoal hover:text-forest"
                          >
                            {ngo.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {ngo.user?.email && (
                      <div className="flex items-start gap-3">
                        <Mail size={18} className="mt-1 text-forest" />
                        <div>
                          <p className="text-xs text-charcoal/50">Email</p>
                          <a
                            href={`mailto:${ngo.user.email}`}
                            className="mt-1 break-all text-sm font-medium text-charcoal hover:text-forest"
                          >
                            {ngo.user.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {ngo.website && (
                      <div className="flex items-start gap-3">
                        <Globe size={18} className="mt-1 text-forest" />
                        <div>
                          <p className="text-xs text-charcoal/50">Website</p>
                          <a
                            href={ngo.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-forest hover:underline"
                          >
                            Visit website
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    )}

                    {location && (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="mt-1 text-forest" />
                        <div>
                          <p className="text-xs text-charcoal/50">Address</p>
                          <p className="mt-1 text-sm leading-6 text-charcoal">
                            {location}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-sage p-7">
                  <ShieldCheck size={30} className="text-forest" />

                  <h3 className="mt-4 text-lg font-bold text-charcoal">
                    Verified on SevaSphere
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-charcoal/65">
                    This organization has passed the platform's verification
                    process.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}

        {!isLoading && !isError && ngo && ngo.status !== "VERIFIED" && (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-charcoal/40" />
            <h2 className="mt-4 text-2xl font-bold text-charcoal">
              Organization unavailable
            </h2>
            <p className="mt-2 text-sm text-charcoal/60">
              This organization's public profile is not currently available.
            </p>
          </div>
        )}

        {!isLoading && !isError && !ngo && (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center">
            <h2 className="text-2xl font-bold text-charcoal">
              Organization not found
            </h2>
            <Link
              to="/ngos"
              className="mt-4 inline-block font-semibold text-forest hover:underline"
            >
              Browse organizations
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
