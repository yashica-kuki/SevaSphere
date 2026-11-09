
import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import { RefreshCw, Wallet, HeartHandshake, CheckCircle2, Clock } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusStyles = {
  PROPOSED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
  REQUESTED: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  FAILED: "bg-red-100 text-red-700",
};

const StatusCell = (params) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      statusStyles[params.value] || "bg-gray-100 text-gray-700"
    }`}
  >
    {(params.value || "UNKNOWN").replaceAll("_", " ")}
  </span>
);

const amountColumn = {
  valueFormatter: (params) => formatAmount(params.value),
  cellClass: "font-semibold",
};

const donationColumns = [
  {
    field: "donorName",
    headerName: "Donor",
    minWidth: 150,
    flex: 1,
  },
  {
    field: "donationDate",
    headerName: "Donation Date",
    minWidth: 140,
    valueFormatter: (params) => formatDate(params.value),
  },
  {
    field: "allocatedAmount",
    headerName: "Allocated Amount",
    minWidth: 160,
    ...amountColumn,
  },
  {
    field: "allocationStatus",
    headerName: "Allocation Status",
    minWidth: 160,
    cellRenderer: StatusCell,
  },
  {
    field: "matchScore",
    headerName: "Match Score",
    minWidth: 120,
    valueFormatter: (params) =>
      params.value == null ? "—" : `${Number(params.value).toFixed(1)}%`,
  },
  {
    field: "reason",
    headerName: "Allocation Reason",
    minWidth: 220,
    flex: 1,
    valueFormatter: (params) => params.value || "—",
  },
];

const payoutColumns = [
  {
    field: "createdAt",
    headerName: "Requested Date",
    minWidth: 150,
    valueFormatter: (params) => formatDate(params.value),
  },
  {
    field: "amount",
    headerName: "Payout Amount",
    minWidth: 160,
    ...amountColumn,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 140,
    cellRenderer: StatusCell,
  },
  {
    field: "reference",
    headerName: "Reference",
    minWidth: 180,
    valueFormatter: (params) => params.value || "—",
  },
  {
    field: "processedAt",
    headerName: "Processed Date",
    minWidth: 150,
    valueFormatter: (params) => formatDate(params.value),
  },
];

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
};

function SummaryCard({ title, value, icon: Icon, description }) {
  return (
    <div className="rounded-2xl border border-[#E6E9E4] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#68736D]">{title}</p>
        <div className="rounded-xl bg-[#E5EEE8] p-2 text-[#123B32]">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-[#123B32]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#89938D]">{description}</p>
    </div>
  );
}

export default function NGODonationsSection() {
  const [donations, setDonations] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [donationStats, setDonationStats] = useState({});
  const [payoutStats, setPayoutStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [donationResponse, payoutResponse] = await Promise.all([
        fetch("/api/ngo/donations", { credentials: "include" }),
        fetch("/api/ngo/payouts", { credentials: "include" }),
      ]);

      const [donationResult, payoutResult] = await Promise.all([
        donationResponse.json(),
        payoutResponse.json(),
      ]);

      if (!donationResponse.ok || !donationResult.success) {
        throw new Error(
          donationResult.message || "Unable to load donations."
        );
      }

      if (!payoutResponse.ok || !payoutResult.success) {
        throw new Error(
          payoutResult.message || "Unable to load payouts."
        );
      }

      setDonations(donationResult.data || []);
      setDonationStats(donationResult.stats || {});
      setPayouts(payoutResult.data || []);
      setPayoutStats(payoutResult.stats || {});
    } catch (err) {
      setError(err.message || "Unable to load donation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E6E9E4] bg-white p-8 text-sm text-[#68736D]">
        Loading donation records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#123B32] px-4 py-2 text-sm font-medium text-white"
        >
          <RefreshCw size={15} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#123B32]">
            Donation Overview
          </h2>
          <p className="mt-1 text-sm text-[#68736D]">
            Track donations allocated to your organization.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3DD] bg-white px-4 py-2 text-sm font-medium text-[#123B32] hover:bg-[#F5F8F5]"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Donations"
          value={donationStats.totalDonations || 0}
          icon={HeartHandshake}
          description="Unique donations received"
        />
        <SummaryCard
          title="Total Allocated"
          value={formatAmount(donationStats.totalAllocated)}
          icon={Wallet}
          description="Approved and completed allocations"
        />
        <SummaryCard
          title="Completed Amount"
          value={formatAmount(donationStats.completedAmount)}
          icon={CheckCircle2}
          description="Completed allocations"
        />
        <SummaryCard
          title="Proposed Amount"
          value={formatAmount(donationStats.proposedAmount)}
          icon={Clock}
          description="Awaiting allocation approval"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E6E9E4] bg-white">
        <div className="border-b border-[#E6E9E4] p-5">
          <h2 className="font-bold text-[#123B32]">
            Donation Allocations
          </h2>
          <p className="mt-1 text-xs text-[#68736D]">
            {donations.length} allocation records
          </p>
        </div>

        {donations.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#89938D]">
            No donations have been allocated to your organization yet.
          </div>
        ) : (
          <div className="w-full">
            <AgGridReact
              theme={themeQuartz}
              rowData={donations}
              columnDefs={donationColumns}
              defaultColDef={defaultColDef}
              domLayout="normal"
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50]}
              getRowId={(params) => params.data.id}
              style={{ height: 440, width: "100%" }}
            />
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E6E9E4] bg-white">
        <div className="border-b border-[#E6E9E4] p-5">
          <h2 className="font-bold text-[#123B32]">
            Payout Tracking
          </h2>
          <p className="mt-1 text-xs text-[#68736D]">
            Monitor payout requests and completed transfers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-[#E6E9E4] p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#68736D]">Completed Payouts</p>
            <p className="mt-1 text-xl font-bold text-[#123B32]">
              {formatAmount(payoutStats.completedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#68736D]">Pending Payouts</p>
            <p className="mt-1 text-xl font-bold text-[#123B32]">
              {formatAmount(payoutStats.pendingAmount)}
            </p>
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#89938D]">
            No payout records are available yet.
          </div>
        ) : (
          <div className="w-full">
            <AgGridReact
              theme={themeQuartz}
              rowData={payouts}
              columnDefs={payoutColumns}
              defaultColDef={defaultColDef}
              domLayout="normal"
              pagination
              paginationPageSize={10}
              getRowId={(params) => params.data.id}
              style={{ height: 380, width: "100%" }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
