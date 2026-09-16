import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/orders?userId=1 — the customer's order history, newest first. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get('userId') ?? 1);
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 30));

  const rows = (await sql`
    SELECT o.order_id, o.order_ref, o.items, o.item_count, o.amount_inr, o.status AS order_status,
           o.created_at,
           p.txn_id, p.status AS payment_status, p.failure_reason, p.psp_app, p.settled_at
    FROM orders o
    LEFT JOIN payments p USING (order_id)
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `) as any[];

  // Resolve SKUs to names so the list can show what was bought.
  const skus = Array.from(new Set(rows.flatMap((r) => (r.items ?? []).map((i: any) => i.sku))));
  const names = skus.length
    ? ((await sql`SELECT sku, name, category FROM products WHERE sku = ANY(${skus})`) as any[])
    : [];
  const bySku = Object.fromEntries(names.map((n) => [n.sku, n]));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      items: (r.items ?? []).map((i: any) => ({ ...i, name: bySku[i.sku]?.name ?? i.sku, category: bySku[i.sku]?.category ?? '' })),
    })),
  );
}
