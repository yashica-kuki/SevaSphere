import { useState } from "react";
import { PageHeader, Section } from "../../components/portal/ui";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, moneyCol, textCol, statusCol, plainCol } from "../../components/grid/cells";

// Wrapped text inside a fixed row height. (AG Grid's autoHeight is not supported by the
// infinite row model, which is what made long text spill over the rows below.)
const wrapStyle = { whiteSpace: "normal", lineHeight: "1.4", paddingTop: "8px", paddingBottom: "8px" };

const donationCols = [
  dateCol("createdAt", "Date"),
  textCol("recipients", "Recipient NGO(s)", { sortable: false, filter: false, flex: 2, minWidth: 220 }),
  moneyCol("amount", "Amount (INR)"),
  plainCol("causes", "Cause(s)", { flex: 1.4 }),
  statusCol("status", "Status"),
  textCol("source", "Initiated by", { valueFormatter: (p) => ({ MANUAL: "You (agent)", SCHEDULE: "Schedule", AGENT: "Agent" }[p.value] ?? p.value) }),
  plainCol("explanation", "Allocation explanation", { flex: 3, minWidth: 320, tooltipField: "explanation", wrapText: true, cellStyle: wrapStyle }),
];
const allocCols = [
  dateCol("createdAt", "Date"),
  textCol("ngoName", "NGO", { flex: 1.5 }),
  moneyCol("amount", "Amount (INR)"),
  { field: "matchScore", headerName: "Match score", filter: "agNumberColumnFilter" },
  statusCol("status", "Status"),
  plainCol("reason", "Why this NGO", { flex: 3, minWidth: 300, tooltipField: "reason", wrapText: true, cellStyle: wrapStyle }),
];

export default function DonorDonations() {
  const [tab, setTab] = useState("donations");
  return (
    <>
      <PageHeader title="Donations" subtitle="Everything the agent has given on your behalf, with the reasoning behind each allocation." />
      <div className="mb-4 flex gap-2" role="tablist">
        {[["donations", "Donation history"], ["allocations", "Allocation history"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === id ? "bg-forest text-white" : "border border-border bg-white text-forest"}`}>{label}</button>))}
      </div>
      <Section>
        {tab === "donations"
          ? <ServerGrid key="d" endpoint="/donor/grids/donations" columns={donationCols} searchPlaceholder="Search by NGO name…" emptyMessage="No donations yet." height={640} rowHeight={84} />
          : <ServerGrid key="a" endpoint="/donor/grids/allocations" columns={allocCols} searchPlaceholder="Search NGO or reason…" emptyMessage="No allocations yet." height={640} rowHeight={84} />}
      </Section>
    </>
  );
}
