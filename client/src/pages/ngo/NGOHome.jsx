
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  HeartHandshake,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAuth } from "../../context/AuthContext";

const fetchDashboard = async () => {
  const response = await fetch("/api/dashboard/ngo", {
    method: "GET",
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load NGO dashboard.");
  }

  return result.data;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E6E9E4] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#68736D]">{title}</p>
          <h3 className="mt-3 text-2xl font-bold text-[#123B32]">
            {value}
          </h3>
          <p className="mt-2 text-xs text-[#87918B]">{subtitle}</p>
        </div>

        <div className="rounded-xl bg-[#F2F6F1] p-3">
          <Icon size={21} className="text-[#26745A]" />
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ status }) {
  const verified = status === "VERIFIED";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        verified
          ? "bg-green-50 text-green-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {status?.replaceAll("_", " ") || "PENDING"}
    </span>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-gray-200" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-gray-200" />
    </div>
  );
}

export default function NGOHome() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 font-semibold text-red-700">
          <AlertCircle size={20} />
          Unable to load your dashboard
        </div>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const ngo = data?.ngo;
  const overview = data?.overview || {};
  const monthlyTrend = data?.monthlyTrend || [];
  const recentDonations = data?.recentDonations || [];

  const ngoName =
    ngo?.organizationName ||
    user?.ngoProfile?.organizationName ||
    user?.name ||
    "Organization";

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#B18A43]">
            ORGANIZATION OVERVIEW
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#123B32] sm:text-3xl">
            Welcome, {ngoName}
          </h1>

          <p className="mt-2 text-sm text-[#68736D]">
            Here's an overview of your organization's activity on SevaSphere.
          </p>

          <p className="mt-2 text-sm text-[#68736D]">
            {[ngo?.city, ngo?.state, ngo?.country].filter(Boolean).join(", ")}
          </p>
        </div>

        <VerificationBadge status={ngo?.status} />
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#123B32]">
            Your organization at a glance
          </h2>
          <p className="mt-1 text-sm text-[#68736D]">
            Summary of your donation activity and payouts.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Allocations"
            value={overview.totalDonations || 0}
            subtitle="Donations allocated to your NGO"
            icon={HeartHandshake}
          />

          <StatCard
            title="Total Received"
            value={formatCurrency(overview.totalReceived)}
            subtitle="Completed allocations"
            icon={Wallet}
          />

          <StatCard
            title="Unique Donors"
            value={overview.donorCount || 0}
            subtitle="Distinct donor accounts"
            icon={Users}
          />

          <StatCard
            title="Pending Payouts"
            value={formatCurrency(overview.pendingPayoutAmount)}
            subtitle={`${overview.pendingPayoutCount || 0} payout requests`}
            icon={Clock}
          />
        </div>
      </section>

      {/* Monthly trend and payout summary */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#E6E9E4] bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#123B32]">
                Donation Trend
              </h2>
              <p className="mt-1 text-sm text-[#68736D]">
                Completed allocations over the last six months
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-[#26745A]">
              <TrendingUp size={17} />
              Monthly
            </div>
          </div>

          <div className="mt-6 h-64 w-full">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="donationGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#26745A"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#26745A"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E8ECE7"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#87918B", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(value) => `₹${value}`}
                    tick={{ fill: "#87918B", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(value),
                      "Received",
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E6E9E4",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#26745A"
                    strokeWidth={2.5}
                    fill="url(#donationGradient)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#87918B]">
                No donation trend data available.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E9E4] bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#123B32]">
            Payout Summary
          </h2>
          <p className="mt-1 text-sm text-[#68736D]">
            Your payout activity
          </p>

          <div className="mt-6 space-y-5">
            <div className="rounded-xl bg-[#F2F6F1] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#68736D]">
                  Completed payouts
                </span>
                <CheckCircle2 size={18} className="text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#123B32]">
                {formatCurrency(overview.completedPayoutAmount)}
              </p>
              <p className="mt-1 text-xs text-[#87918B]">
                {overview.completedPayoutCount || 0} completed transactions
              </p>
            </div>

            <div className="rounded-xl bg-[#FFF8EB] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#68736D]">
                  Awaiting processing
                </span>
                <Clock size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#123B32]">
                {formatCurrency(overview.pendingPayoutAmount)}
              </p>
              <p className="mt-1 text-xs text-[#87918B]">
                {overview.pendingPayoutCount || 0} pending requests
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent donations */}
      <section className="overflow-hidden rounded-2xl border border-[#E6E9E4] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E9E4] p-5">
          <div>
            <h2 className="font-bold text-[#123B32]">
              Recent Donations
            </h2>
            <p className="mt-1 text-sm text-[#68736D]">
              Latest allocations received by your organization
            </p>
          </div>

          <span className="flex items-center gap-1 text-xs font-medium text-[#68736D]">
            Latest 6 <ArrowUpRight size={14} />
          </span>
        </div>

        {recentDonations.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F6F1]">
              <IndianRupee size={22} className="text-[#26745A]" />
            </div>
            <h3 className="mt-4 font-semibold text-[#123B32]">
              No donations yet
            </h3>
            <p className="mt-1 text-sm text-[#68736D]">
              Your donation records will appear here when funds are allocated
              to your organization.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[#F8FAF7] text-xs uppercase tracking-wide text-[#68736D]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Donor</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E6E9E4]">
                {recentDonations.map((donation) => (
                  <tr key={donation.id}>
                    <td className="px-5 py-4 font-medium text-[#123B32]">
                      {donation.donorName}
                    </td>
                    <td className="px-5 py-4 text-[#68736D]">
                      {formatDate(donation.date)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#123B32]">
                      {formatCurrency(donation.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#F2F6F1] px-3 py-1 text-xs font-semibold text-[#26745A]">
                        {donation.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
