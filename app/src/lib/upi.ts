/**
 * UPI reference data — copied from the real NPCI August-2021 tables in
 * data/upi-raw-npci/. Because the app's failure rates and PSP mix come from the
 * same numbers the generator was calibrated on, live app data and the two years
 * of file history are statistically consistent: a gold mart can aggregate both
 * and the reconciliation in Module 9 still balances.
 */

export type Bank = {
  name: string;
  /** NPCI "Approved %" for August 2021 — the share of attempts that succeed */
  approvedPct: number;
  /** NPCI "BD %" — business decline: insufficient funds, limits, blocked account */
  businessDeclinePct: number;
  /** NPCI "TD %" — technical decline: timeouts, switch errors */
  technicalDeclinePct: number;
};

/** Top remitter banks, real Aug-2021 rates (remitter_banks/aug_21.csv). */
export const BANKS: Bank[] = [
  { name: 'State Bank Of India',   approvedPct: 90.6, businessDeclinePct: 6.73, technicalDeclinePct: 2.66 },
  { name: 'HDFC BANK LTD',         approvedPct: 95.0, businessDeclinePct: 4.71, technicalDeclinePct: 0.28 },
  { name: 'Axis Bank Ltd.',        approvedPct: 95.92, businessDeclinePct: 3.62, technicalDeclinePct: 0.46 },
  { name: 'Bank of Baroda',        approvedPct: 92.58, businessDeclinePct: 7.21, technicalDeclinePct: 0.21 },
  { name: 'ICICI Bank',            approvedPct: 94.79, businessDeclinePct: 5.13, technicalDeclinePct: 0.08 },
  { name: 'Paytm Payments Bank',   approvedPct: 95.07, businessDeclinePct: 4.74, technicalDeclinePct: 0.19 },
  { name: 'Punjab National Bank',  approvedPct: 86.19, businessDeclinePct: 8.30, technicalDeclinePct: 5.51 },
  { name: 'Union Bank of India',   approvedPct: 89.69, businessDeclinePct: 8.26, technicalDeclinePct: 2.05 },
  { name: 'Canara Bank',           approvedPct: 91.40, businessDeclinePct: 7.95, technicalDeclinePct: 0.66 },
  { name: 'Bank of India',         approvedPct: 94.42, businessDeclinePct: 4.82, technicalDeclinePct: 0.76 },
];

/**
 * PSP apps with their real market share and the VPA handles each issues.
 * PhonePe really is ~45% of UPI volume — that single fact is what makes every
 * `GROUP BY psp_app` in this project skewed, and Module 17 is about the
 * consequences.
 */
export const PSP_APPS = [
  { name: 'PhonePe',      sharePct: 45.0, handles: ['ybl', 'ibl', 'axl'] },
  { name: 'Google Pay',   sharePct: 34.0, handles: ['okhdfcbank', 'okaxis', 'oksbi', 'okicici'] },
  { name: 'Paytm',        sharePct: 13.0, handles: ['paytm'] },
  { name: 'Amazon Pay',   sharePct: 2.0,  handles: ['apl', 'yapl'] },
  { name: 'BHIM',         sharePct: 2.0,  handles: ['upi'] },
  { name: 'WhatsApp',     sharePct: 1.0,  handles: ['waaxis', 'wahdfcbank'] },
  { name: 'Airtel Payments Bank', sharePct: 1.0, handles: ['airtel'] },
  { name: 'Others',       sharePct: 2.0,  handles: ['axisb', 'hdfcbank'] },
];

export const BUSINESS_DECLINE_REASONS = [
  'INSUFFICIENT_FUNDS', 'EXCEEDS_LIMIT', 'INVALID_VPA', 'ACCOUNT_BLOCKED', 'COLLECT_EXPIRED',
];
export const TECHNICAL_DECLINE_REASONS = [
  'BANK_TIMEOUT', 'SWITCH_ERROR', 'PSP_UNAVAILABLE', 'DEBIT_TIMEOUT', 'NETWORK_ERROR',
];

/** ~0.3% of settled SUCCESS payments are later reversed (NPCI UDIR / chargeback). */
export const REVERSAL_RATE = 0.04;   // of the payments the simulator revisits

export function pickWeighted<T>(items: T[], weight: (t: T) => number, rnd = Math.random()): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let acc = 0;
  const target = rnd * total;
  for (const item of items) {
    acc += weight(item);
    if (acc >= target) return item;
  }
  return items[items.length - 1];
}

export function pickBank(rnd = Math.random()): Bank {
  return BANKS[Math.floor(rnd * BANKS.length)];
}

export function pickApp(rnd = Math.random()) {
  return pickWeighted(PSP_APPS, (a) => a.sharePct, rnd);
}

/**
 * Decide a payment's fate using the payer bank's real NPCI rates.
 * Returns the terminal status the simulator will flip the row to.
 */
export function resolveOutcome(bank: Bank): { status: 'SUCCESS' | 'FAILED'; failureReason: string | null } {
  const r = Math.random() * 100;
  if (r < bank.approvedPct) return { status: 'SUCCESS', failureReason: null };
  if (r < bank.approvedPct + bank.businessDeclinePct) {
    return { status: 'FAILED', failureReason: pick(BUSINESS_DECLINE_REASONS) };
  }
  return { status: 'FAILED', failureReason: pick(TECHNICAL_DECLINE_REASONS) };
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** UPI<yyyymm><12 digits> — the same shape as the generated history files. */
export function newTxnId(now = new Date()): string {
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
  return `UPI${ym}${rand}`;
}

export function newOrderRef(now = new Date()): string {
  const d = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  return `ORD-${d}-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
}

/** The shop's own merchant VPA — the payee on every P2M transaction. */
export const MERCHANT_VPA = 'upishop@ybl';
export const MERCHANT_BANK = 'Axis Bank Ltd.';
