import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wallet, HandCoins, Receipt, CalendarClock, Lock, Building2, ShieldAlert, ArrowRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { get } from "../../lib/q";
import { inrFromAmount, dateTime, title } from "../../lib/format";
import { PageHeader, StatCard, Section, QueryState, SkeletonCards, Notice, Empty } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";
import { useAuth } from "../../context/AuthContext";

const COLORS = ["#123B32", "#D6AD60", "#5E8C7B", "#A9C4B5", "#8A6A22", "#26332F"];

export default function DonorHome() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["donor-dashboard"], queryFn: () => get("/donor/dashboard") });

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name?.split(" ")[0] ?? "friend"}`} subtitle="Your giving at a glance. Every figure here comes from your wallet ledger and donation records." />
      <QueryState query={q} skeleton={<SkeletonCards count={6} />}>
        {(d) => (
          <div className="space-y-6">
            {d.authorization.status !== "ACTIVE" && (
              <Notice tone="warn">
                Automatic allocation is <b>{title(d.authorization.status)}</b>. The agent will not donate on your behalf until you review and authorize your policy.{" "}
                <Link to="/donor/sevakarma" className="font-semibold underline">Review authorization</Link>
              </Notice>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Total donated" value={inrFromAmount(d.statistics.totalDonated)} icon={HandCoins} hint={`Across ${d.statistics.ngosSupported} NGO(s)`} />
              <StatCard label="Available wallet balance" value={inrFromAmount(d.wallet.available)} icon={Wallet} hint="Simulated INR wallet (demo)" tone="gold" />
              <StatCard label="Reserved balance" value={inrFromAmount(d.wallet.reserved)} icon={Lock} hint="Held for in-flight donations" tone="sky" />
              <StatCard label="Donations" value={d.statistics.donationCount} icon={Receipt} />
              <StatCard label="Active schedules" value={d.statistics.activeSchedules} icon={CalendarClock} />
              <StatCard label="Spent this month" value={inrFromAmount(d.statistics.spentThisMonth)} icon={Building2} hint={d.statistics.monthlyBudget ? `of ${inrFromAmount(d.statistics.monthlyBudget)} budget` : "No monthly budget set"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Section title="Donations over time" className="xl:col-span-2" description="Last six months, in INR">
                {d.donationTrend.every((m) => m.amount.rupees === 0) ? (
                  <Empty title="No donations yet" message="Once the agent donates for you, your monthly totals appear here." />
                ) : (
                  <div className="h-64" role="img" aria-label="Bar chart of monthly donations">
                    <ResponsiveContainer>
                      <BarChart data={d.donationTrend.map((m) => ({ month: m.month, amount: m.amount.rupees }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" /><YAxis tickFormatter={(v) => `₹${v}`} width={70} />
                        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Donated"]} />
                        <Bar dataKey="amount" fill="#123B32" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Section>
              <Section title="By cause" description="Share of your giving">
                {d.causeBreakdown.length === 0 ? <Empty title="No data yet" /> : (
                  <div className="h-64" role="img" aria-label="Pie chart of donations by cause">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={d.causeBreakdown.map((c) => ({ name: c.name, value: c.amount.rupees }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                          {d.causeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Recent donations" actions={<Link to="/donor/donations" className="inline-flex items-center gap-1 text-sm font-semibold text-forest">View all <ArrowRight size={14} /></Link>}>
                {d.recentDonations.length === 0 ? <Empty title="No donations yet" message="Fund your wallet and run the SevaSphere agent to make your first donation." /> : (
                  <ul className="divide-y divide-border">
                    {d.recentDonations.map((x) => (
                      <li key={x.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-charcoal">{inrFromAmount(x.amount)}</p><StatusBadge value={x.status} />
                        </div>
                        <p className="mt-1 text-sm text-[#64716B]">{x.recipients.map((r) => r.organizationName).join(", ") || "—"}</p>
                        <p className="text-xs text-[#98A19B]">{dateTime(x.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Recent activity">
                {d.recentActivity.length === 0 ? <Empty title="No activity yet" /> : (
                  <ul className="divide-y divide-border">
                    {d.recentActivity.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-charcoal">{a.description}</p><p className="text-xs text-[#98A19B]">{title(a.type)} · {dateTime(a.createdAt)}</p></div>
                        <span className="shrink-0 text-sm font-semibold text-charcoal">{inrFromAmount(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
            <p className="flex items-center gap-2 text-xs text-[#829087]"><ShieldAlert size={14} /> The INR wallet is a simulated prototype wallet. No real money is held or moved.</p>
          </div>
        )}
      </QueryState>
    </>
  );
}
