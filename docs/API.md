# API reference (summary)

Base URL `http://localhost:5000/api`. Auth is a httpOnly cookie set by `POST /auth/login`.
Errors: `{ success:false, message, errors? }`. Money fields are `{ paise: "12050", rupees: 120.5 }` (rupees are display-only); money **inputs** are rupee strings like `"1250.50"`.

## Auth
`POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/password`

## Public
`GET /public/causes`, `/public/causes/:slug`, `/public/ngos`, `/public/ngos/:id`, `/public/impact`, `/public/stories` · `POST /public/contact`

## Donor (`DONOR` only)
| Method & path | Purpose |
|---|---|
| `GET /donor/dashboard` | totals, wallet, trend, cause breakdown, recent activity |
| `GET/PUT /donor/profile`, `GET/PUT /donor/preferences`, `GET /donor/causes` | profile & preferences |
| `GET /donor/ngos[?search&cause&location&impact&favorites&page&limit]`, `GET /donor/ngos/:id` | discovery (verified NGOs only) |
| `POST/DELETE /donor/favorites/:ngoId` | favourites |
| `GET /donor/policy` | current authorization + exact text to confirm |
| `POST /donor/policy/authorize {version,text}` · `/pause` · `/resume` · `/revoke` | authorization lifecycle |
| `GET /donor/wallet` · `POST /donor/wallet/topup {amount,idempotencyKey}` | simulated INR wallet |
| `POST /donor/agent/preview {amount,intent}` | matching + allocation preview (no money moves) |
| `POST /donor/agent/execute {amount,intent,idempotencyKey}` | run the agent; `402` insufficient funds, `403` not authorized, `409` budget/no eligible NGO |
| `GET /donor/agent/executions[/:id]` | activity & step timeline |
| `GET/POST /donor/schedules`, `GET /donor/schedules/events`, `PUT /donor/schedules/:id`, `POST /donor/schedules/:id/{pause,resume,cancel,run-now}` | schedules |
| `GET /donor/ambassador` | referral code, link, stats |
| `GET /donor/grids/{donations,wallet,allocations}` | AG Grid data (+`?format=csv`) |
| `GET /donor/paypal/config`, `POST /donor/paypal/{create-order,capture-order,cancel-order,fail-order}`, `GET /donor/paypal/payments` | PayPal Sandbox (USD) |

## NGO (`NGO` only)
`/ngo/profile`, `/ngo/causes`, `/ngo/initiatives`, `/ngo/verification`, `POST /ngo/verification/submit`, `/ngo/documents/*`, `/ngo/analytics`,
`/ngo/impact-reports` (`GET /:id`, `POST`, `PUT /:id`, `POST /:id/submit`, `DELETE /:id`, `POST /:id/evidence` (multipart `file` or JSON link), `DELETE /:id/evidence/:eid`),
`/ngo/grids/{donations,payouts,impact-reports}`.

## Admin (`ADMIN` only)
`GET /admin/dashboard` · `GET /admin/grids/{users,verifications,donations,payments,audit-logs,executions,impact-reports,enquiries,payouts}` ·
`/admin/ngo-verifications/*` (detail, start-review, document review, decision, secure document download) ·
`PATCH /admin/users/:id/status` · `GET /admin/donations/:id` · `POST /admin/donations/:id/refund` · `POST /admin/wallet/reverse-topup/:entryId` · `POST /admin/wallet/adjust` ·
`GET /admin/agent/executions/:id` · `GET /admin/impact-reports/:id` · `POST /admin/impact-reports/:id/review {decision: REVIEWED|VERIFIED|CORRECTIONS, note}` ·
`PATCH /admin/enquiries/:id` · `PATCH /admin/payouts/:id`.

## Shared (`DONOR`/`NGO`)
`POST/GET /enquiries` · `GET /impact-evidence/:id/download` (owner NGO or admin).

## AG Grid query parameters
`startRow, endRow, sortModel (JSON), filterModel (JSON, AG Grid text/number/date filters), search, format=csv`. Unknown columns in `filterModel`/`sortModel` are ignored; malformed JSON → 400.
