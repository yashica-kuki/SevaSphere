
import { Link } from "react-router-dom";
import {
  UserPlus,
  Search,
  Heart,
  BrainCircuit,
  ShieldCheck,
  Wallet,
  FileText,
  ArrowRight,
  Building2,
  CheckCircle2,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";

const donorSteps = [
  {
    icon: UserPlus,
    title: "Create an account",
    description:
      "Register as a donor and set up your donor profile.",
  },
  {
    icon: Search,
    title: "Explore causes and NGOs",
    description:
      "Discover verified organizations and choose the causes you care about.",
  },
  {
    icon: BrainCircuit,
    title: "Get AI-assisted recommendations",
    description:
      "The matching system recommends suitable NGOs based on your selected preferences and donation policies.",
  },
  {
    icon: Wallet,
    title: "Contribute securely",
    description:
      "Make a donation through the supported payment flow and track its transaction status.",
  },
  {
    icon: FileText,
    title: "Follow your impact",
    description:
      "Explore donation allocations and impact reports submitted by organizations.",
  },
];

const ngoSteps = [
  {
    icon: UserPlus,
    title: "Register your organization",
    description:
      "Create an NGO account and submit organization details.",
  },
  {
    icon: FileText,
    title: "Submit verification documents",
    description:
      "Provide the required registration and supporting documents for review.",
  },
  {
    icon: ShieldCheck,
    title: "Get verified",
    description:
      "The platform administrator reviews your application and updates its verification status.",
  },
  {
    icon: Heart,
    title: "Receive donor support",
    description:
      "Verified organizations can be discovered by donors and considered by the matching system.",
  },
  {
    icon: CheckCircle2,
    title: "Report your impact",
    description:
      "Submit reports describing how allocated funds were used, along with supporting evidence.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Simple. Transparent. Meaningful.
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            How SevaSphere works
          </h1>

          <p className="mt-5 max-w-2xl leading-8 text-white/75">
            From discovering a cause to tracking its impact, here's how
            donors, NGOs and responsible AI work together.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
              <Heart size={25} />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-forest">
                For donors
              </p>
              <h2 className="text-2xl font-bold text-charcoal">
                Your journey as a donor
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {donorSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-[#E6E9E4] bg-white p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                      {index + 1}
                    </span>

                    <Icon size={25} className="text-forest" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-charcoal">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-charcoal/65">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
              <Building2 size={25} />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-forest">
                For NGOs
              </p>
              <h2 className="text-2xl font-bold text-charcoal">
                Your journey as an organization
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ngoSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-[#E6E9E4] bg-white p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                      {index + 1}
                    </span>

                    <Icon size={25} className="text-forest" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-charcoal">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-charcoal/65">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-sage p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-forest">
              <BrainCircuit size={26} />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-forest">
              Responsible AI allocation
            </p>

            <h2 className="mt-3 text-3xl font-bold text-charcoal">
              How AI-assisted matching works
            </h2>

            <p className="mt-4 leading-8 text-charcoal/70">
              SevaSphere uses AI to help identify organizations that
              align with donor preferences. However, AI does not directly
              move money or execute financial transactions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6">
              <Search className="text-forest" size={25} />
              <h3 className="mt-4 font-bold text-charcoal">
                1. Discover matches
              </h3>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">
                AI evaluates relevant NGO information and recommends
                suitable organizations.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6">
              <ShieldCheck className="text-forest" size={25} />
              <h3 className="mt-4 font-bold text-charcoal">
                2. Apply donor policies
              </h3>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">
                Deterministic allocation rules enforce donor preferences,
                eligibility and allocation limits.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6">
              <Wallet className="text-forest" size={25} />
              <h3 className="mt-4 font-bold text-charcoal">
                3. Process and track
              </h3>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">
                The authorized payment and allocation workflow records
                transactions and their outcomes.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-forest px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold">
            Ready to make a difference?
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">
            Start by exploring causes and discovering organizations
            that match your interests.
          </p>

          <Link
            to="/causes"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-forest hover:bg-[#e7c47e]"
          >
            Explore causes
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    </div>
  );
}
