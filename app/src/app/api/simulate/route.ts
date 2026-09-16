import { NextResponse } from 'next/server';
import { withTransaction, appendEvent, sql } from '@/lib/db';
import { BANKS, resolveOutcome, REVERSAL_RATE } from '@/lib/upi';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * The payment simulator — stands in for NPCI and the banks.
 *
 * Runs on a Vercel cron every minute (see vercel.json) and does two passes:
 *
 *   Pass 1 · settle   PENDING → SUCCESS / FAILED, using the payer bank's real
 *                     NPCI approval rate. Only payments older than a few
 *                     seconds, so the status page genuinely shows PENDING first.
 *
 *   Pass 2 · reverse  a small share of already-SUCCESS payments → REVERSED,
 *                     minutes to hours later. This is the one that hurts
 *                     downstream: a row you already ingested, already
 *                     aggregated, already put on a dashboard, changes.
 *
 * Both passes UPDATE in place and append to the outbox in the same transaction.
 */
export async function GET() {
  const settled = await settlePending();
  const reversed = await reverseSome();
  return NextResponse.json({ settled, reversed, at: new Date().toISOString() });
}

export const POST = GET;

async function settlePending(limit = 50) {
  const rows = (await sql`
    SELECT payment_id, txn_id, order_id, payer_bank, amount_inr
    FROM payments
    WHERE status = 'PENDING'
      AND initiated_at < now() - interval '5 seconds'
    ORDER BY initiated_at
    LIMIT ${limit}
  `) as any[];

  let n = 0;
  for (const p of rows) {
    const bank = BANKS.find((b) => b.name === p.payer_bank) ?? BANKS[0];
    const { status, failureReason } = resolveOutcome(bank);

    await withTransaction(async (client) => {
      // Guarded by `status = 'PENDING'`: if two cron ticks overlap, the second
      // one updates zero rows instead of double-settling the payment.
      const upd = await client.query(
        `UPDATE payments
            SET status = $1, failure_reason = $2, settled_at = now()
          WHERE payment_id = $3 AND status = 'PENDING'
        RETURNING txn_id`,
        [status, failureReason, p.payment_id],
      );
      if (!upd.rowCount) return;

      await client.query(
        `UPDATE orders SET status = $1 WHERE order_id = $2`,
        [status === 'SUCCESS' ? 'PAID' : 'PAYMENT_FAILED', p.order_id],
      );

      await appendEvent(client, p.txn_id, 'txn_status_update', {
        txn_id: p.txn_id,
        new_status: status,
        failure_reason: failureReason,
        update_source: 'BANK_CALLBACK',
      });
      n++;
    });
  }
  return n;
}

async function reverseSome(limit = 20) {
  // Candidates: successful payments settled at least a minute ago and not yet reversed.
  const rows = (await sql`
    SELECT payment_id, txn_id, order_id
    FROM payments
    WHERE status = 'SUCCESS'
      AND settled_at < now() - interval '1 minute'
      AND settled_at > now() - interval '2 days'
    ORDER BY random()
    LIMIT ${limit}
  `) as any[];

  let n = 0;
  for (const p of rows) {
    if (Math.random() > REVERSAL_RATE) continue;

    await withTransaction(async (client) => {
      const upd = await client.query(
        `UPDATE payments SET status = 'REVERSED', failure_reason = 'UDIR_REVERSAL'
          WHERE payment_id = $1 AND status = 'SUCCESS' RETURNING txn_id`,
        [p.payment_id],
      );
      if (!upd.rowCount) return;

      await client.query(`UPDATE orders SET status = 'REFUNDED' WHERE order_id = $1`, [p.order_id]);

      await appendEvent(client, p.txn_id, 'txn_status_update', {
        txn_id: p.txn_id,
        new_status: 'REVERSED',
        update_source: 'NPCI_UDIR',
      });
      n++;
    });
  }
  return n;
}
