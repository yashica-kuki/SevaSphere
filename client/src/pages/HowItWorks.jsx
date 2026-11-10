
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
      "Register as a donor and top up your simulated wallet to fund donations.",
  },
  {
    icon: Search,
    title: "Explore causes and NGOs",
    description:
      "Browse verified organizations, read their impact reports and save favourites.",
  },
  {
    icon: BrainCircuit,
    title: "Set your purpose and limits",
    description:
      "Pick your causes and set a monthly budget, a per-NGO cap and the maximum number of NGOs. Then authorize the SevaSphere Agent to act within those limits.",
  },
  {
    icon: Wallet,
    title: "Let the agent donate",
    description:
      "Describe what you want in plain words, preview the split, and confirm. Or schedule a recurring donation that the agent runs for you.",
  },
  {
    icon: FileText,
    title: "Follow your impact",
    description:
      "See exactly which NGOs received what, read the agent's explanation, and review impact reports with evidence.",
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

const agentSteps = [
  {
    icon: BrainCircuit,
    ai: true,
    title: "Understand the request",
    description:
      "Gemini turns your free-text intent into causes from the platform's real list. It can never go wider than the causes you authorized.",
  },
  {
    icon: Search,
    ai: false,
    title: "Find candidate NGOs",
    description:
      "Loads only verified, active NGOs from the database along with their causes and impact-report history.",
  },
  {
    icon: CheckCircle2,
    ai: true,
    title: "Check eligibility and score",
    description:
      "Rules score each NGO on cause fit (40), your preferences (25), impact reporting (20) and capacity (15). AI only writes the reason text.",
  },
  {
    icon: ShieldCheck,
    ai: false,
    title: "Allocate the funds",
    description:
      "A deterministic engine splits the amount by score, respecting per-NGO caps, minimum donations and the maximum number of NGOs.",
  },
  {
    icon: ShieldCheck,
    ai: false,
    title: "Validate authorization",
    description:
      "Confirms your authorization is active, the budget limits hold, the wallet has funds and every NGO is still eligible.",
  },
  {
    icon: Wallet,
    ai: false,
    title: "Execute the donation",
    description:
      "One locked database transaction moves the money and records the ledger. Retries cannot double-charge because of idempotency keys.",
  },
  {
    icon: FileText,
    ai: true,
    title: "Explain the outcome",
    description:
      "Gemini summarises what actually happened using only the committed facts, with a plain template if AI is unavailable.",
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
            donors, NGOs and the SevaSphere Agent work together.
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
              The SevaSphere Agent
            </p>

            <h2 className="mt-3 text-3xl font-bold text-charcoal">
              How the AI agent works
            </h2>

            <p className="mt-4 leading-8 text-charcoal/70">
              The agent runs as a seven-step workflow. AI is used only to
              understand your request and to explain the result. The decisions
              that involve money, such as who is eligible, how much each NGO
              gets and whether the donation may proceed, are made by fixed,
              testable rules.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agentSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-2xl bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        step.ai
                          ? "bg-gold/25 text-forest"
                          : "bg-sage text-forest"
                      }`}
                    >
                      {step.ai ? "AI-assisted" : "Rule-based"}
                    </span>
                  </div>
                  <Icon className="mt-4 text-forest" size={25} />
                  <h3 className="mt-3 font-bold text-charcoal">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal/65">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-charcoal/70">
            Every step is logged with its input, output and timing. A preview
            runs the same workflow but stops before any money moves. If a
            check fails, the agent stops and tells you the exact reason, and
            no donation is made.
          </p>
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
