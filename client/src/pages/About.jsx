
import { Link } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  BrainCircuit,
  Eye,
  Users,
  ArrowRight,
  HandHeart,
} from "lucide-react";

import Navbar from "../components/layout/Navbar.jsx";

const values = [
  {
    icon: ShieldCheck,
    title: "Trust and verification",
    description:
      "We prioritize verified organizations and transparent donation records.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "Donors can explore allocation records and NGO-submitted impact reports.",
  },
  {
    icon: BrainCircuit,
    title: "Responsible AI",
    description:
      "AI helps identify suitable organizations while donor policies and deterministic rules control allocation.",
  },
  {
    icon: Users,
    title: "Community impact",
    description:
      "We connect donors and organizations working towards meaningful social change.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <section className="bg-forest px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            About SevaSphere
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Making generosity more transparent, accessible and impactful.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
            SevaSphere is a donation platform designed to connect donors
            with verified NGOs and make charitable giving more informed
            through technology.
          </p>

          <Link
            to="/how-it-works"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-forest hover:bg-[#e7c47e]"
          >
            Discover how it works
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-forest">
              Our mission
            </p>

            <h2 className="mt-3 text-3xl font-bold text-charcoal md:text-4xl">
              Turning good intentions into meaningful action.
            </h2>

            <p className="mt-6 leading-8 text-charcoal/70">
              Donors often struggle to identify trustworthy organizations
              and understand where their money goes. NGOs, meanwhile, need
              better ways to connect with supporters and demonstrate their
              impact.
            </p>

            <p className="mt-4 leading-8 text-charcoal/70">
              SevaSphere aims to bridge this gap through verified NGO
              profiles, policy-based donation allocation, AI-assisted
              matching and transparent impact reporting.
            </p>
          </div>

          <div className="rounded-3xl bg-sage p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-forest">
              <HandHeart size={34} />
            </div>

            <h3 className="mt-6 text-2xl font-bold text-charcoal">
              One platform. Shared purpose.
            </h3>

            <p className="mt-4 leading-7 text-charcoal/65">
              Bringing donors, NGOs and technology together to make
              charitable contributions more meaningful.
            </p>
          </div>
        </section>

        <section className="mt-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-forest">
              What guides us
            </p>

            <h2 className="mt-3 text-3xl font-bold text-charcoal">
              Our core values
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#E6E9E4] bg-white p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-forest">
                    <Icon size={25} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-charcoal">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-charcoal/65">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-forest px-8 py-14 text-center text-white">
          <Heart className="mx-auto text-gold" size={38} />

          <h2 className="mt-5 text-3xl font-bold">
            Be a part of the change
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">
            Explore causes, discover verified NGOs and find ways to
            contribute to the communities that need support.
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
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Discover NGOs
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
