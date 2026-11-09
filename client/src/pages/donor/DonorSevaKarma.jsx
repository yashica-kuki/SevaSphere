import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Activity, SlidersHorizontal, CheckCircle2, XCircle, Play, Pause, Ban, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { inrFromAmount, dateTime, newKey, title } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, Field, inputClass, QueryState, Empty, Modal, PageLoader } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";

const TABS = [
  { id: "match", label: "AI matching & allocation", icon: Sparkles },
  { id: "prefs", label: "Preferences", icon: SlidersHorizontal },
  { id: "auth", label: "Authorization", icon: ShieldCheck },
  { id: "activity", label: "Agent activity", icon: Activity },
];

export default function DonorSevaKarma() {
  const [tab, setTab] = useState("match");
  return (
    <>
      <PageHeader title="SevaSphere Agent" subtitle="Set your preferences, authorize what the agent may do, preview its choices, then let it donate within your limits. AI explains; deterministic code decides amounts; you stay in control." />
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === t.id ? "bg-forest text-white" : "border border-border bg-white text-forest hover:bg-ivory"}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "match" && <MatchingTab goto={setTab} />}
      {tab === "prefs" && <PreferencesTab />}
      {tab === "auth" && <AuthorizationTab />}
      {tab === "activity" && <ActivityTab />}
    </>
  );
}

/* ---------------- Preferences ---------------- */
const paiseToRupeesStr = (a) => (a ? String(a.rupees) : "");

function PreferencesTab() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: ["donor-prefs"], queryFn: () => get("/donor/preferences") });
  const causes = useQuery({ queryKey: ["donor-causes"], queryFn: () => get("/donor/causes") });
  const ngos = useQuery({ queryKey: ["donor-ngos-all"], queryFn: () => get("/donor/ngos", { limit: 30 }) });
  const [f, setF] = useState(null);

  useEffect(() => {
    if (prefs.data && !f) {
      const p = prefs.data;
      setF({ preferredCauseIds: p.preferredCauseIds, excludedCauseIds: p.excludedCauseIds, preferredNgoIds: p.preferredNgoIds, monthlyBudget: paiseToRupeesStr(p.monthlyBudget), maxDonationPerNgo: paiseToRupeesStr(p.maxDonationPerNgo), maxNgosPerAllocation: p.maxNgosPerAllocation, minDonation: String(p.minDonation.rupees), donateAnyCause: p.donateAnyCause, anonymous: p.anonymous });
    }
  }, [prefs.data, f]);

  const save = useMutation({
    mutationFn: () => send("put", "/donor/preferences", { ...f, monthlyBudget: f.monthlyBudget || null, maxDonationPerNgo: f.maxDonationPerNgo || null, minDonation: f.minDonation || "0", maxNgosPerAllocation: Number(f.maxNgosPerAllocation) }),
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["donor-prefs"] }); qc.invalidateQueries({ queryKey: ["donor-policy"] }); },
    onError: (e) => toast.error(e.message),
  });

  if (prefs.isLoading || causes.isLoading || !f) return <PageLoader />;
  if (prefs.isError) return <Notice tone="error">{prefs.error.message}</Notice>;

  const toggle = (key, id, other) => setF((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id], ...(other ? { [other]: s[other].filter((x) => x !== id) } : {}) }));
  const num = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
      <Section title="Causes" description="Which causes should the agent support, and which must it never touch?">
        <div className="grid gap-6 md:grid-cols-2">
          <fieldset><legend className="mb-2 text-sm font-semibold">Preferred causes</legend>
            {causes.data.map((c) => <label key={c.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={f.preferredCauseIds.includes(c.id)} onChange={() => toggle("preferredCauseIds", c.id, "excludedCauseIds")} />{c.name}</label>)}</fieldset>
          <fieldset><legend className="mb-2 text-sm font-semibold">Excluded causes (never donate)</legend>
            {causes.data.map((c) => <label key={c.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={f.excludedCauseIds.includes(c.id)} onChange={() => toggle("excludedCauseIds", c.id, "preferredCauseIds")} />{c.name}</label>)}</fieldset>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={f.donateAnyCause} onChange={(e) => setF((s) => ({ ...s, donateAnyCause: e.target.checked }))} />
          <span><b>Allow any cause</b> (except excluded). Without this, the agent only considers your preferred causes.</span></label>
      </Section>
      <Section title="Preferred NGOs" description="Optional. Preferred NGOs get a higher match score but must still be verified and eligible.">
        <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
          {ngos.data?.map((n) => <label key={n.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={f.preferredNgoIds.includes(n.id)} onChange={() => toggle("preferredNgoIds", n.id)} />{n.name}</label>)}
        </div>
      </Section>
      <Section title="Limits">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Monthly budget (₹)" htmlFor="mb"><input id="mb" inputMode="decimal" className={inputClass} value={f.monthlyBudget} onChange={num("monthlyBudget")} placeholder="e.g. 5000" required /></Field>
          <Field label="Max per NGO (₹)" htmlFor="mp" hint="Blank = no separate limit"><input id="mp" inputMode="decimal" className={inputClass} value={f.maxDonationPerNgo} onChange={num("maxDonationPerNgo")} /></Field>
          <Field label="Max NGOs per allocation" htmlFor="mn"><input id="mn" type="number" min="1" max="10" className={inputClass} value={f.maxNgosPerAllocation} onChange={num("maxNgosPerAllocation")} /></Field>
          <Field label="Minimum per NGO (₹)" htmlFor="mm"><input id="mm" inputMode="decimal" className={inputClass} value={f.minDonation} onChange={num("minDonation")} /></Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.anonymous} onChange={(e) => setF((s) => ({ ...s, anonymous: e.target.checked }))} /> Donate anonymously (NGOs see “Anonymous”)</label>
      </Section>
      <div className="flex items-center gap-3"><Btn type="submit" loading={save.isPending}>Save preferences</Btn>
        <span className="text-sm text-[#64716B]">After saving, review the <b>Authorization</b> tab — changing preferences does not change what you already authorized until you re-confirm.</span></div>
    </form>
  );
}

/* ---------------- Authorization ---------------- */
function AuthorizationTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["donor-policy"], queryFn: () => get("/donor/policy") });
  const [confirmed, setConfirmed] = useState(false);
  const done = () => { qc.invalidateQueries({ queryKey: ["donor-policy"] }); qc.invalidateQueries({ queryKey: ["donor-dashboard"] }); };
  const act = useMutation({
    mutationFn: ({ path, body }) => send("post", `/donor/policy/${path}`, body ?? {}),
    onSuccess: (r) => { toast.success(r.message); setConfirmed(false); done(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <QueryState query={q}>
      {(d) => {
        const cur = d.current; const pv = d.authorizationPreview; const status = cur?.status ?? "NOT_AUTHORIZED";
        return (
          <div className="space-y-6">
            <Section title="Current status" actions={<StatusBadge value={status} />}>
              {status === "ACTIVE" && <p className="text-sm text-[#4B5A54]">The agent may donate within the limits you authorized on {dateTime(cur.authorizedAt)}. This month you have spent {inrFromAmount(d.spentThisMonth)}.</p>}
              {status === "PAUSED" && <p className="text-sm text-[#4B5A54]">Paused on {dateTime(cur.pausedAt)}. No automatic or scheduled donations will run.</p>}
              {status === "REVOKED" && <p className="text-sm text-[#4B5A54]">Revoked on {dateTime(cur.revokedAt)}. Authorize again to resume agent donations.</p>}
              {status === "NOT_AUTHORIZED" && <p className="text-sm text-[#4B5A54]">You have not authorized automatic allocation yet.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {status === "ACTIVE" && <Btn variant="outline" onClick={() => act.mutate({ path: "pause" })} loading={act.isPending}><Pause size={16} /> Pause</Btn>}
                {status === "PAUSED" && <Btn variant="outline" onClick={() => act.mutate({ path: "resume" })} loading={act.isPending}><Play size={16} /> Resume</Btn>}
                {["ACTIVE", "PAUSED"].includes(status) && <Btn variant="danger" onClick={() => window.confirm("Revoke authorization? All automatic and scheduled donations will stop.") && act.mutate({ path: "revoke" })}><Ban size={16} /> Revoke</Btn>}
              </div>
              {d.outOfSync && status !== "REVOKED" && <Notice tone="warn" className="mt-4">Your preferences have changed since you authorized. The agent still uses the <b>old</b> authorization until you confirm the updated text below.</Notice>}
            </Section>

            <Section title={status === "ACTIVE" || status === "PAUSED" ? "Update authorization" : "What you are authorizing"} description="This is the exact text recorded when you confirm. It is generated from your saved preferences.">
              {pv.problems.length > 0 && <Notice tone="warn" className="mb-4"><ul className="list-disc pl-4">{pv.problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>}
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-ivory p-4 text-sm leading-relaxed text-charcoal" aria-label="Authorization text">{pv.text}</pre>
              <label className="mt-4 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!pv.canAuthorize} />I have read and agree to the above.</label>
              <Btn className="mt-4" disabled={!confirmed || !pv.canAuthorize} loading={act.isPending} onClick={() => act.mutate({ path: "authorize", body: { version: pv.version, text: pv.text } })}>
                <ShieldCheck size={16} /> {status === "ACTIVE" || status === "PAUSED" ? "Confirm updated authorization" : "Authorize automatic allocation"}
              </Btn>
            </Section>
          </div>
        );
      }}
    </QueryState>
  );
}

/* ---------------- Matching / allocation ---------------- */
function MatchingTab({ goto }) {
  const qc = useQueryClient();
  const policy = useQuery({ queryKey: ["donor-policy"], queryFn: () => get("/donor/policy") });
  const wallet = useQuery({ queryKey: ["donor-wallet"], queryFn: () => get("/donor/wallet") });
  const [amount, setAmount] = useState("1000");
  const [intent, setIntent] = useState("");
  const [result, setResult] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const keyRef = useRef(newKey());

  const preview = useMutation({
    mutationFn: () => send("post", "/donor/agent/preview", { amount, intent }),
    onSuccess: (r) => { setResult(r.data); setOutcome(null); keyRef.current = newKey(); },
    onError: (e) => toast.error(e.message),
  });
  const execute = useMutation({
    mutationFn: () => send("post", "/donor/agent/execute", { amount, intent, idempotencyKey: keyRef.current }),
    onSuccess: (r) => { setOutcome({ ok: true, ...r }); setConfirm(false); ["donor-wallet", "donor-dashboard", "donor-policy"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); toast.success(r.message); },
    onError: (e, _v, _c) => { setOutcome({ ok: false, message: e.message }); setConfirm(false); },
  });

  const status = policy.data?.current?.status ?? "NOT_AUTHORIZED";
  const canRun = status === "ACTIVE";
  const total = result?.allocation?.total;
  const walletOk = wallet.data && result ? BigInt(wallet.data.available.paise) >= BigInt(total?.paise ?? 0) : true;

  return (
    <div className="space-y-6">
      {!canRun && !policy.isLoading && (
        <Notice tone="warn">Authorization is <b>{title(status)}</b>. You can preview what the agent would do, but it can only donate after you authorize. <button className="font-semibold underline" onClick={() => goto("auth")}>Go to authorization</button></Notice>
      )}
      <Section title="1. Describe what you want" description="Amount to give now and, optionally, what matters to you. Gemini helps interpret your words; it never chooses amounts or NGOs outside your limits.">
        <form onSubmit={(e) => { e.preventDefault(); preview.mutate(); }} className="grid gap-4 md:grid-cols-[200px_1fr_auto] md:items-end">
          <Field label="Amount (₹)" htmlFor="amt"><input id="amt" inputMode="decimal" required className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Intent (optional)" htmlFor="intent" hint="e.g. “help children go to school”"><input id="intent" maxLength={500} className={inputClass} value={intent} onChange={(e) => setIntent(e.target.value)} /></Field>
          <Btn type="submit" loading={preview.isPending}><Sparkles size={16} /> Preview allocation</Btn>
        </form>
        {wallet.data && <p className="mt-3 text-sm text-[#64716B]">Available wallet balance: <b>{inrFromAmount(wallet.data.available)}</b> (simulated). <Link to="/donor/wallet" className="underline">Add funds</Link></p>}
      </Section>

      {preview.isPending && <PageLoader label="Running the SevaSphere workflow…" />}

      {result && (
        <>
          <Section title="2. Matches" description={`Candidates come only from verified, active NGOs in the database. Reasons written by ${result.intent?.source === "GEMINI" ? "Gemini" : "the built-in explainer (Gemini unavailable or not configured)"}.`}>
            {result.intent?.notes && <p className="mb-3 text-sm text-[#4B5A54]">Understood intent: “{result.intent.notes}”</p>}
            {result.matches.length === 0 ? <Empty title="No NGOs available" /> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="border-b border-border text-xs uppercase text-[#829087]"><th className="py-2 pr-3">NGO</th><th className="pr-3">Score</th><th className="pr-3">Matched causes</th><th className="pr-3">Eligibility</th><th>Reason</th></tr></thead>
                <tbody>{result.matches.map((m) => (
                  <tr key={m.ngoId} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3 font-semibold text-charcoal">{m.ngoName}</td>
                    <td className="pr-3"><div className="flex items-center gap-2"><div className="h-2 w-16 rounded-full bg-sage"><div className="h-2 rounded-full bg-forest" style={{ width: `${Math.min(100, m.matchScore)}%` }} /></div>{m.matchScore}</div></td>
                    <td className="pr-3">{m.matchedCauses.join(", ") || "—"}</td>
                    <td className="pr-3">{m.eligibilityStatus === "ELIGIBLE" ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Eligible</span> : <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={14} /> {title(m.eligibilityStatus.replace("INELIGIBLE_", ""))}</span>}</td>
                    <td className="text-[#4B5A54]">{m.reason}</td>
                  </tr>))}</tbody></table></div>
            )}
          </Section>

          <Section title="3. Allocation preview" description="Calculated by deterministic backend code in integer paise. Nothing has been spent yet.">
            {result.allocation.items.length === 0 ? (
              <Notice tone="warn">{result.allocation.message}</Notice>
            ) : (
              <>
                <ul className="divide-y divide-border">{result.allocation.items.map((a) => (
                  <li key={a.ngoId} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold text-charcoal">{a.ngoName}</p><p className="text-xs text-[#64716B]">Score {a.matchScore} · {a.matchedCauses.join(", ")}</p></div><p className="text-lg font-bold text-forest">{inrFromAmount(a.amount)}</p></li>))}</ul>
                <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span>Total to donate</span><b>{inrFromAmount(result.allocation.total)}</b></div>
                {BigInt(result.allocation.unallocated.paise) > 0n && <p className="mt-1 text-xs text-[#64716B]">{inrFromAmount(result.allocation.unallocated)} not allocated: {result.allocation.message}</p>}
              </>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {result.checks.map((c) => <div key={c.name} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${c.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}<span><b>{title(c.name)}:</b> {c.detail}</span></div>)}
            </div>
            {result.explanation && <p className="mt-4 rounded-xl bg-ivory p-4 text-sm text-charcoal">{result.explanation}</p>}
            <div className="mt-5"><Btn variant="gold" disabled={!canRun || result.allocation.items.length === 0 || !walletOk} onClick={() => { keyRef.current = newKey(); setConfirm(true); }}><Play size={16} /> Let the agent donate</Btn>
              {!walletOk && <span className="ml-3 text-sm text-red-700">Add funds to your wallet first.</span>}</div>
          </Section>
        </>
      )}

      {outcome && (
        <Notice tone={outcome.ok ? "success" : "error"}>
          {outcome.ok ? <><b>{outcome.message}.</b> {outcome.data?.explanation}{" "}<Link to="/donor/donations" className="font-semibold underline">View donation history</Link></> : <><b>No money was moved.</b> {outcome.message}</>}
        </Notice>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm donation">
        <p className="text-sm text-[#4B5A54]">The agent will donate <b>{total && inrFromAmount(total)}</b> from your simulated INR wallet to {result?.allocation.items.length} verified NGO(s), within your authorized limits. Pressing the button twice will not donate twice.</p>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="outline" onClick={() => setConfirm(false)}>Cancel</Btn><Btn variant="gold" loading={execute.isPending} onClick={() => execute.mutate()}>Confirm &amp; donate</Btn></div>
      </Modal>
    </div>
  );
}

/* ---------------- Agent activity ---------------- */
export function ExecutionTimeline({ steps }) {
  return (
    <ol className="relative space-y-3 border-l-2 border-sage pl-5">
      {steps.map((s) => (
        <li key={s.id} className="relative">
          <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${s.status === "COMPLETED" ? "bg-emerald-500" : s.status === "FAILED" ? "bg-red-500" : "bg-amber-400"}`} />
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-charcoal">{title(s.node)}</p><StatusBadge value={s.status} />{s.attempt > 1 && <span className="text-xs text-amber-700">attempt {s.attempt}</span>}<span className="text-xs text-[#98A19B]">{s.durationMs != null ? `${s.durationMs} ms` : ""} · {dateTime(s.startedAt)}</span></div>
          {s.error && <p className="mt-1 text-sm text-red-700">{s.error}</p>}
          {s.output && Object.keys(s.output).length > 0 && s.node !== "COMPLETED" && (
            <details className="mt-1"><summary className="cursor-pointer text-xs text-[#64716B]">Details</summary><pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-ivory p-2 text-xs">{JSON.stringify(s.output, null, 2)}</pre></details>
          )}
        </li>
      ))}
    </ol>
  );
}

function ActivityTab() {
  const list = useQuery({ queryKey: ["donor-executions"], queryFn: () => get("/donor/agent/executions"), refetchInterval: 15000 });
  const [sel, setSel] = useState(null);
  const detail = useQuery({ queryKey: ["donor-execution", sel], queryFn: () => get(`/donor/agent/executions/${sel}`), enabled: Boolean(sel) });
  useEffect(() => { if (!sel && list.data?.length) setSel(list.data[0].id); }, [list.data, sel]);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Section title="Recent runs">
        <QueryState query={list}>{(rows) => rows.length === 0 ? <Empty title="No agent runs yet" message="Run an allocation and it will appear here." /> : (
          <ul className="space-y-2">{rows.map((e) => (
            <li key={e.id}><button onClick={() => setSel(e.id)} className={`w-full rounded-xl border p-3 text-left ${sel === e.id ? "border-forest bg-sage/50" : "border-border hover:bg-ivory"}`}>
              <div className="flex items-center justify-between"><StatusBadge value={e.status} /><span className="text-xs text-[#98A19B]">{title(e.trigger)}</span></div>
              <p className="mt-1 text-xs text-[#64716B]">{dateTime(e.startedAt)}</p>{e.error && <p className="mt-1 line-clamp-2 text-xs text-red-700">{e.error}</p>}</button></li>))}</ul>)}</QueryState>
      </Section>
      <Section title="Workflow detail" description="LangGraph nodes executed for this run.">
        {!sel ? <Empty title="Select a run" /> : <QueryState query={detail}>{(d) => (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3"><StatusBadge value={d.status} /><span className="text-sm text-[#64716B]">Outcome: {title(d.outcome || "—")} · finished {dateTime(d.completedAt)}</span></div>
            {d.error && <Notice tone="error">{d.error}</Notice>}
            {d.allocations.length > 0 && <div><p className="mb-2 text-sm font-semibold">Selected NGOs & amounts</p><ul className="divide-y divide-border rounded-xl border border-border">{d.allocations.map((a) => <li key={a.ngoId} className="flex justify-between gap-4 p-3 text-sm"><div><p className="font-semibold">{a.ngoName}</p><p className="text-xs text-[#64716B]">{a.reason}</p></div><b>{inrFromAmount(a.amount)}</b></li>)}</ul></div>}
            {d.explanation && <p className="rounded-xl bg-ivory p-4 text-sm">{d.explanation}</p>}
            <ExecutionTimeline steps={d.steps} />
          </div>)}</QueryState>}
      </Section>
    </div>
  );
}
