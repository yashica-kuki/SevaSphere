# Architecture

```
React (Vite)  ──/api──▶  Express  ──▶ Prisma ──▶ PostgreSQL
 donor/ngo/admin          │
 AG Grid · Bryntum        ├─ services/agentGraph.js   LangGraph.js workflow
 PayPal JS SDK (USD)      ├─ services/aiService.js    Gemini via LangChain.js (text only)
                          ├─ services/paypalService.js  PayPal Orders v2 (Sandbox)
                          └─ services/scheduleService.js DB-backed scheduler (poller)
```

## Money model
* All INR is **integer paise** (`BigInt`). `utils/money.js` parses rupees from strings with a regex — no floats.
* `WalletAccount.balancePaise` = total, `reservedBalancePaise` = held; available = balance − reserved.
* `WalletLedger` is append-only; every row stores balance/reserved *after* the entry. Tests assert ledger net == balance.
* Wallet row is `SELECT … FOR UPDATE` locked for every mutation, which also serialises a donor's budget checks.

## Agent workflow (LangGraph)
`REQUEST_UNDERSTANDING → NGO_MATCHING → ELIGIBILITY_CHECK → DETERMINISTIC_ALLOCATION → AUTHORIZATION_VALIDATION → DONATION_EXECUTION → EXPLANATION → COMPLETED | FAILED`

| Node | Uses LLM? | What it does |
|---|---|---|
| REQUEST_UNDERSTANDING | Gemini (structured output, validated against real cause slugs; keyword fallback) | free-text intent → cause filter, never wider than the policy |
| NGO_MATCHING | no | loads **verified, active** NGOs from Postgres |
| ELIGIBILITY_CHECK | Gemini writes the *reason text* only | `matchingCore.evaluateNgo` decides eligibility and score (cause 40 / preferences 25 / impact-reporting 20 / capacity+minimum 15) |
| DETERMINISTIC_ALLOCATION | no | `allocationEngine.allocateFunds`: weighted split with largest-remainder rounding, per-NGO caps and minimums, max NGO count |
| AUTHORIZATION_VALIDATION | no | policy ACTIVE, monthly budget, schedule budget, wallet funds, NGO still eligible, idempotency |
| DONATION_EXECUTION | no | one DB transaction (see below); retried only on transient DB errors |
| EXPLANATION | Gemini summarises the already-committed facts | falls back to a template |

Every node writes an `AgentStep` row (input/output/error/duration/attempt). A real run that moves no money ends **FAILED** with the precise reason.
Previews run the same graph in `dryRun` mode and stop before execution.

### Execution transaction (`donationExecutionService`)
1. lock wallet → 2. return the existing donation if the idempotency key was seen → 3. policy still ACTIVE and within per-NGO/min/max-NGO limits → 4. monthly + schedule budget → 5. NGOs still VERIFIED & active (fresh read) → 6. available funds → 7. create donation, `DONATION_HOLD` + `DONATION_DEBIT` ledger rows, allocations, `NGOPayout(REQUESTED)`, audit log → commit.
Success is reported only after commit.

## Authorization
`AllocationPolicy` is the authorized **snapshot**. Preferences on `DonorProfile` are editable drafts. The donor confirms the exact server-generated text (version + text must match, else 409). Editing preferences does not widen what the agent may do until the donor re-confirms. Pause/revoke take effect on the next execution check, including scheduled runs.

## Scheduling
Bryntum is a *view* over `DonationSchedule` + `ScheduleRun` rows (projected future occurrences are computed server-side). PostgreSQL is the source of truth. `scheduleService.processDueSchedules` (every 30 s, `SCHEDULER_INTERVAL_MS`) selects due active schedules; a unique `ScheduleRun.idempotencyKey` (`schedule:<id>:<occurrence>`) guarantees one run per occurrence even with several API instances. BullMQ/Redis was not used (not required; avoids an extra service for the demo) — swapping the poller for BullMQ only touches `startScheduler`.

## AG Grid
`gridService.createGridHandler` turns AG Grid's infinite-row-model requests (`startRow/endRow/sortModel/filterModel`, plus `search`) into Prisma queries over a **whitelist** of columns, applies a role-specific `base(req)` scope (e.g. `donorId = caller`), supports `format=csv` (formula-injection-safe), and caps page size.

## Public data
Public endpoints omit `reviewNote`, `registrationNumber`, `userId`, drafts and unreviewed internals; only `SUBMITTED`/`REVIEWED` impact reports are shown, each with its verification level.

## Security notes
httpOnly JWT cookie; bcrypt; role from DB; suspended users are rejected even with a valid token; Zod validation; helmet; private uploads served only through authenticated, ownership-checked routes with MIME allow-lists and random file names; CSV export neutralises formulas; AI inputs are length-limited, treated as data, and all AI outputs are validated against database ids/slugs.
