
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  ShieldCheck,
  HandHeart,
  ArrowRight,
  Building2,
  X,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getPublicNGOs } from "../services/publicService.js";

export default function NGOs() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [cause, setCause] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-ngos"],
    queryFn: getPublicNGOs,
  });

  const allNGOs = data?.ngos || [];

  const cities = useMemo(() => {
    return [
      ...new Set(
        allNGOs
          .map((ngo) => ngo.city)
          .filter(Boolean)
      ),
    ].sort();
  }, [allNGOs]);

  const causes = useMemo(() => {
    const allCauses = allNGOs.flatMap((ngo) =>
      (ngo.causes || [])
        .map((item) => item.cause?.name || item.name)
        .filter(Boolean)
    );

    return [...new Set(allCauses)].sort();
  }, [allNGOs]);

  const filteredNGOs = useMemo(() => {
    return allNGOs.filter((ngo) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        ngo.organizationName?.toLowerCase().includes(searchText) ||
        ngo.description?.toLowerCase().includes(searchText);

      const matchesCity =
        !city ||
        ngo.city?.toLowerCase() === city.toLowerCase();

      const ngoCauses = (ngo.causes || []).map(
        (item) => item.cause?.name || item.name
      );

      const matchesCause =
        !cause || ngoCauses.includes(cause);

      return (
        ngo.status === "VERIFIED" &&
        ngo.user?.isActive !== false &&
        matchesSearch &&
        matchesCity &&
        matchesCause
      );
    });
  }, [allNGOs, search, city, cause]);

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setCause("");
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Verified organizations
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Find organizations creating meaningful change.
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-white/75">
            Discover verified NGOs, explore their work, and find
            organizations that align with the causes you care about.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest">
            NGO directory
          </p>

          <h2 className="mt-2 text-3xl font-bold text-charcoal">
            Explore organizations
          </h2>

          <p className="mt-2 text-charcoal/60">
            Search and filter verified organizations.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E9E4] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-forest"
              />
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            >
              <option value="">All cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            >
              <option value="">All causes</option>
              {causes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {(search || city || cause) && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
            >
              <X size={15} />
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-charcoal/65">
            Showing{" "}
            <span className="font-bold text-charcoal">
              {isLoading ? "..." : filteredNGOs.length}
            </span>{" "}
            verified organizations
          </p>
        </div>

        {isLoading && (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl bg-sage"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load organizations."}
          </div>
        )}

        {!isLoading && !isError && filteredNGOs.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-forest" />

            <h3 className="mt-4 text-xl font-semibold text-charcoal">
              No organizations found
            </h3>

            <p className="mt-2 text-sm text-charcoal/60">
              Try changing your search or filters.
            </p>

            <button
              onClick={clearFilters}
              className="mt-5 font-semibold text-forest hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredNGOs.length > 0 && (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNGOs.map((ngo) => (
              <article
                key={ngo.id}
                className="flex flex-col rounded-2xl border border-[#E6E9E4] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
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

                <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-charcoal/65">
                  {ngo.description ||
                    "An organization working to create meaningful social impact."}
                </p>

                {(ngo.city || ngo.state) && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-charcoal/60">
                    <MapPin size={16} />
                    {[ngo.city, ngo.state].filter(Boolean).join(", ")}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(ngo.causes || []).slice(0, 3).map((item) => {
                    const name = item.cause?.name || item.name;

                    return name ? (
                      <span
                        key={item.id || name}
                        className="rounded-full bg-[#F7F5EF] px-3 py-1 text-xs font-medium text-charcoal/75"
                      >
                        {name}
                      </span>
                    ) : null;
                  })}
                </div>

                <div className="mt-auto border-t border-gray-100 pt-5">
                  <Link
                    to={`/ngos/${ngo.id}`}
                    className="inline-flex items-center gap-2 font-semibold text-forest hover:underline"
                  >
                    View organization
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
