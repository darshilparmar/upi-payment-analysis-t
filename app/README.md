# The shop (Modules 1a & 2)

A Next.js store with a mock UPI checkout, backed by Neon Postgres. It exists so the
lakehouse has a **real operational source**: rows that get UPDATEd in place, an outbox
to stream, and an upstream team (you) who can break things on purpose.

## Run it

```bash
npm install
cp .env.example .env.local          # paste your Neon pooled connection string
npm run db:setup                    # schema + triggers + catalogue + 500 customers
npm run dev                         # http://localhost:3000
```

Buy something. You land on `/pay/<txn_id>`, which shows **PENDING**, then flips to
SUCCESS or FAILED within a few seconds — and shows the outbox events as they're written.

Locally the cron doesn't run, so settle payments yourself:

```bash
curl http://localhost:3000/api/simulate
```

## Deploy

```bash
npx vercel                          # link the project
npx vercel env add DATABASE_URL     # same Neon string
npx vercel --prod
```

`vercel.json` registers a cron that hits `/api/simulate` every minute, so on the
deployed shop payments settle on their own. That's what makes the CDC module work:
data keeps changing while you're not looking.

## Make traffic

```bash
npm run load                                     # 200 orders locally
npm run load -- --url https://your.vercel.app --n 1000 --rps 15
npm run load -- --fraud velocity                 # 20 payments in a minute
npm run load -- --fraud high-value               # new device, large amounts
npm run load -- --fraud structuring              # repeated ₹49,9xx payments
```

The three fraud modes exist so Module 11 has something to catch **live, on camera**.

## The parts that matter downstream

| Thing | Why it's there |
|---|---|
| `payments.updated_at` + trigger | The CDC watermark. Without the trigger the watermark lies and updates go missing. |
| `PENDING → SUCCESS/FAILED → REVERSED` | Mutable facts. A row you already ingested changes hours later. |
| `payment_events` outbox | Reliable publishing — the event and the row change commit together (no dual-write). |
| `ix_payments_updated_at` | The pull must never table-scan production. |
| `is_deleted` on `users` | Soft delete: a hard `DELETE` is invisible to query-based CDC. |
| Real NPCI rates in `src/lib/upi.ts` | Live app data and the 2-year file history stay statistically consistent. |

## Staged incident #1

```bash
npm run alter                       # add settled_via_app + payer_ifsc, backfill
npm run alter -- --undo             # revert
```

Run it between two CDC pulls. Nothing errors. The column just never arrives in bronze.
Module 5 is about detecting that.

## Layout

```
db/schema.sql          the tables, indexes and updated_at triggers
db/seed.sql            product catalogue (categories match the generated history)
src/lib/db.ts          neon client + withTransaction + appendEvent (the outbox writer)
src/lib/upi.ts         real NPCI bank rates, PSP mix, VPA handles, id formats
src/app/api/checkout   creates order + PENDING payment + outbox event, atomically
src/app/api/simulate   the bank: settles PENDING, reverses a few SUCCESSes
src/app/api/payments   status + event history (what the pay page polls)
scripts/load.mjs       traffic generator, incl. three fraud episodes
scripts/staged-alter   incident #1
```
