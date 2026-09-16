'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/lib/shop';
import { inr, metaFor, FAILURE_COPY } from '@/lib/catalog';
import { Tile } from '@/components/ProductCard';
import { UpiLogo } from '@/components/UpiLogo';
import { Icon } from '@/components/icons';

type Item = { product_id: number; sku: string; qty: number; price_inr: number; name: string; category: string };
type Event = { event_id: number; event_type: string; payload: any; occurred_at: string; published_at: string | null };
type Payment = {
  txn_id: string; status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED'; failure_reason: string | null;
  amount_inr: string; psp_app: string; payer_bank: string; payer_vpa: string; payee_vpa: string;
  order_ref: string; order_status: string; items: Item[]; item_count: number;
  initiated_at: string; settled_at: string | null; updated_at: string; events: Event[];
};

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtDate = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PayStatus({ params }: { params: { txnId: string } }) {
  const router = useRouter();
  const { add } = useShop();
  const [p, setP] = useState<Payment | null>(null);
  const [missing, setMissing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [devOpen, setDevOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Poll. In a real PSP app this would be a webhook or a socket; polling keeps
  // the demo honest — you watch PENDING become SUCCESS on camera, and later
  // (if UDIR catches it) SUCCESS become REVERSED without the page reloading.
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/payments/${params.txnId}`).then(async (r) => {
      if (!alive) return;
      if (r.status === 404) { setMissing(true); return; }
      setP(await r.json());
    }).catch(() => {});
    load();
    const t = setInterval(load, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [params.txnId]);

  useEffect(() => {
    if (!p || p.status !== 'PENDING') return;
    const started = new Date(p.initiated_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [p?.status, p?.initiated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) {
    return (
      <main className="container narrow">
        <div className="empty tall">
          <div className="empty-art"><Icon.alert size={36} strokeWidth={1.5} /></div>
          <h2>We couldn&apos;t find that payment</h2>
          <p className="muted mono">{params.txnId}</p>
          <Link href="/orders" className="btn btn-outline">See my orders</Link>
        </div>
      </main>
    );
  }

  if (!p) {
    return (
      <main className="container narrow">
        <div className="result-card"><div className="sk sk-circle" /><div className="sk sk-line w60" /><div className="sk sk-line w40" /></div>
      </main>
    );
  }

  const amount = Number(p.amount_inr);
  const s = p.status;

  function retry() {
    p!.items.forEach((i) => add(i.product_id, i.qty));
    router.push('/checkout');
  }

  function copyRef() {
    navigator.clipboard?.writeText(p!.txn_id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <main className="container narrow">
      <section className={`result-card ${s.toLowerCase()}`}>
        {s === 'PENDING' && (
          <>
            <div className="result-ring">
              <span className="ring" /><span className="ring d2" />
              <UpiLogo app={p.psp_app} size={64} />
            </div>
            <h1>Approve in {p.psp_app}</h1>
            <p className="muted">Enter your UPI PIN in {p.psp_app} to complete this payment. Waiting for {p.payer_bank}…</p>
            <div className="result-amt">{inr(amount)}</div>
            <div className="timer"><span className="spinner dark" /> Waiting {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</div>
            <p className="hint muted"><Icon.info size={14} /> Don&apos;t press back or refresh — this page updates by itself.</p>
          </>
        )}
        {s === 'SUCCESS' && (
          <>
            <div className="result-icon ok-bg"><Icon.check size={40} strokeWidth={3} /></div>
            <h1>Payment successful</h1>
            <p className="muted">Paid to <strong>UPI Shop</strong> via {p.psp_app}</p>
            <div className="result-amt">{inr(amount)}</div>
            <div className="pill pill-ok"><Icon.box size={13} /> Order {p.order_ref} confirmed</div>
          </>
        )}
        {s === 'FAILED' && (
          <>
            <div className="result-icon fail-bg"><Icon.close size={40} strokeWidth={3} /></div>
            <h1>Payment failed</h1>
            <p className="muted">{FAILURE_COPY[p.failure_reason ?? ''] ?? 'Your bank declined this payment.'}</p>
            <div className="result-amt strike">{inr(amount)}</div>
            <div className="pill pill-fail">{(p.failure_reason ?? 'DECLINED').replace(/_/g, ' ')}</div>
          </>
        )}
        {s === 'REVERSED' && (
          <>
            <div className="result-icon warn-bg"><Icon.refresh size={38} strokeWidth={2.6} /></div>
            <h1>Payment reversed</h1>
            <p className="muted">{FAILURE_COPY.UDIR_REVERSAL} It usually reflects within 3–5 working days.</p>
            <div className="result-amt">{inr(amount)}</div>
            <div className="pill pill-warn">Refund initiated · Order {p.order_ref} cancelled</div>
          </>
        )}

        <div className="result-actions">
          {s === 'FAILED' && <button type="button" className="btn btn-primary" onClick={retry}><Icon.refresh size={16} /> Retry payment</button>}
          {s === 'SUCCESS' && <Link href="/orders" className="btn btn-primary"><Icon.box size={16} /> Track order</Link>}
          {s === 'PENDING' && <button type="button" className="btn btn-outline" disabled><span className="spinner dark" /> Processing</button>}
          <Link href="/" className={`btn ${s === 'PENDING' || s === 'REVERSED' ? 'btn-primary' : 'btn-outline'}`}>Continue shopping</Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head compact"><h2>Transaction details</h2>
          <button type="button" className="link-btn" onClick={copyRef}>{copied ? <><Icon.check size={13} /> Copied</> : 'Copy UPI ref'}</button>
        </div>
        <dl className="details">
          <dt>UPI reference</dt><dd className="mono">{p.txn_id}</dd>
          <dt>Order ID</dt><dd className="mono">{p.order_ref}</dd>
          <dt>From</dt><dd><span className="mono">{p.payer_vpa}</span><span className="muted"> · {p.payer_bank}</span></dd>
          <dt>To</dt><dd><span className="mono">{p.payee_vpa}</span><span className="muted"> · UPI Shop</span></dd>
          <dt>App</dt><dd className="with-logo"><UpiLogo app={p.psp_app} size={20} /> {p.psp_app}</dd>
          <dt>Initiated</dt><dd>{fmtDate(p.initiated_at)}</dd>
          {p.settled_at && <><dt>Settled</dt><dd>{fmtDate(p.settled_at)}</dd></>}
        </dl>
      </section>

      <section className="panel">
        <div className="panel-head compact"><h2>Items</h2><span className="muted">{p.item_count} {p.item_count === 1 ? 'item' : 'items'}</span></div>
        <ul className="summary-lines">
          {p.items.map((i) => (
            <li key={i.sku}>
              <Tile meta={metaFor(i.category)} size={44} />
              <div className="summary-name"><span>{i.name}</span><span className="muted">Qty {i.qty} × {inr(Number(i.price_inr))}</span></div>
              <strong>{inr(Number(i.price_inr) * i.qty)}</strong>
            </li>
          ))}
        </ul>
        <div className="sum"><div className="sum-row total"><span>Total</span><span>{inr(amount)}</span></div></div>
      </section>

      <section className="panel">
        <div className="panel-head compact"><h2>Timeline</h2></div>
        <ol className="timeline">
          {p.events.map((e) => {
            const ns = e.payload?.new_status as string | undefined;
            const tone = e.event_type === 'txn_initiated' ? 'pend' : ns === 'SUCCESS' ? 'ok' : ns === 'REVERSED' ? 'warn' : 'fail';
            const title = e.event_type === 'txn_initiated' ? `Payment request sent to ${p.psp_app}`
              : ns === 'SUCCESS' ? `${p.payer_bank} approved the payment`
              : ns === 'REVERSED' ? 'NPCI reversed the payment (UDIR)'
              : `${p.payer_bank} declined the payment`;
            const sub = e.event_type === 'txn_initiated' ? `Forwarded to ${p.payer_bank} via NPCI · status PENDING`
              : ns === 'FAILED' ? `Reason: ${(e.payload?.failure_reason ?? '').replace(/_/g, ' ').toLowerCase()}`
              : ns === 'REVERSED' ? 'Refund to source account initiated'
              : 'Money debited · order confirmed';
            return (
              <li key={e.event_id} className={tone}>
                <span className="dot" />
                <div><strong>{title}</strong><p className="muted">{sub}</p></div>
                <time className="muted">{fmtTime(e.occurred_at)}</time>
              </li>
            );
          })}
          {s === 'PENDING' && (
            <li className="pend live"><span className="dot" /><div><strong>Waiting for bank response</strong><p className="muted">Usually takes a few seconds</p></div><time className="muted">now</time></li>
          )}
        </ol>
      </section>

      {/* The outbox, on screen. This is the same stream Module 6 drains into
          Event Hubs — seeing it here first makes that module land. */}
      <section className="panel dev">
        <button type="button" className="dev-toggle" onClick={() => setDevOpen((o) => !o)} aria-expanded={devOpen}>
          <Icon.code size={16} /> <span>Developer view</span>
          <span className="muted">payment_events · the outbox</span>
          <Icon.chevronDown size={16} className={devOpen ? 'flip' : ''} />
        </button>
        {devOpen && (
          <div className="dev-body">
            <p className="muted">
              Every state change on this payment row was written together with an event in
              <code>payment_events</code>, in the same transaction. <code>published_at</code> flips when the
              outbox publisher drains the row to the stream.
            </p>
            <table className="dev-table">
              <thead><tr><th>#</th><th>event_type</th><th>payload</th><th>occurred_at</th><th>published</th></tr></thead>
              <tbody>
                {p.events.map((e) => (
                  <tr key={e.event_id}>
                    <td className="mono">{e.event_id}</td>
                    <td className="mono">{e.event_type}</td>
                    <td><pre>{JSON.stringify(e.payload, null, 1)}</pre></td>
                    <td className="mono">{fmtTime(e.occurred_at)}</td>
                    <td>{e.published_at ? <span className="ok">✓ {fmtTime(e.published_at)}</span> : <span className="muted">— pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="dev-row muted">
              <span>Row state: <code>payments.status = {s}</code> · <code>updated_at = {fmtTime(p.updated_at)}</code></span>
              {s === 'PENDING' && (
                <button type="button" className="link-btn" onClick={() => fetch('/api/simulate').catch(() => {})}>
                  Locally the cron doesn&apos;t run — settle now
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
