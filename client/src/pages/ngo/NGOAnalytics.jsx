import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Repeat, Receipt, HandCoins } from "lucide-react";
import { get } from "../../lib/q";
import { inrFromAmount } from "../../lib/format";
import { PageHeader, Section, StatCard, QueryState, SkeletonCards, Empty } from "../../components/portal/ui";

const COLORS = ["#123B32", "#D6AD60", "#5E8C7B", "#A9C4B5", "#8A6A22"];

export default function NGOAnalytics() {
  const q = useQuery({ queryKey: ["ngo-analytics"], queryFn: () => get("/ngo/analytics") });
  return (
    <>
      <PageHeader title="Analytics" subtitle="Calculated from donations allocated to your organization." />
      <QueryState query={q} skeleton={<SkeletonCards />}>{(a) => (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total received" value={inrFromAmount(a.totals.amount)} icon={HandCoins} />
            <StatCard label="Donations" value={a.totals.donations} icon={Receipt} tone="gold" />
            <StatCard label="Distinct donors" value={a.totals.donors} icon={Users} tone="sky" />
            <StatCard label="Repeat donors" value={a.totals.repeatDonors} icon={Repeat} />
          </div>
          {a.totals.donations === 0 ? <Empty title="No donations yet" message="Charts appear once donors give to your organization." /> : (
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Monthly donations (₹)"><div className="h-72" role="img" aria-label="Monthly donation bar chart"><ResponsiveContainer><BarChart data={a.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `₹${v}`} width={70} /><Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} /><Bar dataKey="amount" name="Donations" fill="#123B32" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Section>
              <Section title="Donor trends"><div className="h-72" role="img" aria-label="Donor trend line chart"><ResponsiveContainer><LineChart data={a.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} width={40} /><Tooltip /><Legend /><Line type="monotone" dataKey="donors" name="Active donors" stroke="#123B32" strokeWidth={2} /><Line type="monotone" dataKey="newDonors" name="New donors" stroke="#D6AD60" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Section>
              <Section title="Cause-wise breakdown" className="xl:col-span-2">
                {a.causes.length === 0 ? <Empty title="No data" /> : <div className="h-72" role="img" aria-label="Cause breakdown pie chart"><ResponsiveContainer><PieChart><Pie data={a.causes} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={95} label={(e) => e.name}>{a.causes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} /></PieChart></ResponsiveContainer></div>}
                <p className="mt-2 text-xs text-[#829087]">Donations to organizations with several causes are split evenly across those causes.</p>
              </Section>
            </div>)}
        </div>)}</QueryState>
    </>
  );
}
