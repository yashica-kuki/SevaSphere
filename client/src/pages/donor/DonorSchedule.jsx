import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import { Plus, Pause, Play, XCircle, Zap, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { get, send } from "../../lib/q";
import { inrFromAmount, dateTime, title } from "../../lib/format";
import { PageHeader, Section, Notice, Btn, Field, inputClass, Modal, QueryState, Empty } from "../../components/portal/ui";
import { StatusBadge } from "../../components/grid/cells";

const COLORS = { SCHEDULED: "green", NEXT: "green", PROJECTED: "teal", PAUSED: "orange", SUCCESS: "blue", FAILED: "red", RUNNING: "yellow" };
const PRESETS = [["dayAndWeek", "Weeks"], ["weekAndMonth", "Months"], ["monthAndYear", "Year"]];

const toLocalInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const blank = () => ({ id: null, name: "", type: "RECURRING", amount: "500", frequency: "MONTHLY", intervalDays: 14, startDate: toLocalInput(Date.now() + 24 * 3600 * 1000), endDate: "", budgetLimit: "", causeIds: [] });

export default function DonorSchedule() {
  const qc = useQueryClient();
  const ref = useRef(null);
  const [preset, setPreset] = useState("weekAndMonth");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const events = useQuery({ queryKey: ["donor-schedule-events"], queryFn: () => get("/donor/schedules/events"), refetchInterval: 30000 });
  const causes = useQuery({ queryKey: ["donor-causes"], queryFn: () => get("/donor/causes") });
  const policy = useQuery({ queryKey: ["donor-policy"], queryFn: () => get("/donor/policy") });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["donor-schedule-events"] }); qc.invalidateQueries({ queryKey: ["donor-dashboard"] }); qc.invalidateQueries({ queryKey: ["donor-wallet"] }); };

  const save = useMutation({
    mutationFn: (f) => {
      const body = { name: f.name, type: f.type, amount: f.amount, frequency: f.frequency, intervalDays: f.frequency === "CUSTOM" ? Number(f.intervalDays) : null, startDate: new Date(f.startDate).toISOString(), endDate: f.endDate && f.type === "RECURRING" ? new Date(f.endDate).toISOString() : null, budgetLimit: f.budgetLimit || null, causeIds: f.causeIds };
      return f.id ? send("put", `/donor/schedules/${f.id}`, body) : send("post", "/donor/schedules", body);
    },
    onSuccess: (r) => { toast.success(r.message); setForm(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const act = useMutation({
    mutationFn: ({ id, action }) => send("post", `/donor/schedules/${id}/${action}`),
    onSuccess: (r) => { toast.success(r.message ?? "Done"); setSelected(null); refresh(); },
    onError: (e) => { toast.error(e.message); refresh(); },
  });

  const data = events.data;
  const resources = useMemo(() => (data?.schedules ?? []).map((s) => ({ id: s.id, name: s.name || "Untitled", status: s.status })), [data]);
  const bryntumEvents = useMemo(() => (data?.events ?? []).map((e) => {
    const start = new Date(e.startDate);
    return { id: e.id, resourceId: e.scheduleId, name: e.kind === "RUN" ? `Run: ${title(e.status)}` : e.status === "PAUSED" ? "Paused" : e.kind === "NEXT" ? "Next donation" : "Planned", startDate: start, endDate: new Date(start.getTime() + 24 * 3600 * 1000), eventColor: COLORS[e.status] ?? "green", scheduleId: e.scheduleId };
  }), [data]);

  const openEdit = (s) => setForm({ id: s.id, name: s.name, type: s.type, amount: String(s.amount.rupees), frequency: s.frequency, intervalDays: s.intervalDays ?? 14, startDate: toLocalInput(s.startDate), endDate: s.endDate ? toLocalInput(s.endDate) : "", budgetLimit: s.budgetLimit ? String(s.budgetLimit.rupees) : "", causeIds: s.causeIds });
  const sel = data?.schedules.find((s) => s.id === selected);
  const authStatus = policy.data?.current?.status ?? "NOT_AUTHORIZED";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Donation Schedule" subtitle="Plan recurring or one-time gifts. The calendar is only a plan: each run re-checks your authorization, wallet balance, budgets and NGO eligibility before any money moves."
        actions={<Btn onClick={() => setForm(blank())}><Plus size={16} /> New schedule</Btn>} />
      {authStatus !== "ACTIVE" && <Notice tone="warn" className="mb-4">Your authorization is <b>{title(authStatus)}</b>. Scheduled donations will be skipped (and marked failed) until you authorize on the SevaSphere Agent page.</Notice>}

      <Section title="Timeline" description="Each row is a schedule. Click an event to manage it." actions={
        <div className="flex gap-1" role="group" aria-label="Timeline zoom">
          {PRESETS.map(([id, label]) => <button key={id} onClick={() => { setPreset(id); if (ref.current?.instance) ref.current.instance.viewPreset = id; }} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${preset === id ? "bg-forest text-white" : "border border-border text-forest"}`}>{label}</button>)}
          <button onClick={() => ref.current?.instance?.scrollToDate(new Date(), { block: "start" })} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-forest">Today</button>
        </div>}>
        <QueryState query={events}>{(d) => d.schedules.length === 0 ? (
          <Empty title="No schedules yet" message="Create a recurring monthly gift or a one-time scheduled donation." action={<Btn onClick={() => setForm(blank())}><Plus size={16} /> New schedule</Btn>} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border" style={{ height: Math.max(260, 120 + resources.length * 54) }}>
            <BryntumScheduler
              ref={ref}
              startDate={new Date(Date.now() - 7 * 24 * 3600 * 1000)}
              endDate={new Date(Date.now() + 120 * 24 * 3600 * 1000)}
              viewPreset={preset}
              resources={resources}
              events={bryntumEvents}
              columns={[{ text: "Schedule", field: "name", width: 190 }, { text: "Status", field: "status", width: 100 }]}
              rowHeight={52}
              readOnly
              eventStyle="filled"
              features={{ eventMenu: false, scheduleMenu: false, cellMenu: false, headerMenu: false, eventTooltip: true }}
              onEventClick={({ eventRecord }) => setSelected(eventRecord.scheduleId)}
            />
          </div>
        )}</QueryState>
      </Section>

      <Section title="All schedules" className="mt-6">
        <QueryState query={events}>{(d) => d.schedules.length === 0 ? <p className="text-sm text-[#64716B]">Nothing scheduled.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="border-b border-border text-xs uppercase text-[#829087]"><th className="py-2 pr-3">Name</th><th className="pr-3">Type</th><th className="pr-3">Amount</th><th className="pr-3">Frequency</th><th className="pr-3">Next run</th><th className="pr-3">Last run</th><th className="pr-3">Budget used</th><th>Status</th></tr></thead>
            <tbody>{d.schedules.map((s) => (
              <tr key={s.id} className="cursor-pointer border-b border-border/60 hover:bg-ivory" onClick={() => setSelected(s.id)}>
                <td className="py-3 pr-3 font-semibold text-charcoal">{s.name}</td><td className="pr-3">{title(s.type)}</td><td className="pr-3">{inrFromAmount(s.amount)}</td>
                <td className="pr-3">{s.type === "ONE_TIME" ? "Once" : s.frequency === "CUSTOM" ? `Every ${s.intervalDays} days` : title(s.frequency)}</td>
                <td className="pr-3">{["ACTIVE", "PAUSED"].includes(s.status) ? dateTime(s.nextRunAt) : "—"}</td>
                <td className="pr-3">{s.lastRunAt ? <span className="inline-flex items-center gap-2">{dateTime(s.lastRunAt)} <StatusBadge value={s.lastRunStatus} /></span> : "—"}</td>
                <td className="pr-3">{inrFromAmount(s.spent)}{s.budgetLimit ? ` / ${inrFromAmount(s.budgetLimit)}` : ""}</td><td><StatusBadge value={s.status} /></td></tr>))}</tbody></table></div>)}</QueryState>
      </Section>

      <Modal open={Boolean(sel)} onClose={() => setSelected(null)} title={sel?.name ?? "Schedule"}>
        {sel && (<div className="space-y-4 text-sm">
          <div className="flex items-center gap-2"><StatusBadge value={sel.status} /><span className="text-[#64716B]">{title(sel.type)} · {inrFromAmount(sel.amount)}</span></div>
          <p>Next run: <b>{["ACTIVE", "PAUSED"].includes(sel.status) ? dateTime(sel.nextRunAt) : "—"}</b></p>
          {sel.lastError && <Notice tone="error">Last run failed: {sel.lastError}</Notice>}
          <p className="text-[#64716B]">Runs so far: {sel.runCount} · Spent {inrFromAmount(sel.spent)}{sel.budgetLimit ? ` of ${inrFromAmount(sel.budgetLimit)}` : ""}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["ACTIVE", "PAUSED"].includes(sel.status) && <Btn variant="outline" onClick={() => openEdit(sel)}><CalendarClock size={16} /> Edit</Btn>}
            {sel.status === "ACTIVE" && <Btn variant="outline" loading={act.isPending} onClick={() => act.mutate({ id: sel.id, action: "pause" })}><Pause size={16} /> Pause</Btn>}
            {sel.status === "PAUSED" && <Btn variant="outline" loading={act.isPending} onClick={() => act.mutate({ id: sel.id, action: "resume" })}><Play size={16} /> Resume</Btn>}
            {sel.status === "ACTIVE" && <Btn variant="gold" loading={act.isPending} onClick={() => act.mutate({ id: sel.id, action: "run-now" })}><Zap size={16} /> Run now (demo)</Btn>}
            {["ACTIVE", "PAUSED"].includes(sel.status) && <Btn variant="danger" onClick={() => window.confirm("Cancel this schedule? This cannot be undone.") && act.mutate({ id: sel.id, action: "cancel" })}><XCircle size={16} /> Cancel</Btn>}
          </div>
          <p className="text-xs text-[#98A19B]">“Run now” goes through the same checks as a scheduled run (authorization, funds, budget, NGO eligibility).</p>
        </div>)}
      </Modal>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? "Edit schedule" : "New schedule"} wide>
        {form && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
            <div className="sm:col-span-2"><Field label="Name" htmlFor="sn"><input id="sn" required minLength={2} maxLength={80} className={inputClass} value={form.name} onChange={set("name")} placeholder="e.g. Monthly education gift" /></Field></div>
            <Field label="Type" htmlFor="st"><select id="st" className={inputClass} value={form.type} onChange={set("type")}><option value="RECURRING">Recurring</option><option value="ONE_TIME">One-time</option></select></Field>
            <Field label="Amount per run (₹)" htmlFor="sa"><input id="sa" required inputMode="decimal" className={inputClass} value={form.amount} onChange={set("amount")} /></Field>
            {form.type === "RECURRING" && <>
              <Field label="Frequency" htmlFor="sf"><select id="sf" className={inputClass} value={form.frequency} onChange={set("frequency")}><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option><option value="CUSTOM">Custom interval</option></select></Field>
              {form.frequency === "CUSTOM" && <Field label="Every N days" htmlFor="si"><input id="si" type="number" min="1" max="365" required className={inputClass} value={form.intervalDays} onChange={set("intervalDays")} /></Field>}
            </>}
            <Field label={form.type === "ONE_TIME" ? "Date & time" : "Start date & time"} htmlFor="sd"><input id="sd" type="datetime-local" required className={inputClass} value={form.startDate} onChange={set("startDate")} /></Field>
            {form.type === "RECURRING" && <Field label="End date (optional)" htmlFor="se"><input id="se" type="datetime-local" className={inputClass} value={form.endDate} onChange={set("endDate")} /></Field>}
            <Field label="Total budget for this schedule (₹, optional)" htmlFor="sb" hint="Stops once reached"><input id="sb" inputMode="decimal" className={inputClass} value={form.budgetLimit} onChange={set("budgetLimit")} /></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Limit to causes (optional)</legend>
              <div className="flex flex-wrap gap-3">{causes.data?.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.causeIds.includes(c.id)} onChange={() => setForm((f) => ({ ...f, causeIds: f.causeIds.includes(c.id) ? f.causeIds.filter((x) => x !== c.id) : [...f.causeIds, c.id] }))} />{c.name}</label>)}</div>
              <p className="mt-1 text-xs text-[#829087]">A schedule can only narrow, never widen, what your authorization allows.</p></fieldset>
            <div className="flex justify-end gap-2 sm:col-span-2"><Btn variant="outline" onClick={() => setForm(null)}>Close</Btn><Btn type="submit" loading={save.isPending}>{form.id ? "Save changes" : "Create schedule"}</Btn></div>
          </form>)}
      </Modal>
    </>
  );
}
