import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  BookOpen,
  Stethoscope,
  Leaf,
  Utensils,
  PawPrint,
  HandHeart,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getPublicCauses } from "../services/publicService.js";

const causeIcons = {
  education: BookOpen,
  healthcare: Stethoscope,
  environment: Leaf,
  "hunger-relief": Utensils,
  "animal-welfare": PawPrint,
};

export default function Causes() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-causes"],
    queryFn: getPublicCauses,
  });

  const causes = Array.isArray(data)
    ? data
    : data?.causes || [];

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Make your contribution count
          </p>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Every cause deserves a chance to create change.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75">
            Explore causes that need support. Find the initiatives that
            matter to you and help verified NGOs make a real difference.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest">
            Explore causes
          </p>
          <h2 className="mt-2 text-3xl font-bold text-charcoal">
            Where would you like to make an impact?
          </h2>
          <p className="mt-3 max-w-2xl text-charcoal/65">
            Choose a cause to learn more and discover verified organizations
            working in that area.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-2xl bg-sage"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load causes. Please try again."}
          </div>
        )}

        {!isLoading && !isError && causes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <HandHeart className="mx-auto h-10 w-10 text-forest" />
            <h3 className="mt-4 text-xl font-semibold text-charcoal">
              No causes available yet
            </h3>
            <p className="mt-2 text-sm text-charcoal/60">
              Causes will appear here once they are added to the platform.
            </p>
          </div>
        )}

        {!isLoading && !isError && causes.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {causes.map((cause) => {
              const slug =
                cause.slug ||
                cause.name?.toLowerCase().replace(/\s+/g, "-");

              const Icon = causeIcons[slug] || Heart;

              return (
                <article
                  key={cause.id || slug}
                  className="group rounded-2xl border border-[#E6E9E4] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sage text-forest">
                    <Icon size={27} />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-charcoal">
                    {cause.name}
                  </h3>

                  <p className="mt-3 min-h-16 text-sm leading-6 text-charcoal/65">
                    {cause.description ||
                      `Support initiatives working towards ${cause.name?.toLowerCase()}.`}
                  </p>

                  <Link
                    to={`/causes/${slug}`}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-forest hover:text-[#236653]"
                  >
                    Explore cause
                    <ArrowRight
                      size={17}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}