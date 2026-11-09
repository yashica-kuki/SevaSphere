import { useState } from "react";
import { PageHeader, Section, Notice } from "../../components/portal/ui";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, moneyCol, textCol, statusCol, plainCol } from "../../components/grid/cells";

const donationCols = [
  textCol("donationId", "Donation ID", { valueFormatter: (p) => (p.value ? p.value.slice(0, 8).toUpperCase() : ""), sortable: false, filter: false, minWidth: 130 }),
  textCol("donor", "Donor", { sortable: false, filter: false }),
  moneyCol("amount", "Amount (INR)"),
  dateCol("createdAt", "Date"),
  plainCol("cause", "Cause", { flex: 1.4 }),
  statusCol("status", "Donation status"),
  plainCol("payoutStatus", "Payout", { cellRenderer: (p) => <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">{p.value}</span> }),
];
const payoutCols = [
  dateCol("createdAt", "Requested"),
  moneyCol("amount", "Amount (INR)"),
  statusCol("status", "Status"),
  textCol("reference", "Reference"),
  dateCol("processedAt", "Processed"),
];

export default function NGODonations() {
  const [tab, setTab] = useState("donations");
  return (
    <>
      <PageHeader title="Donations" subtitle="Donations allocated to your organization. You only ever see your own, and anonymous donors are never identified." />
      <Notice tone="sandbox" className="mb-4">Amounts are in simulated INR for this prototype. Payouts are tracked here; actual bank transfers are out of scope.</Notice>
      <div className="mb-4 flex gap-2" role="tablist">
        {[["donations", "Donations received"], ["payouts", "Payout history"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === id ? "bg-forest text-white" : "border border-border bg-white text-forest"}`}>{label}</button>))}
      </div>
      <Section>{tab === "donations"
        ? <ServerGrid key="d" endpoint="/ngo/grids/donations" columns={donationCols} searchPlaceholder="Filter in columns using the header menu…" emptyMessage="No donations received yet." csv />
        : <ServerGrid key="p" endpoint="/ngo/grids/payouts" columns={payoutCols} searchPlaceholder="Search by reference…" emptyMessage="No payouts yet." />}</Section>
    </>
  );
}
