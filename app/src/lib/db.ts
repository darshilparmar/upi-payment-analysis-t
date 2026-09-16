import { neon, Pool } from '@neondatabase/serverless';

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env.local and paste your Neon connection string');
  }
  return url;
}

/**
 * `sql` is the HTTP (one-shot) client — fastest for single statements.
 * Use `withTransaction` when a write must be atomic, which for us means:
 * every payment UPDATE and its outbox INSERT go in together, or neither does.
 *
 * Resolved lazily so `next build` doesn't need a database.
 */
export const sql: ReturnType<typeof neon> = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  neon(connectionString())(strings, ...values)) as ReturnType<typeof neon>;

export async function withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Append to the outbox. Always called inside the same transaction as the row
 * change it describes — that is the entire point of the pattern.
 *
 * The alternative ("UPDATE the row, then publish to the queue") is the
 * dual-write problem: the process can die between the two, and you get a row
 * with no event or an event with no row. Neither is recoverable.
 */
export async function appendEvent(
  client: any,
  txnId: string,
  eventType: 'txn_initiated' | 'txn_status_update',
  payload: Record<string, unknown>,
) {
  await client.query(
    `INSERT INTO payment_events (txn_id, event_type, payload) VALUES ($1, $2, $3)`,
    [txnId, eventType, JSON.stringify(payload)],
  );
}
