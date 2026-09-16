import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await sql`
      SELECT product_id, sku, name, category, price_inr
      FROM products WHERE active ORDER BY category, name
    `;
    return NextResponse.json(rows);
  } catch (err: any) {
    // Surface the real reason (missing DATABASE_URL, unreachable Neon, missing
    // table) as JSON so the storefront can show it instead of a blank grid.
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
