'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useShop } from '@/lib/shop';
import { inr, metaFor } from '@/lib/catalog';
import { Tile } from '@/components/ProductCard';
import { UpiLogo } from '@/components/UpiLogo';
import { Icon } from '@/components/icons';

type Order = {
  order_id: number; order_ref: string; item_count: number; amount_inr: string; order_status: string;
  created_at: string; txn_id: string | null; payment_status: string | null; failure_reason: string | null;
  psp_app: string | null; items: { sku: string; qty: number; price_inr: number; name: string; category: string }[];
};

const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING:  { label: 'Payment pending', tone: 'pend' },
  SUCCESS:  { label: 'Paid',            tone: 'ok' },
  FAILED:   { label: 'Payment failed',  tone: 'fail' },
  REVERSED: { label: 'Refunded',        tone: 'warn' },
};

export default function Orders() {
  const { me } = useShop();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!me) return;
    const load = () => fetch(`/api/orders?userId=${me.user_id}`).then((r) => r.json()).then(setOrders).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [me]);

  return (
    <main className="container narrow-md">
      <nav className="crumbs muted"><Link href="/">Shop</Link><Icon.chevronRight size={14} /><span>My orders</span></nav>
      <div className="section-head">
        <div><h1 className="page-title">My orders</h1><p className="muted">{me ? `${me.name} · ${me.vpa}` : ''}</p></div>
      </div>

      {orders === null ? (
        <div className="orders">{[1, 2, 3].map((i) => <div key={i} className="order sk-card"><div className="sk sk-line w40" /><div className="sk sk-line w70" /></div>)}</div>
      ) : orders.length === 0 ? (
        <div className="empty tall">
          <div className="empty-art"><Icon.box size={40} strokeWidth={1.5} /></div>
          <h2>No orders yet</h2>
          <p className="muted">Your purchases will show up here.</p>
          <Link href="/" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="orders">
          {orders.map((o) => {
            const st = STATUS[o.payment_status ?? 'PENDING'] ?? STATUS.PENDING;
            const href = o.txn_id ? `/pay/${o.txn_id}` : '#';
            return (
              <Link href={href} key={o.order_id} className="order">
                <div className="order-head">
                  <div>
                    <span className={`badge ${st.tone}`}>{st.label}</span>
                    <span className="muted order-date">{new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="order-right">
                    {o.psp_app && <UpiLogo app={o.psp_app} size={22} />}
                    <strong>{inr(Number(o.amount_inr))}</strong>
                    <Icon.chevronRight size={18} className="muted" />
                  </div>
                </div>
                <div className="order-items">
                  <div className="order-tiles">
                    {o.items.slice(0, 4).map((i) => <Tile key={i.sku} meta={metaFor(i.category)} size={40} />)}
                    {o.items.length > 4 && <span className="more">+{o.items.length - 4}</span>}
                  </div>
                  <div className="order-names">
                    {o.items.slice(0, 2).map((i) => i.qty > 1 ? `${i.name} × ${i.qty}` : i.name).join(', ')}
                    {o.items.length > 2 && <span className="muted"> and {o.items.length - 2} more</span>}
                  </div>
                </div>
                <div className="order-foot muted mono">{o.order_ref}{o.txn_id && <> · {o.txn_id}</>}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
