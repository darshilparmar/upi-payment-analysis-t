#!/usr/bin/env node
/**
 * 🔥 Staged incident #1 — the ALTER TABLE (Module 5).
 *
 * You are the upstream team. Product wants to know which UPI app *actually*
 * completed the payment (the user can switch apps at the collect screen), so
 * you add a column. It's a two-minute change, it's backwards compatible, it
 * breaks nobody's code — and the data pipeline silently drops it, because the
 * CDC query selects an explicit column list and nobody told the data team.
 *
 *   npm run alter            # add settled_via_app + payer_ifsc, backfill
 *   npm run alter -- --undo  # put it back
 *
 * Run this between two CDC pulls, then look at bronze: the new column isn't
 * there, and nothing anywhere failed. That silence is the lesson.
 */
import dotenv from 'dotenv';
// Next.js reads .env.local; plain node scripts do not — load it explicitly, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and paste your Neon connection string.');
  process.exit(1);
}
import pg from 'pg';

const UNDO = process.argv.includes('--undo');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

if (UNDO) {
  await client.query(`ALTER TABLE payments DROP COLUMN IF EXISTS settled_via_app`);
  await client.query(`ALTER TABLE payments DROP COLUMN IF EXISTS payer_ifsc`);
  console.log('reverted: settled_via_app and payer_ifsc dropped');
} else {
  await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS settled_via_app TEXT`);
  await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_ifsc TEXT`);

  // Backfill so the column has meaning immediately — and note the UPDATE
  // touches every row, which bumps updated_at, which means the next CDC pull
  // re-reads the whole table. That is its own small lesson about watermarks.
  const res = await client.query(`
    UPDATE payments
       SET settled_via_app = psp_app,
           payer_ifsc = upper(left(regexp_replace(payer_bank, '[^A-Za-z]', '', 'g'), 4)) || '0' ||
                        lpad((payment_id % 100000)::text, 6, '0')
     WHERE settled_via_app IS NULL`);
  console.log(`added settled_via_app + payer_ifsc, backfilled ${res.rowCount} rows`);
  console.log('now run the CDC pull and diff the bronze schema. It will not complain.');
}

await client.end();
