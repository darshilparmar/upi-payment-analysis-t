/**
 * The payment simulator — stands in for NPCI and the banks.
 *
 * Two passes:
 *
 *   settle    PENDING → SUCCESS / FAILED, using the payer bank's real NPCI
 *             approval rate. Only payments older than a few seconds, so the
 *             status page genuinely shows PENDING first.
 *
 *   reverse   a small share of already-SUCCESS payments → REVERSED, minutes to
 *             hours later. This is the one that hurts downstream: a row you
 *             already ingested, already aggregated, already put on a
 *             dashboard, changes.
 *
 * Both UPDATE in place and append to the outbox in the same transaction.
 *
 * Who calls this:
 *   - /api/simulate            a full sweep (cron, GitHub Actions, curl, load script)
 *   - /api/payments/[txnId]    settles just the payment being polled, once it is
 *                              old enough — so the on-screen flow never depends
 *                              on a cron, which Vercel's Hobby plan limits to daily.
 */
import { withTransaction, appendEvent, sql } from './db';
import { BANKS, resolveOutcome, REVERSAL_RATE } from './upi';

export const SETTLE_AFTER_SECONDS = 5;

type PendingRow = { payment_id: number; txn_id: string; order_id: number; payer_bank: string };

async function settleRow(p: PendingRow): Promise<boolean> {
  const bank = BANKS.find((b) => b.name === p.payer_bank) ?? BANKS[0];
  const { status, failureReason } = resolveOutcome(bank);

  return withTransaction(async (client) => {
    // Guarded by `status = 'PENDING'`: if two callers overlap (cron + status
    // poll), the second one updates zero rows instead of double-settling.
    const upd = await client.query(
      `UPDATE payments
          SET status = $1, failure_reason = $2, settled_at = now()
        WHERE payment_id = $3 AND status = 'PENDING'
      RETURNING txn_id`,
      [status, failureReason, p.payment_id],
    );
    if (!upd.rowCount) return false;

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
    return true;
  });
}

/** Settle every PENDING payment that is old enough. Returns how many changed. */
export async function settlePending(limit = 50): Promise<number> {
  const rows = (await sql`
    SELECT payment_id, txn_id, order_id, payer_bank
    FROM payments
    WHERE status = 'PENDING'
      AND initiated_at < now() - make_interval(secs => ${SETTLE_AFTER_SECONDS})
    ORDER BY initiated_at
    LIMIT ${limit}
  `) as PendingRow[];

  let n = 0;
  for (const p of rows) if (await settleRow(p)) n++;
  return n;
}

/** Settle one specific payment if it is PENDING and old enough. */
export async function settleOne(txnId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT payment_id, txn_id, order_id, payer_bank
    FROM payments
    WHERE txn_id = ${txnId}
      AND status = 'PENDING'
      AND initiated_at < now() - make_interval(secs => ${SETTLE_AFTER_SECONDS})
  `) as PendingRow[];
  return rows.length ? settleRow(rows[0]) : false;
}

/** Reverse a random few SUCCESS payments settled at least a minute ago. */
export async function reverseSome(limit = 20): Promise<number> {
  const rows = (await sql`
    SELECT payment_id, txn_id, order_id
    FROM payments
    WHERE status = 'SUCCESS'
      AND settled_at < now() - interval '1 minute'
      AND settled_at > now() - interval '2 days'
    ORDER BY random()
    LIMIT ${limit}
  `) as { payment_id: number; txn_id: string; order_id: number }[];

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
