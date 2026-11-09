import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Wallet, Lock, CircleDollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { inrFromAmount, newKey } from "../../lib/format";
import { PageHeader, StatCard, Section, Notice, Btn, Field, inputClass, QueryState, SkeletonCards } from "../../components/portal/ui";
import ServerGrid from "../../components/grid/ServerGrid";
import { dateCol, moneyCol, textCol, statusCol } from "../../components/grid/cells";
import PayPalSandbox from "../../components/portal/PayPalSandbox";

const cols = [
  dateCol("createdAt", "Date"),
  { ...statusCol("type", "Type") },
  moneyCol("amount", "Amount (INR)"),
  moneyCol("balanceAfter", "Balance after"),
  textCol("description", "Description", { flex: 2, minWidth: 220 }),
];

export default function DonorWallet() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["donor-wallet"], queryFn: () => get("/donor/wallet") });
  const [amount, setAmount] = useState("1000");
  const [refresh, setRefresh] = useState(0);
  const keyRef = useRef(newKey()); // one key per intended top-up, so double-clicks cannot double-credit
  const topup = useMutation({
    mutationFn: () => send("post", "/donor/wallet/topup", { amount, idempotencyKey: keyRef.current }),
    onSuccess: (r) => { toast.success(r.message); keyRef.current = newKey(); qc.invalidateQueries({ queryKey: ["donor-wallet"] }); qc.invalidateQueries({ queryKey: ["donor-dashboard"] }); setRefresh((n) => n + 1); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Wallet & Payments" subtitle="Your simulated INR wallet funds the agent's donations. PayPal Sandbox (USD) is a separate payment demo." />
      <div className="space-y-6">
        <Notice tone="sandbox"><b>Simulated wallet.</b> Funds added here are demo credits, not real money. All balances are stored as integer paise and every change is recorded in an immutable ledger.</Notice>
        <QueryState query={q} skeleton={<SkeletonCards count={3} />}>
          {(w) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Wallet balance" value={inrFromAmount(w.total)} icon={Wallet} />
              <StatCard label="Available" value={inrFromAmount(w.available)} icon={CircleDollarSign} tone="gold" />
              <StatCard label="Reserved" value={inrFromAmount(w.reserved)} icon={Lock} tone="sky" hint="Held during donation execution" />
            </div>
          )}
        </QueryState>
        <Section title="Add simulated funds" description="Demo only. Between ₹1 and ₹1,00,000 per top-up.">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); topup.mutate(); }}>
            <div className="w-48"><Field label="Amount (₹)" htmlFor="topup"><input id="topup" required inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field></div>
            {[500, 1000, 5000].map((v) => <Btn key={v} variant="outline" onClick={() => setAmount(String(v))}>₹{v.toLocaleString("en-IN")}</Btn>)}
            <Btn type="submit" loading={topup.isPending}>Add funds</Btn>
          </form>
        </Section>
        <Section title="Wallet transactions" description="Immutable ledger: top-ups, holds, debits, refunds and reversals.">
          <ServerGrid endpoint="/donor/grids/wallet" columns={cols} refreshKey={refresh} searchPlaceholder="Search descriptions…" emptyMessage="No wallet transactions yet. Add simulated funds to get started." />
        </Section>
        <PayPalSandbox />
      </div>
    </>
  );
}
