#!/usr/bin/env node
/**
 * Traffic generator — the filming asset.
 *
 * Produces orders against the deployed shop so there is always fresh data for
 * the CDC pull to find. Everything goes through the real /api/checkout route,
 * so the rows, the outbox events and the status lifecycle are identical to a
 * human clicking Pay.
 *
 *   npm run load                                  # 200 orders at localhost
 *   npm run load -- --n 2000 --rps 20             # a busier shop
 *   npm run load -- --url https://your.vercel.app --n 500
 *   npm run load -- --fraud velocity              # trigger a fraud rule on camera
 *
 * Fraud modes (Module 11 catches these):
 *   velocity   20 payments from one user inside a minute
 *   high-value 3 large payments from a brand-new device id
 *   structuring 8 payments just under ₹50,000
 */
import dotenv from 'dotenv';
// Next.js reads .env.local; plain node scripts do not — load it explicitly, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and paste your Neon connection string.');
  process.exit(1);
}

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const URL_BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '');
const N = Number(arg('n', 200));
const RPS = Number(arg('rps', 8));
const FRAUD = arg('fraud', null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const APPS = ['PhonePe', 'PhonePe', 'PhonePe', 'Google Pay', 'Google Pay', 'Paytm', 'Amazon Pay', 'BHIM'];

const products = await fetch(`${URL_BASE}/api/products`).then((r) => r.json());
if (!Array.isArray(products) || !products.length) {
  console.error(`no products at ${URL_BASE}/api/products — did you run db:setup?`);
  process.exit(1);
}

let sent = 0, failed = 0;
const started = Date.now();

async function checkout(items, opts = {}) {
  try {
    const res = await fetch(`${URL_BASE}/api/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: opts.userId ?? 1 + Math.floor(Math.random() * 500),
        items,
        pspApp: opts.pspApp ?? pick(APPS),
        deviceId: opts.deviceId ?? `DVC${Math.floor(1e9 + Math.random() * 9e9)}`,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    sent++;
  } catch (e) {
    failed++;
    if (failed < 4) console.error('  ✗', String(e).slice(0, 140));
  }
}

function basket() {
  const n = 1 + Math.floor(Math.random() * 3);
  return Array.from({ length: n }, () => {
    const p = pick(products);
    return { product_id: p.product_id, sku: p.sku, qty: 1 + Math.floor(Math.random() * 2), price_inr: Number(p.price_inr) };
  });
}

if (FRAUD) {
  const userId = 1 + Math.floor(Math.random() * 200);
  const deviceId = `DVC${Math.floor(1e9 + Math.random() * 9e9)}`;
  console.log(`staging a "${FRAUD}" episode — user ${userId}, device ${deviceId}`);

  if (FRAUD === 'velocity') {
    // 20 payments in well under a minute → the velocity rule (>10 in 5 min).
    for (let i = 0; i < 20; i++) { await checkout(basket(), { userId, deviceId }); await sleep(400); }
  } else if (FRAUD === 'high-value') {
    // A device the platform has never seen, spending big → new-device-high-value.
    const dear = products.slice().sort((a, b) => Number(b.price_inr) - Number(a.price_inr))[0];
    for (let i = 0; i < 3; i++) {
      await checkout([{ product_id: dear.product_id, sku: dear.sku, qty: 20, price_inr: Number(dear.price_inr) }],
        { userId, deviceId });
      await sleep(2000);
    }
  } else if (FRAUD === 'structuring') {
    // Repeatedly just under the ₹50,000 reporting threshold.
    const dear = products.slice().sort((a, b) => Number(b.price_inr) - Number(a.price_inr))[0];
    const qty = Math.floor(49500 / Number(dear.price_inr));
    for (let i = 0; i < 8; i++) {
      await checkout([{ product_id: dear.product_id, sku: dear.sku, qty, price_inr: Number(dear.price_inr) }],
        { userId, deviceId });
      await sleep(1500);
    }
  } else {
    console.error(`unknown fraud mode "${FRAUD}" — use velocity | high-value | structuring`);
    process.exit(1);
  }
} else {
  console.log(`sending ${N} orders to ${URL_BASE} at ~${RPS}/s`);
  const gap = 1000 / RPS;
  for (let i = 0; i < N; i++) {
    checkout(basket());                       // fire and forget — keeps the rate honest
    if (i % 50 === 49) process.stdout.write(`  ${i + 1}/${N}\r`);
    await sleep(gap);
  }
  await sleep(2000);                          // let the last few land
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${sent} orders placed, ${failed} failed, in ${secs}s`);
console.log('the simulator settles them within a minute — watch payments.status change');
