import { NextResponse } from 'next/server';
import { settlePending, reverseSome } from '@/lib/simulator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET|POST /api/simulate — one full sweep of the bank simulator.
 *
 * Who hits this:
 *   - vercel.json cron, once a day (Vercel's Hobby plan allows nothing faster)
 *   - .github/workflows/simulate.yml, every 5 minutes (the real periodic driver)
 *   - scripts/load.mjs, after it finishes placing orders
 *   - you, with curl, when running locally
 *
 * The status page settles its own payment on poll (see /api/payments/[txnId]),
 * so a customer never waits on any of the above. This sweep exists for the
 * rows nobody is looking at — and for the reversals, which have to arrive
 * "later" to be interesting downstream.
 */
export async function GET() {
  const settled = await settlePending();
  const reversed = await reverseSome();
  return NextResponse.json({ settled, reversed, at: new Date().toISOString() });
}

export const POST = GET;
