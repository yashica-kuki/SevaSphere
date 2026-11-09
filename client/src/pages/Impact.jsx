
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Heart,
  Users,
  Building2,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  HandHeart,
  TrendingUp,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";
import { getImpactOverview } from "../services/publicService.js";

function formatNumber(value) {
  if (value == null) return "—";

  return Number(value).toLocaleString("en-IN");
}

function formatRupees(value) {
  if (value == null) return "—";

  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function Impact() {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-impact"],
    queryFn: getImpactOverview,
  });

  const stats = data?.stats || data || {};

  const cards = [
    {
      label: "Total donations",
      value:
        stats.totalDonations != null
          ? formatRupees(stats.totalDonations)
          : stats.totalDonationsPaise != null
            ? formatRupees(Number(stats.totalDonationsPaise) / 100)
            : "—",
      icon: IndianRupee,
      description: "Donations recorded on the platform",
    },
    {
      label: "Verified NGOs",
      value: formatNumber(stats.verifiedNGOs ?? stats.totalNGOs),
      icon: Building2,
      description: "Verified organizations on SevaSphere",
    },
    {
      label: "People impacted",
      value: formatNumber(stats.peopleImpacted),
      icon: Users,
      description: "People reported as impacted by NGOs",
    },
    {
      label: "Successful donations",
      value: formatNumber(
        stats.successfulDonations ?? stats.completedDonations
      ),
      icon: Heart,
      description: "Successfully completed donations",
    },
  ];

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Transparency creates trust
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Every contribution can create a measurable impact.
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-white/75">
            Track the impact of donations, discover verified organizations,
            and explore the work being done through SevaSphere.
          </p>

          <Link
            to="/stories"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-forest hover:bg-[#e7c47e]"
          >
            Explore impact stories
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-forest">
            Platform overview
          </p>
          <h2 className="mt-2 text-3xl font-bold text-charcoal">
            Our impact in numbers
          </h2>
          <p className="mt-3 text-charcoal/60">
            Statistics calculated from platform records and NGO impact reports.
          </p>
        </div>

        {isLoading && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-2xl bg-sage"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error?.message || "Unable to load impact statistics."}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-2xl border border-[#E6E9E4] bg-white p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
                    <Icon size={24} />
                  </div>

                  <p className="mt-5 text-sm font-medium text-charcoal/60">
                    {card.label}
                  </p>

                  <h3 className="mt-2 text-3xl font-bold text-charcoal">
                    {card.value}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-charcoal/50">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-sage p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-forest">
              <ShieldCheck size={25} />
            </div>

            <h3 className="mt-5 text-2xl font-bold text-charcoal">
              Transparent donations
            </h3>

            <p className="mt-3 leading-7 text-charcoal/65">
              Donations are recorded and allocations are tracked so donors
              can understand where their contributions are directed.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
              <TrendingUp size={25} />
            </div>

            <h3 className="mt-5 text-2xl font-bold text-charcoal">
              Measurable outcomes
            </h3>

            <p className="mt-3 leading-7 text-charcoal/65">
              NGOs can submit impact reports, describe outcomes, and attach
              supporting evidence to demonstrate how allocated funds are used.
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-forest px-8 py-12 text-center text-white md:px-16">
          <HandHeart className="mx-auto text-gold" size={38} />

          <h2 className="mt-5 text-3xl font-bold">
            Be part of the change
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">
            Discover causes, support verified NGOs, and make your
            contribution count.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/causes"
              className="rounded-xl bg-gold px-6 py-3 font-semibold text-forest hover:bg-[#e7c47e]"
            >
              Explore causes
            </Link>

            <Link
              to="/ngos"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Find NGOs
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
