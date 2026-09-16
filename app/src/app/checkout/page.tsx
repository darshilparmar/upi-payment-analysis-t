'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop, deviceId } from '@/lib/shop';
import { inr, metaFor, FREE_DELIVERY_ABOVE, DELIVERY_FEE } from '@/lib/catalog';
import { Tile } from '@/components/ProductCard';
import { UpiLogo, upiHandle } from '@/components/UpiLogo';
import { Icon } from '@/components/icons';

const APPS = ['PhonePe', 'Google Pay', 'Paytm', 'Amazon Pay', 'BHIM', 'WhatsApp'];

export default function Checkout() {
  const router = useRouter();
  const { lines, subtotal, me, clear, setQty } = useShop();
  const [app, setApp] = useState(APPS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  async function pay() {
    if (!lines.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: me?.user_id ?? 1,
          items: lines.map(({ product: p, qty }) => ({
            product_id: p.product_id, sku: p.sku, qty, price_inr: Number(p.price_inr),
          })),
          pspApp: app,
          deviceId: deviceId(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.txn_id) throw new Error(data.error ?? 'Checkout failed');
      clear();
      router.push(`/pay/${data.txn_id}`);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <main className="container narrow">
        <div className="empty tall">
          <div className="empty-art"><Icon.cart size={40} strokeWidth={1.5} /></div>
          <h2>Your cart is empty</h2>
          <p className="muted">Add something from the shop to check out.</p>
          <Link href="/" className="btn btn-primary">Back to shop</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="crumbs muted"><Link href="/">Shop</Link><Icon.chevronRight size={14} /><span>Checkout</span></nav>
      <h1 className="page-title">Checkout</h1>

      <div className="checkout-grid">
        <div className="checkout-main">
          <section className="panel">
            <div className="panel-head">
              <span className="step">1</span>
              <h2>Deliver to</h2>
              <span className="panel-right ok"><Icon.check size={14} /> Default address</span>
            </div>
            <div className="address">
              <div className="avatar lg">{me?.name?.[0] ?? '…'}</div>
              <div>
                <strong>{me?.name ?? 'Loading…'}</strong>
                <span className="pill pill-soft">{me?.kyc_level === 'FULL' ? 'KYC verified' : 'Min KYC'}</span>
                <p className="muted">
                  <Icon.mapPin size={13} /> 14, 3rd Cross, Indiranagar · {me?.city ?? ''}
                  <br />+91 {me?.phone?.replace(/(\d{5})(\d{5})/, '$1 $2') ?? ''}
                </p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="step">2</span>
              <h2>Pay with UPI</h2>
              <span className="panel-right muted"><Icon.lock size={13} /> 256-bit encrypted</span>
            </div>
            <div className="apps" role="radiogroup" aria-label="UPI app">
              {APPS.map((a) => (
                <button type="button" key={a} role="radio" aria-checked={app === a}
                  className={`app ${app === a ? 'on' : ''}`} onClick={() => setApp(a)}>
                  <UpiLogo app={a} size={40} />
                  <span className="app-name">{a}</span>
                  <span className="app-handle muted">{me ? me.vpa.split('@')[0] : 'you'}{upiHandle(a)}</span>
                  <span className="radio" />
                </button>
              ))}
            </div>
            <div className="other-methods">
              <span className="muted">Other methods</span>
              <button type="button" disabled className="method"><Icon.card size={16} /> Cards <em>Coming soon</em></button>
              <button type="button" disabled className="method"><Icon.bank size={16} /> Net banking <em>Coming soon</em></button>
              <button type="button" disabled className="method"><Icon.wallet size={16} /> Cash on delivery <em>Not available</em></button>
            </div>
          </section>
        </div>

        <aside className="checkout-side">
          <section className="panel sticky">
            <div className="panel-head compact">
              <h2>Order summary</h2>
              <span className="muted">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            </div>
            <ul className="summary-lines">
              {lines.map(({ product: p, qty }) => (
                <li key={p.product_id}>
                  <Tile meta={metaFor(p.category)} size={44} />
                  <div className="summary-name">
                    <span>{p.name}</span>
                    <div className="stepper xs">
                      <button type="button" onClick={() => setQty(p.product_id, qty - 1)} aria-label="Decrease"><Icon.minus size={12} /></button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty(p.product_id, qty + 1)} aria-label="Increase"><Icon.plus size={12} /></button>
                    </div>
                  </div>
                  <strong>{inr(Number(p.price_inr) * qty)}</strong>
                </li>
              ))}
            </ul>
            <div className="sum">
              <div className="sum-row"><span>Item total</span><span>{inr(subtotal)}</span></div>
              <div className="sum-row"><span>Delivery</span><span className={delivery ? '' : 'ok'}>{delivery ? inr(delivery) : 'Free'}</span></div>
              <div className="sum-row"><span>Platform fee</span><span className="ok">₹0</span></div>
              <div className="sum-row total"><span>To pay</span><span>{inr(total)}</span></div>
            </div>
            {error && <div className="alert"><Icon.alert size={16} /> {error}</div>}
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy || !me} onClick={pay}>
              {busy ? <><span className="spinner" /> Opening {app}…</> : <><UpiLogo app={app} size={22} /> Pay {inr(total)} with {app}</>}
            </button>
            <p className="secure muted"><Icon.shield size={13} /> You&apos;ll approve this payment with your UPI PIN in {app}.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
