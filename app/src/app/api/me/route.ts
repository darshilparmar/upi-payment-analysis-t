import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me — the signed-in customer.
 * There is no real auth in the demo shop; the storefront always acts as user 1,
 * the same id the checkout route has been hard-wired to since day one.
 */
const DEMO_USER_ID = 1;

export async function GET() {
  const rows = (await sql`
    SELECT user_id, name, vpa, phone, city, kyc_level
    FROM users WHERE user_id = ${DEMO_USER_ID} AND NOT is_deleted
  `) as any[];
  if (!rows.length) return NextResponse.json({ error: 'no demo user — run npm run db:setup' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
