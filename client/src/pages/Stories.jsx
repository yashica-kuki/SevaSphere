
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Users,
  ExternalLink,
  HandHeart,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getImpactStories } from "../services/publicService.js";

export default function Stories() {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-impact-stories"],
    queryFn: getImpactStories,
  });

  const stories = Array.isArray(data)
    ? data
    : data?.stories || data?.reports || [];

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Real work. Real outcomes.
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-5xl">
            Stories of change from the organizations making a difference.
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-white/75">
            Explore impact reports shared by NGOs and see how their
            initiatives are helping communities.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-forest">
            Impact stories
          </p>

          <h2 className="mt-2 text-3xl font-bold text-charcoal">
            Progress worth sharing
          </h2>

          <p className="mt-3 text-charcoal/60">
            Reports and outcomes submitted by organizations on SevaSphere.
          </p>
        </div>

        {isLoading && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl bg-sage"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load impact stories."}
          </div>
        )}

        {!isLoading && !isError && stories.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-forest" />

            <h3 className="mt-4 text-xl font-semibold text-charcoal">
              No impact stories available yet
            </h3>

            <p className="mt-2 text-sm text-charcoal/60">
              Stories will appear here when verified NGOs submit impact reports.
            </p>
          </div>
        )}

        {!isLoading && !isError && stories.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {stories.map((story) => {
              const ngo = story.ngo || story.NGOProfile;
              const evidence = story.evidence || [];

              return (
                <article
                  key={story.id}
                  className="flex flex-col rounded-2xl border border-[#E6E9E4] bg-white p-7 transition hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
                      <HandHeart size={25} />
                    </div>

                    {story.reportedAt && (
                      <span className="flex items-center gap-2 text-xs text-charcoal/50">
                        <CalendarDays size={15} />
                        {new Date(story.reportedAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-charcoal">
                    {story.title}
                  </h3>

                  {ngo?.organizationName && (
                    <p className="mt-2 text-sm font-semibold text-forest">
                      {ngo.organizationName}
                    </p>
                  )}

                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-charcoal/65">
                    {story.description}
                  </p>

                  {story.peopleImpacted != null && (
                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-charcoal">
                      <Users size={17} className="text-forest" />
                      {Number(story.peopleImpacted).toLocaleString("en-IN")}
                      {" "}people impacted
                    </div>
                  )}

                  {evidence.length > 0 && (
                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                        Supporting evidence
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {evidence.map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-xs font-semibold text-forest hover:bg-[#d5e5d9]"
                          >
                            {item.title || item.type || "View evidence"}
                            <ExternalLink size={13} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto border-t border-gray-100 pt-5">
                    {ngo?.id ? (
                      <Link
                        to={`/ngos/${ngo.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
                      >
                        View organization
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <span className="text-xs text-charcoal/40">
                        Published impact report
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
