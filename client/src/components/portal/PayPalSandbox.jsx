import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get, send } from "../../lib/q";
import { newKey, dateTime } from "../../lib/format";
import { Section, Notice, Field, inputClass, PageLoader } from "./ui";
import { StatusBadge } from "../grid/cells";

const loadSdk = (clientId) =>
  new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK failed to initialise")));
    s.onerror = () => reject(new Error("Could not load the PayPal SDK (check your connection)"));
    document.body.appendChild(s);
  });

/** PayPal Sandbox checkout (USD). Orders are created and captured by OUR server; the browser never decides the outcome. */
export default function PayPalSandbox() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["paypal-config"], queryFn: () => get("/donor/paypal/config") });
  const history = useQuery({ queryKey: ["paypal-payments"], queryFn: () => get("/donor/paypal/payments") });
  const [amount, setAmount] = useState("10.00");
  const [status, setStatus] = useState(null); // { tone, text }
  const [sdkError, setSdkError] = useState("");
  const box = useRef(null);
  const amountRef = useRef(amount);
  amountRef.current = amount;
  const valid = /^\d{1,3}(\.\d{1,2})?$/.test(amount) && Number(amount) >= 1 && Number(amount) <= 500;

  useEffect(() => {
    if (!cfg.data?.configured || !box.current) return undefined;
    let cancelled = false;
    let buttons;
    loadSdk(cfg.data.clientId)
      .then((paypal) => {
        if (cancelled || !box.current) return;
        box.current.innerHTML = "";
        buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "donate" },
          onClick: (_d, actions) => (/^\d{1,3}(\.\d{1,2})?$/.test(amountRef.current) && Number(amountRef.current) >= 1 ? actions.resolve() : (setStatus({ tone: "error", text: "Enter an amount between $1.00 and $500.00." }), actions.reject())),
          createOrder: async () => {
            setStatus(null);
            const r = await send("post", "/donor/paypal/create-order", { amountUsd: Number(amountRef.current).toFixed(2), idempotencyKey: newKey() });
            return r.data.orderId;
          },
          onApprove: async (data) => {
            try {
              const r = await send("post", "/donor/paypal/capture-order", { orderId: data.orderID });
              setStatus({ tone: "success", text: `Sandbox payment captured (${r.data.currency} ${r.data.amount}). Transaction ${r.data.captureId}.` });
            } catch (e) {
              setStatus({ tone: "error", text: `Payment failed: ${e.message}` });
            }
            qc.invalidateQueries({ queryKey: ["paypal-payments"] });
          },
          onCancel: async (data) => {
            if (data?.orderID) await send("post", "/donor/paypal/cancel-order", { orderId: data.orderID }).catch(() => {});
            setStatus({ tone: "warn", text: "Checkout cancelled. You were not charged." });
            qc.invalidateQueries({ queryKey: ["paypal-payments"] });
          },
          onError: async (err) => {
            setStatus({ tone: "error", text: `PayPal error: ${err?.message || "checkout failed"}` });
            qc.invalidateQueries({ queryKey: ["paypal-payments"] });
          },
        });
        if (buttons.isEligible()) buttons.render(box.current);
      })
      .catch((e) => !cancelled && setSdkError(e.message));
    return () => { cancelled = true; try { buttons?.close(); } catch { /* ignore */ } };
  }, [cfg.data, qc]);

  return (
    <Section title="PayPal Sandbox donation (USD)" description="A separate test payment in US dollars.">
      <Notice tone="sandbox" className="mb-4"><b>Sandbox mode.</b> {cfg.data?.notice ?? "PayPal runs in Sandbox with USD. It is separate from your simulated INR wallet and nothing is converted."} Use a PayPal sandbox buyer account; no real money moves.</Notice>
      {cfg.isLoading && <PageLoader />}
      {cfg.isError && <Notice tone="error">{cfg.error.message}</Notice>}
      {cfg.data && !cfg.data.configured && (
        <Notice tone="warn">PayPal Sandbox is not configured on the server. Set <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> in <code>server/.env</code> (see README) and restart.</Notice>
      )}
      {cfg.data?.configured && (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <div>
            <Field label="Amount (USD)" htmlFor="usd" hint="$1.00 – $500.00"><input id="usd" inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!valid} /></Field>
            <div className="mt-4" ref={box} aria-label="PayPal checkout buttons" />
            {sdkError && <Notice tone="error" className="mt-3">{sdkError}</Notice>}
          </div>
          <div>{status && <Notice tone={status.tone}>{status.text}</Notice>}</div>
        </div>
      )}
      {history.data?.length > 0 && (
        <div className="mt-6"><p className="mb-2 text-sm font-semibold text-charcoal">Your sandbox payments</p>
          <ul className="divide-y divide-border rounded-xl border border-border">{history.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{p.currency} {p.amount} · <span className="text-[#829087]">{p.orderId}</span></span><span className="flex items-center gap-3"><span className="text-xs text-[#98A19B]">{dateTime(p.createdAt)}</span><StatusBadge value={p.status} /></span></li>))}</ul></div>
      )}
    </Section>
  );
}
