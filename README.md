# SevaSphere — AI-assisted, donor-controlled giving

SevaSphere lets donors authorize an AI-assisted agent to give to **verified NGOs** within limits the donor sets.
Three portals (Donor, NGO, Admin) share one PostgreSQL database.

> **Prototype notice.** The INR wallet is **simulated** (no real money). PayPal runs in **Sandbox** with **USD** and is
> deliberately separate from the INR wallet — nothing is converted. Impact figures are labelled
> *Reported by NGO* until an admin reviews or verifies them. Seed data is demo data.

## How the money is kept safe

| Rule | Where it is enforced |
|---|---|
| The LLM never changes balances, runs SQL, approves transactions or picks amounts | `services/aiService.js` only returns text/slugs; `services/allocationEngine.js` and `services/donationExecutionService.js` are plain JavaScript using BigInt paise |
| Eligibility is deterministic (verified + active NGO, causes, exclusions, minimums) | `services/matchingCore.js` |
| One transaction moves money; re-checks authorization, budget, NGO status and funds inside it | `donationExecutionService.executeAllocation` (row-locks the wallet) |
| Duplicate / concurrent requests move money once | idempotency keys on donations, ledger rows, executions, schedule runs |
| Wallet ledger is append-only, signed by type | `WalletLedger` (`TOPUP`, `DONATION_HOLD`, `DONATION_DEBIT`, `REFUND`, `REVERSAL`, `ADJUSTMENT`) |
| Roles come from the database, never the request body | `middleware/authMiddleware.js`, register schema rejects `ADMIN` |

## Stack

React 18 + Vite + Tailwind · TanStack Query · Axios · Recharts · **AG Grid Community** (infinite row model, server-side sort/filter/pagination) ·
**Bryntum Scheduler** (React wrapper, *trial* package) · Node/Express · PostgreSQL + Prisma · Zod ·
Gemini via **LangChain.js** · **LangGraph.js** · PayPal Orders v2 (Sandbox) · JWT in httpOnly cookie + bcrypt.

(JavaScript throughout, per your revised brief.)

## Quick start

Prerequisites: Node 20+, PostgreSQL 14+.

```bash
npm run install:all                 # root + client + server
cp server/.env.example server/.env  # then edit DATABASE_URL and JWT_SECRET
createdb sevakarma                  # or create the DB in pgAdmin

cd server
npx prisma migrate dev              # applies all migrations (incl. 20261108090000_phases_5_to_12)
npx prisma db seed                  # demo users, NGOs, and two real agent-made donations
cd ..
npm run dev                         # API on :5000, web on :5173
```

Open http://localhost:5173.

### Demo credentials (seed data only)

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@sevakarma.demo` | `Admin@12345` | |
| Donor | `donor@sevakarma.demo` | `Donor@12345` | preferences set, ₹10,000 wallet, **not yet authorized** (walk through authorization live) |
| Donor 2 | `donor2@sevakarma.demo` | `Donor@12345` | already authorized, anonymous, has 2 donations |
| NGOs | `ngo@`, `udaan@`, `swasthya@`, `greenearth@`, `annapurna@`, `paws@` `sevakarma.demo` | `NGO@12345` | all verified |
| Pending NGO | `ngo.pending@sevakarma.demo` | `NGO@12345` | awaiting admin verification |

Change these before any real deployment.

### Optional integrations

* **Gemini** — set `GEMINI_API_KEY`. Without it the agent uses deterministic fallbacks (keyword intent + templated reasons) and the UI says "Gemini unavailable".
* **PayPal Sandbox** — create a REST app at developer.paypal.com, put the sandbox client id/secret in `server/.env`, restart. Pay with a *sandbox buyer* account. Without keys the UI shows a clear "not configured" notice (no fake button).
* **Bryntum** — `@bryntum/scheduler` is aliased to the **trial** package from public npm (shows a trial banner/limits). For production, buy a licence and change the alias in `client/package.json`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API + web together |
| `npm test --prefix server` | 46 backend tests (unit, integration, contract) against your DB — creates throw-away users |
| `npm run lint --prefix server` / `--prefix client` | ESLint |
| `npm run build --prefix client` | production build |
| `npx prisma studio` (in `server/`) | browse the DB |

Tests start their own API on port 5056 and a local PayPal mock on 5099; set `SCHEDULER_ENABLED=false` is handled for you.

## Project layout

```
client/src
  components/grid/ServerGrid.jsx     reusable AG Grid wrapper (infinite row model → backend)
  components/portal/                 shared shell, UI kit, PayPal Sandbox widget
  pages/{donor,ngo,admin}/           portal pages · pages/*.jsx public site
server/src
  services/   walletService · allocationEngine · matchingCore · aiService · agentGraph (LangGraph)
              donationExecutionService · policyService · scheduleService · paypalService · gridService
  controllers/ routes/ middleware/ utils/
server/prisma  schema.prisma · migrations/ · seed.js
server/tests   unit + integration + contract tests
docs/          API.md · ARCHITECTURE.md · DEMO.md · screenshots/
```

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/API.md](docs/API.md) · [docs/DEMO.md](docs/DEMO.md)

## Publishing to GitHub

```bash
git init && git add -A && git status    # confirm no .env, node_modules, dist or server/private_uploads are listed
git commit -m "SevaKarma prototype"
git branch -M main
git remote add origin https://github.com/<you>/sevakarma.git
git push -u origin main
```

Never commit `server/.env`. If a real key was ever pasted into a committed file, rotate it.

## Known limitations

See the end of [docs/DEMO.md](docs/DEMO.md#known-limitations).

## License

MIT for this repository (see `LICENSE`). Bryntum trial package is under Bryntum's terms.
