import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT product_id, sku, name, category, price_inr
    FROM products WHERE active ORDER BY category, name
  `;
  return NextResponse.json(rows);
}
