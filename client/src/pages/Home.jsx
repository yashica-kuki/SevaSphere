import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  HandHeart,
  GraduationCap,
  Stethoscope,
  Leaf,
  Utensils,
  PawPrint,
  LoaderCircle,
  MapPin,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";

import {
  getPublicCauses,
  getPublicNGOs,
  getImpactOverview,
} from "../services/publicService.js";

const causeIcons = {
  education: GraduationCap,
  healthcare: Stethoscope,
  environment: Leaf,
  "hunger-relief": Utensils,
  "animal-welfare": PawPrint,
};

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#B18A45]">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-bold text-[#123B32] sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 leading-7 text-gray-600">
        {description}
      </p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
      <div className="mb-4 inline-flex rounded-xl bg-[#E5EEE8] p-3">
        <Icon className="text-[#123B32]" size={23} />
      </div>

      <p className="text-3xl font-bold text-[#123B32]">
        {value ?? 0}
      </p>

      <p className="mt-2 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
      <LoaderCircle className="animate-spin" size={20} />
      Loading information...
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <p className="rounded-xl bg-red-50 p-5 text-sm text-red-600">
      {message || "Unable to load information. Please try again."}
    </p>
  );
}

export default function Home() {
  const causesQuery = useQuery({
    queryKey: ["public-causes"],
    queryFn: getPublicCauses,
  });

  const ngosQuery = useQuery({
    queryKey: ["public-ngos-featured"],
    queryFn: getPublicNGOs,
  });

  const impactQuery = useQuery({
    queryKey: ["public-impact"],
    queryFn: getImpactOverview,
  });

  const causes = causesQuery.data || [];
  const ngos = ngosQuery.data?.ngos || [];
  const stats = impactQuery.data?.stats || {};

  const formatCurrency = (paise) => {
    const rupees = Number(paise || 0) / 100;

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF]">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="overflow-hidden bg-[#123B32] text-white">
          <div className="mx-auto grid min-h-[610px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-[#E5EEE8]">
                <Sparkles size={16} />
                Intelligent giving. Meaningful impact.
              </div>

              <h1 className="max-w-2xl text-5xl font-extrabold leading-tight sm:text-6xl">
                Make every donation
                <span className="block text-[#D6AD60]">
                  count.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
                Discover verified NGOs, support the causes you believe in,
                and see how your generosity creates real change.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D6AD60] px-7 py-3.5 font-semibold text-[#123B32] transition hover:bg-[#e6c47e]"
                >
                  Start giving
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/ngos"
                  className="rounded-xl border border-white/40 px-7 py-3.5 font-semibold transition hover:bg-white/10"
                >
                  Explore NGOs
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#D6AD60]" />
                  Verified organizations
                </span>

                <span className="flex items-center gap-2">
                  <Heart size={18} className="text-[#D6AD60]" />
                  Transparent donations
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    The SevaSphere approach
                  </span>
                  <Sparkles className="text-[#D6AD60]" />
                </div>

                <h2 className="mt-8 text-3xl font-bold">
                  One act of kindness.
                  <br />
                  Countless possibilities.
                </h2>

                <p className="mt-4 leading-7 text-white/60">
                  Technology helps connect generosity with organizations
                  working on the ground.
                </p>

                <div className="mt-10 space-y-4">
                  {[
                    ["01", "Choose a cause", "Find a mission you care about."],
                    ["02", "Discover NGOs", "Explore verified organizations."],
                    ["03", "Create impact", "Follow transparent impact reports."],
                  ].map(([number, title, description]) => (
                    <div
                      key={number}
                      className="flex items-center gap-4 rounded-xl bg-white/10 p-4"
                    >
                      <span className="text-xl font-bold text-[#D6AD60]">
                        {number}
                      </span>

                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-white/60">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT STATISTICS */}
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <SectionTitle
            eyebrow="Our growing community"
            title="Every contribution matters."
            description="Explore the impact recorded by the SevaSphere platform."
          />

          {impactQuery.isLoading ? (
            <LoadingMessage />
          ) : impactQuery.isError ? (
            <ErrorMessage message={impactQuery.error.message} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Verified NGOs"
                  value={stats.verifiedNGOs}
                  icon={ShieldCheck}
                />

                <StatCard
                  label="Active causes"
                  value={stats.activeCauses}
                  icon={Heart}
                />

                <StatCard
                  label="Completed donations"
                  value={stats.donationCount}
                  icon={HandHeart}
                />

                <StatCard
                  label="Recorded donations"
                  value={formatCurrency(stats.totalDonatedPaise)}
                  icon={Users}
                />
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Statistics are based on records currently available in the database.
              </p>
            </>
          )}
        </section>

        {/* CAUSES */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <SectionTitle
              eyebrow="Find your purpose"
              title="Explore causes that matter."
              description="Choose an area where you want to make a difference."
            />

            {causesQuery.isLoading ? (
              <LoadingMessage />
            ) : causesQuery.isError ? (
              <ErrorMessage message={causesQuery.error.message} />
            ) : causes.length === 0 ? (
              <p className="text-gray-500">No causes available yet.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {causes.slice(0, 6).map((cause) => {
                  const Icon = causeIcons[cause.slug] || Heart;

                  return (
                    <Link
                      key={cause.id}
                      to={`/causes/${cause.slug}`}
                      className="group rounded-2xl border border-[#E6E9E4] p-6 transition hover:-translate-y-1 hover:border-[#123B32] hover:shadow-lg"
                    >
                      <div className="mb-5 inline-flex rounded-xl bg-[#E5EEE8] p-3">
                        <Icon size={25} className="text-[#123B32]" />
                      </div>

                      <h3 className="text-xl font-bold text-[#123B32]">
                        {cause.name}
                      </h3>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-gray-500">
                        {cause.description}
                      </p>

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {cause.ngoCount || 0} NGOs
                        </span>

                        <span className="flex items-center gap-1 font-semibold text-[#123B32]">
                          Explore <ArrowRight size={16} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-9 text-center">
              <Link
                to="/causes"
                className="inline-flex items-center gap-2 font-semibold text-[#123B32] hover:text-[#B18A45]"
              >
                Explore all causes <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* NGOS */}
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <SectionTitle
            eyebrow="Organizations making a difference"
            title="Meet verified NGOs."
            description="Discover organizations and learn about the work they do in their communities."
          />

          {ngosQuery.isLoading ? (
            <LoadingMessage />
          ) : ngosQuery.isError ? (
            <ErrorMessage message={ngosQuery.error.message} />
          ) : ngos.length === 0 ? (
            <p className="text-gray-500">
              No verified organizations available yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ngos.map((ngo) => (
                <Link
                  key={ngo.id}
                  to={`/ngos/${ngo.id}`}
                  className="rounded-2xl border border-[#E6E9E4] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="rounded-xl bg-[#E5EEE8] p-3">
                      <HandHeart className="text-[#123B32]" size={25} />
                    </div>

                    <span className="flex items-center gap-1 rounded-full bg-[#E5EEE8] px-3 py-1 text-xs font-semibold text-[#123B32]">
                      <ShieldCheck size={13} />
                      Verified
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#123B32]">
                    {ngo.organizationName}
                  </h3>

                  <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={15} />
                    {[ngo.city, ngo.state].filter(Boolean).join(", ") ||
                      "Location not specified"}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-500">
                    {ngo.description || "Working towards meaningful community impact."}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#123B32]">
                    View organization <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-9 text-center">
            <Link
              to="/ngos"
              className="inline-flex items-center gap-2 font-semibold text-[#123B32] hover:text-[#B18A45]"
            >
              Discover all NGOs <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-[#E5EEE8] py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <SectionTitle
              eyebrow="Simple. Transparent. Meaningful."
              title="How SevaSphere works."
              description="A straightforward journey from your intention to make a difference to understanding the impact."
            />

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  number: "01",
                  title: "Discover",
                  description:
                    "Explore causes and verified NGOs that align with your interests.",
                },
                {
                  number: "02",
                  title: "Donate",
                  description:
                    "Make a contribution and define how your donation should be allocated.",
                },
                {
                  number: "03",
                  title: "Track impact",
                  description:
                    "Follow allocations and impact reports to understand where your support goes.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="rounded-2xl bg-white p-8"
                >
                  <p className="text-4xl font-extrabold text-[#D6AD60]">
                    {item.number}
                  </p>

                  <h3 className="mt-5 text-xl font-bold text-[#123B32]">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#123B32] px-6 py-20 text-center text-white">
          <Heart className="mx-auto mb-5 text-[#D6AD60]" size={35} />

          <h2 className="text-3xl font-bold sm:text-4xl">
            Your generosity can create change.
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/70">
            Start exploring causes and organizations that are working
            towards a better tomorrow.
          </p>

          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D6AD60] px-8 py-4 font-semibold text-[#123B32] hover:bg-[#e6c47e]"
          >
            Join SevaSphere <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-[#E6E9E4] bg-white px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SevaSphere. Giving with purpose.
      </footer>
    </div>
  );
}