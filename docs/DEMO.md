# Demo guide

## Exact steps to demonstrate to judges (≈10 min, or ≈3 min with the storyboard below)

Prep: `npx prisma migrate dev && npx prisma db seed`, `npm run dev`, optionally set `GEMINI_API_KEY` and PayPal sandbox keys. Use two browser profiles (donor / admin).

1. **Public site** (`/`): impact stats (labelled demo data), causes, verified NGOs, stories with “Reported by NGO / Admin-reviewed” badges.
2. **Admin** `admin@sevakarma.demo` → *NGO Verification*: open **Jyoti Seva Trust** (pending). Show the checklist/documents view, then *Request corrections* (note required) to show decisions + *Audit logs*.
3. **Donor** `donor@sevakarma.demo` → *Discover NGOs*: filter by cause, open a profile, favourite one.
4. *SevaSphere Agent → Preferences*: preferred Education/Healthcare, excluded Animal Welfare, ₹5,000 budget. *Authorization*: read the exact text, tick agree, **Authorize**.
5. *Wallet & Payments*: **Add funds** (simulated). Click twice quickly to show idempotency (credited once). PayPal Sandbox card (if configured): $10 checkout → server capture → status row; cancel once to show the cancelled state.
6. *SevaSphere Agent → AI matching*: amount ₹1,000, intent “help children go to school” → **Preview**: match scores, reasons, eligibility (Paws & Care excluded: Animal Welfare), allocation split, all checks green. **Let the agent donate** → success; open *Agent activity* to show LangGraph steps & timings.
7. *Donations* (AG Grid): sort, filter, page, **Export CSV**. *Wallet* grid shows `DONATION_HOLD` + `DONATION_DEBIT`.
8. *Schedule* (Bryntum): create a monthly ₹300 schedule; pause/resume; **Run now (demo)**; then on *Authorization* click **Revoke** and run again → fails with “Authorization is not active” and no money moves.
9. **NGO** `udaan@sevakarma.demo`: *Donations* (donor shown as “Anonymous” where chosen), *Analytics*, *Impact Reports* → new report with beneficiaries, fund use, evidence upload, **Submit**.
10. **Admin** → *Impact review*: mark *reviewed* / request corrections / mark independently verified; *Donations* → open one → **Refund**; *Agent monitor*; *Audit logs*; *Users* → suspend an NGO (it disappears from matching immediately).

## 3-minute video storyboard

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:15 | Landing page | “SevaSphere lets donors set rules and an AI agent give within them, to verified NGOs only.” |
| 0:15–0:35 | Admin verification | “NGOs are vetted by admins; every decision is audited.” |
| 0:35–1:00 | Donor preferences + authorization text | “The donor approves exactly what the agent may do.” |
| 1:00–1:20 | Wallet top-up (simulated) + PayPal sandbox checkout | “INR wallet is simulated; PayPal runs in sandbox with USD, kept separate.” |
| 1:20–2:00 | Agent preview → allocation → execute → activity timeline | “Gemini explains, deterministic code decides amounts; the donation commits in one transaction.” |
| 2:00–2:20 | Donations grid + CSV + wallet ledger | “Everything is traceable in AG Grid.” |
| 2:20–2:40 | Bryntum schedule, revoke, run → blocked | “Calendars don’t move money; authorization is re-checked every run.” |
| 2:40–3:00 | NGO impact report → admin review badge | “Reported vs verified impact is always labelled.” |

## Screenshots
Capture the three portals into `docs/screenshots/` (checklist in that folder). They are **not included** — this build was produced without a browser available.

## Known limitations
* **Wallet is simulated**; no real payments, KYC, tax receipts or bank payouts (payout rows are tracked/marked manually by admin).
* **PayPal** needs your sandbox keys; it only creates *separate USD sandbox payments* (optionally tagged to an NGO) — it does not fund the INR wallet by design. Tested against a local PayPal mock, not the live PayPal sandbox.
* **Gemini** paths were tested only through the fallback (no key available in the build environment). Structured-output code follows LangChain's `withStructuredOutput`, validates every id/slug, and falls back safely, but needs a real key to see Gemini wording.
* **Bryntum** uses the **trial** package (watermark/time limits); licence required for production.
* **Scheduler** is a database poller (no BullMQ/Redis). One occurrence runs once via a unique key; for high volume use a queue.
* Months use UTC boundaries; no timezone-per-donor logic.
* No rate limiting, email verification, password reset, or 2FA.
* Migration `20261108090000` was hand-written; run `npx prisma migrate dev` once — if Prisma reports drift it will generate a tiny follow-up migration.
* The browser UI was compiled and linted but **not exercised in a real browser** in the build environment.
