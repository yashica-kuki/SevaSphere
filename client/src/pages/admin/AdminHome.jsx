import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Building2, ShieldCheck, Clock, Receipt, Bot, Inbox, FileCheck2, Banknote } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { get } from "../../lib/q";
import { inrFromAmount, title } from "../../lib/format";
import { PageHeader, StatCard, Section, QueryState, SkeletonCards, Empty } from "../../components/portal/ui";

const COLORS = { SUCCESS: "#16a34a", COMPLETED: "#16a34a", PENDING: "#f59e0b", RUNNING: "#f59e0b", FAILED: "#dc2626", CANCELLED: "#94a3b8", REFUNDED: "#64748b" };

const Pie2 = ({ rows, label }) => rows.length === 0 ? <Empty title="No data yet" /> : (
  <div className="h-56" role="img" aria-label={label}><ResponsiveContainer><PieChart><Pie data={rows.map((r) => ({ name: title(r.status), value: r.count, status: r.status }))} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75}>{rows.map((r) => <Cell key={r.status} fill={COLORS[r.status] ?? "#123B32"} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>);

export default function AdminHome() {
  const q = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => get("/admin/dashboard") });
  return (
    <>
      <PageHeader title="Platform overview" subtitle="Live figures from the SevaSphere database." />
      <QueryState query={q} skeleton={<SkeletonCards count={8} />}>{(d) => (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Registered users" value={d.users.total} icon={Users} hint={`${d.users.donors} donors · ${d.users.ngos} NGOs · ${d.users.admins} admins`} />
            <StatCard label="NGOs" value={d.ngos.total} icon={Building2} tone="gold" />
            <StatCard label="Verified NGOs" value={d.ngos.verified} icon={ShieldCheck} />
            <StatCard label="Pending verification" value={d.ngos.pending} icon={Clock} tone="red" />
            <StatCard label="Completed donations" value={d.donations.count} icon={Receipt} />
            <StatCard label="Total donated" value={inrFromAmount(d.donations.total)} icon={Receipt} tone="gold" hint="Simulated INR" />
            <StatCard label="Impact reports to review" value={d.queues.pendingReports} icon={FileCheck2} tone="sky" />
            <StatCard label="Open enquiries" value={d.queues.openEnquiries} icon={Inbox} tone="sky" />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/admin/verifications" className="rounded-xl bg-forest px-4 py-2 font-semibold text-white">Review NGOs</Link>
            <Link to="/admin/impact" className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-forest">Review impact reports</Link>
            <Link to="/admin/payouts" className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 font-semibold text-forest"><Banknote size={16} /> {d.queues.pendingPayouts} payouts pending</Link>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <Section title="Donation trend" className="xl:col-span-3 2xl:col-span-1"><div className="h-56" role="img" aria-label="Monthly donation chart"><ResponsiveContainer><BarChart data={d.donationTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={60} tickFormatter={(v) => `₹${v}`} /><Tooltip formatter={(v, n) => (n === "amount" ? `₹${Number(v).toLocaleString("en-IN")}` : v)} /><Bar dataKey="amount" fill="#123B32" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Section>
            <Section title="Payment transactions"><Pie2 rows={d.payments} label="Payment status chart" /></Section>
            <Section title="Agent executions"><Pie2 rows={d.executions} label="Agent execution status chart" /><p className="mt-2 flex items-center gap-1 text-xs text-[#829087]"><Bot size={14} /> Previews are excluded.</p></Section>
          </div>
        </div>)}</QueryState>
    </>
  );
}
