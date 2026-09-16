import { NextResponse } from 'next/server';
import { withTransaction, appendEvent } from '@/lib/db';
import { pickBank, pickApp, newTxnId, newOrderRef, MERCHANT_VPA, MERCHANT_BANK } from '@/lib/upi';

export const dynamic = 'force-dynamic';

type CheckoutBody = {
  userId: number;
  items: { product_id: number; sku: string; qty: number; price_inr: number }[];
  pspApp?: string;
  deviceId?: string;
};

/**
 * POST /api/checkout — the moment a payment is born.
 *
 * One transaction writes three things:
 *   1. the order            (status CREATED)
 *   2. the payment          (status PENDING — NOT the final answer)
 *   3. the outbox event     (txn_initiated)
 *
 * The payment lands PENDING deliberately. In the real UPI flow the PSP has
 * only forwarded the request to NPCI at this point; the bank answers seconds
 * to minutes later. That gap is where the entire mutable-fact problem in
 * Module 8 comes from.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as CheckoutBody;

  if (!body?.items?.length) {
    return NextResponse.json({ error: 'no items' }, { status: 400 });
  }

  const subtotal = body.items.reduce((s, i) => s + i.price_inr * i.qty, 0);
  const itemCount = body.items.reduce((s, i) => s + i.qty, 0);
  const amount = Math.round(subtotal * 100) / 100;

  const txnId = newTxnId();
  const orderRef = newOrderRef();
  const bank = pickBank();
  const app = body.pspApp ? { name: body.pspApp } : pickApp();

  const result = await withTransaction(async (client) => {
    const user = await client.query(
      `SELECT user_id, vpa, city FROM users WHERE user_id = $1 AND NOT is_deleted`,
      [body.userId],
    );
    if (!user.rows.length) throw new Error(`unknown user ${body.userId}`);
    const u = user.rows[0];

    const order = await client.query(
      `INSERT INTO orders (user_id, order_ref, items, item_count, subtotal_inr, amount_inr)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING order_id`,
      [u.user_id, orderRef, JSON.stringify(body.items), itemCount, subtotal, amount],
    );
    const orderId = order.rows[0].order_id;

    await client.query(
      `INSERT INTO payments (order_id, txn_id, payer_vpa, payee_vpa, payer_bank, payee_bank,
                             psp_app, amount_inr, txn_type, status, device_id, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'P2M', 'PENDING', $9, $10)`,
      [orderId, txnId, u.vpa, MERCHANT_VPA, bank.name, MERCHANT_BANK,
       app.name, amount, body.deviceId ?? null, u.city],
    );

    // Same transaction. The event cannot survive a rollback of the payment.
    await appendEvent(client, txnId, 'txn_initiated', {
      txn_id: txnId,
      payer_vpa: u.vpa,
      payee_vpa: MERCHANT_VPA,
      payer_bank: bank.name,
      payee_bank: MERCHANT_BANK,
      psp_app: app.name,
      amount_inr: amount,
      txn_type: 'P2M',
      status: 'PENDING',
      device_id: body.deviceId ?? null,
      city: u.city,
    });

    return { orderId, orderRef };
  });

  return NextResponse.json({
    txn_id: txnId,
    order_ref: result.orderRef,
    amount_inr: amount,
    psp_app: app.name,
    status: 'PENDING',
  });
}
