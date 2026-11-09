
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Heart,
  HandHeart,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getPublicCauseBySlug } from "../services/publicService.js";

export default function CauseDetails() {
  const { slug } = useParams();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-cause", slug],
    queryFn: () => getPublicCauseBySlug(slug),
    enabled: Boolean(slug),
  });

  const cause = data?.cause || data;

  // NGOCause records contain the related NGO under the "ngo" field.
  const ngos = (cause?.ngos || [])
    .map((item) => item.ngo || item)
    .filter(
      (ngo) =>
        ngo &&
        ngo.status === "VERIFIED" &&
        ngo.user?.isActive !== false
    );

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/causes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
        >
          <ArrowLeft size={17} />
          All causes
        </Link>

        {isLoading && (
          <div className="mt-10 animate-pulse space-y-4">
            <div className="h-10 w-1/2 rounded bg-sage" />
            <div className="h-24 rounded bg-sage" />
            <div className="h-40 rounded bg-sage" />
          </div>
        )}

        {isError && (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load this cause."}
          </div>
        )}

        {!isLoading && !isError && cause && (
          <>
            <section className="mt-10 rounded-3xl bg-forest px-8 py-12 text-white md:px-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-gold">
                <Heart size={30} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-gold">
                Explore this cause
              </p>

              <h1 className="mt-3 text-4xl font-bold md:text-5xl">
                {cause.name}
              </h1>

              <p className="mt-5 max-w-3xl leading-8 text-white/75">
                {cause.description ||
                  `Discover organizations working towards ${cause.name?.toLowerCase()} and find ways to support their initiatives.`}
              </p>

              <div className="mt-7 flex items-center gap-2 text-sm text-white/80">
                <ShieldCheck size={18} className="text-gold" />
                Working with verified organizations
              </div>
            </section>

            <section className="mt-14">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-forest">
                    Make a difference
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-charcoal">
                    Organizations supporting this cause
                  </h2>
                  <p className="mt-2 text-charcoal/60">
                    Discover verified NGOs associated with {cause.name}.
                  </p>
                </div>

                <span className="text-sm font-semibold text-forest">
                  {ngos.length} verified {ngos.length === 1 ? "NGO" : "NGOs"}
                </span>
              </div>

              {ngos.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                  <HandHeart className="mx-auto h-10 w-10 text-forest" />
                  <h3 className="mt-4 text-xl font-semibold text-charcoal">
                    No verified NGOs yet
                  </h3>
                  <p className="mt-2 text-sm text-charcoal/60">
                    Organizations associated with this cause will appear here
                    once verified.
                  </p>
                </div>
              ) : (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {ngos.map((ngo) => (
                    <article
                      key={ngo.id}
                      className="rounded-2xl border border-[#E6E9E4] bg-white p-7 transition hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
                          <HandHeart size={25} />
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-forest">
                          <ShieldCheck size={14} />
                          Verified
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-charcoal">
                        {ngo.organizationName}
                      </h3>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-charcoal/65">
                        {ngo.description ||
                          "An organization working to create meaningful social impact."}
                      </p>

                      {(ngo.city || ngo.state || ngo.country) && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-charcoal/60">
                          <MapPin size={16} />
                          {[ngo.city, ngo.state, ngo.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}

                      <Link
                        to={`/ngos/${ngo.id}`}
                        className="mt-6 inline-flex items-center gap-2 font-semibold text-forest hover:underline"
                      >
                        View organization
                        <ArrowRight size={17} />
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {!isLoading && !isError && !cause && (
          <div className="mt-10 rounded-xl bg-white p-10 text-center">
            <h2 className="text-2xl font-bold text-charcoal">
              Cause not found
            </h2>
            <Link
              to="/causes"
              className="mt-4 inline-block font-semibold text-forest hover:underline"
            >
              Browse all causes
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
