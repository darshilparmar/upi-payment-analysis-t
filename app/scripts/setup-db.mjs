#!/usr/bin/env node
/**
 * Create the schema, seed the catalogue, and make some customers.
 *
 *   npm run db:setup           # create + seed (safe to re-run)
 *   npm run db:reset           # drop everything first
 */
import dotenv from 'dotenv';
// Next.js reads .env.local; plain node scripts do not — load it explicitly, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and paste your Neon connection string.');
  process.exit(1);
}
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DROP = process.argv.includes('--drop');
const N_USERS = Number(process.env.SEED_USERS ?? 500);

const FIRST = ['aarav','vivaan','aditya','arjun','sai','ishaan','rohan','kabir','ananya','diya',
  'aadhya','myra','sara','priya','riya','kavya','rahul','amit','sneha','pooja','vikram','neha',
  'suresh','deepak','manish','kiran','anil','sunita','rakesh','meena'];
const HANDLES = ['ybl','okhdfcbank','okaxis','oksbi','paytm','apl','upi','waaxis','axisb','ibl'];
const CITIES = ['Bengaluru','Mumbai','Delhi','Hyderabad','Pune','Chennai','Kolkata','Ahmedabad',
  'Jaipur','Lucknow','Surat','Indore','Patna','Bhopal','Nagpur','Kochi'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

if (DROP) {
  console.log('dropping tables…');
  await client.query(`DROP TABLE IF EXISTS payment_events, payments, orders, products, users CASCADE`);
}

console.log('applying schema…');
await client.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));

console.log('seeding catalogue…');
await client.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8'));

const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM users');
if (count < N_USERS) {
  console.log(`seeding ${N_USERS - count} users…`);
  const values = [];
  const params = [];
  for (let i = count; i < N_USERS; i++) {
    const name = pick(FIRST);
    const vpa = `${name}${1000 + i}@${pick(HANDLES)}`;
    const base = params.length;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    params.push(
      name[0].toUpperCase() + name.slice(1),
      vpa,
      `9${String(Math.floor(100000000 + Math.random() * 899999999))}`,
      pick(CITIES),
      Math.random() < 0.7 ? 'FULL' : 'MIN',
    );
  }
  await client.query(
    `INSERT INTO users (name, vpa, phone, city, kyc_level) VALUES ${values.join(',')}
     ON CONFLICT (vpa) DO NOTHING`,
    params,
  );
}

const summary = await client.query(`
  SELECT 'users' t, count(*) n FROM users
  UNION ALL SELECT 'products', count(*) FROM products
  UNION ALL SELECT 'orders', count(*) FROM orders
  UNION ALL SELECT 'payments', count(*) FROM payments
  UNION ALL SELECT 'payment_events', count(*) FROM payment_events
  ORDER BY 1`);
console.table(summary.rows);

await client.end();
console.log('done. `npm run dev` → http://localhost:3000');
