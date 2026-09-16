import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/payments/UPI2026... — what the status page polls. */
export async function GET(_req: Request, { params }: { params: { txnId: string } }) {
  const rows = (await sql`
    SELECT p.txn_id, p.status, p.failure_reason, p.amount_inr, p.psp_app, p.payer_bank,
           p.payer_vpa, p.payee_vpa, p.initiated_at, p.settled_at, p.updated_at,
           o.order_ref, o.status AS order_status, o.items, o.item_count, o.created_at AS ordered_at
    FROM payments p
    JOIN orders o USING (order_id)
    WHERE p.txn_id = ${params.txnId}
  `) as any[];

  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // The event history for this payment — the outbox, rendered. Showing this on
  // the status page makes the "one row, several versions" idea concrete before
  // anyone has written a line of Spark.
  const events = (await sql`
    SELECT event_id, event_type, payload, occurred_at, published_at
    FROM payment_events WHERE txn_id = ${params.txnId} ORDER BY event_id
  `) as any[];

  // Resolve the order's SKUs to product names for the receipt.
  const row = rows[0];
  const skus: string[] = (row.items ?? []).map((i: any) => i.sku);
  const names = skus.length
    ? ((await sql`SELECT sku, name, category FROM products WHERE sku = ANY(${skus})`) as any[])
    : [];
  const bySku = Object.fromEntries(names.map((n) => [n.sku, n]));
  const items = (row.items ?? []).map((i: any) => ({
    ...i, name: bySku[i.sku]?.name ?? i.sku, category: bySku[i.sku]?.category ?? '',
  }));

  return NextResponse.json({ ...row, items, events });
}
