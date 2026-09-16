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

Add a few things to the cart, go to **Checkout**, pick a UPI app and pay. You land on
`/pay/<txn_id>`, which shows **Approve in PhonePe…**, then flips to *Payment successful*
or *Payment failed* within a few seconds. The **Timeline** on that page is the outbox,
rendered; the collapsed **Developer view** underneath shows the raw `payment_events` rows.
**My orders** (`/orders`) lists everything the demo customer (user 1) has bought.

The storefront is built to look like a real Indian commerce app — hero, category chips,
product cards with ratings/MRP, a slide-out cart, a two-step checkout with UPI app
selection — because the point of the data downstream is that it came from something that
looks like production.

The payment you're watching settles by itself (the status poll triggers the bank
after 5 s). Anything you're *not* watching — load traffic, reversals — needs a sweep,
which locally you run by hand:

```bash
curl http://localhost:3000/api/simulate
```

## Deploy

```bash
npx vercel                          # link the project
npx vercel env add DATABASE_URL     # same Neon string
npx vercel --prod
```

### Keeping payments moving on the deployed shop

Three things drive the bank simulator, so data keeps changing while you're not
looking — which is what makes the CDC module work:

1. **The status page settles its own payment.** `/api/payments/<txn>` calls the
   simulator for that one row once it is 5 s old, so the on-camera
   PENDING → SUCCESS flip never depends on a cron.
2. **A GitHub Actions schedule** (`.github/workflows/simulate.yml`) hits
   `/api/simulate` every 5 minutes. Set a repository variable `SHOP_URL` to your
   Vercel URL (Settings → Secrets and variables → Actions → Variables) to turn it on.
   This is what settles load-generated traffic and produces the late REVERSALs.
3. **`vercel.json` cron, once a day** — Vercel's Hobby plan rejects anything more
   frequent (`* * * * *` fails the deploy). It's only a backstop.

`npm run load` also calls `/api/simulate` once when it finishes.

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
src/lib/catalog.ts     presentation metadata (tiles, ratings, MRP) derived from the SKU
src/lib/shop.tsx       cart + customer context, persisted in localStorage
src/components/        navbar, cart drawer, product card, UPI app badges, footer
src/app/page.tsx       the storefront
src/app/checkout       address + UPI app picker + order summary → POST /api/checkout
src/app/pay/[txnId]    payment result screen, timeline, developer view of the outbox
src/app/orders         order history for the demo customer
src/app/api/checkout   creates order + PENDING payment + outbox event, atomically
src/app/api/simulate   the bank: settles PENDING, reverses a few SUCCESSes
src/app/api/payments   status + event history + items (what the pay page polls)
src/app/api/orders     order history (?userId=1)
src/app/api/me         the signed-in demo customer (always user 1)
scripts/load.mjs       traffic generator, incl. three fraud episodes
scripts/staged-alter   incident #1
```
