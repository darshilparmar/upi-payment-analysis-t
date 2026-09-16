'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShop } from '@/lib/shop';
import { inr, metaFor, FREE_DELIVERY_ABOVE, DELIVERY_FEE } from '@/lib/catalog';
import { Icon } from './icons';
import { Tile } from './ProductCard';

export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, setQty, remove, subtotal, count } = useShop();
  const router = useRouter();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawerOpen, closeDrawer]);

  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const toFree = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);

  return (
    <>
      <div className={`scrim ${drawerOpen ? 'show' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside className={`drawer ${drawerOpen ? 'show' : ''}`} aria-label="Shopping cart" aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <h2>Your cart <span className="muted">({count} {count === 1 ? 'item' : 'items'})</span></h2>
          <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Close cart"><Icon.close /></button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer-empty">
            <div className="empty-art"><Icon.cart size={40} strokeWidth={1.5} /></div>
            <h3>Your cart is empty</h3>
            <p className="muted">Add a few things and pay with any UPI app.</p>
            <button type="button" className="btn btn-primary" onClick={closeDrawer}>Start shopping</button>
          </div>
        ) : (
          <>
            {toFree > 0 ? (
              <div className="free-bar">
                <Icon.truck size={16} />
                <span>Add <strong>{inr(toFree)}</strong> more for free delivery</span>
                <i style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_ABOVE) * 100)}%` }} />
              </div>
            ) : (
              <div className="free-bar done"><Icon.check size={16} /><span>You&apos;ve unlocked <strong>free delivery</strong></span></div>
            )}

            <ul className="drawer-lines">
              {lines.map(({ product: p, qty }) => {
                const m = metaFor(p.category);
                return (
                  <li key={p.product_id} className="line">
                    <Tile meta={m} size={60} />
                    <div className="line-body">
                      <div className="line-name">{p.name}</div>
                      <div className="line-sub muted">{p.category}</div>
                      <div className="line-row">
                        <div className="stepper sm">
                          <button type="button" onClick={() => setQty(p.product_id, qty - 1)} aria-label="Decrease"><Icon.minus size={14} /></button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => setQty(p.product_id, qty + 1)} aria-label="Increase"><Icon.plus size={14} /></button>
                        </div>
                        <strong>{inr(Number(p.price_inr) * qty)}</strong>
                      </div>
                    </div>
                    <button type="button" className="icon-btn line-remove" onClick={() => remove(p.product_id)} aria-label={`Remove ${p.name}`}>
                      <Icon.trash size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="drawer-foot">
              <div className="sum-row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="sum-row"><span>Delivery</span><span className={delivery ? '' : 'ok'}>{delivery ? inr(delivery) : 'Free'}</span></div>
              <div className="sum-row total"><span>Total</span><span>{inr(subtotal + delivery)}</span></div>
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => { closeDrawer(); router.push('/checkout'); }}>
                Proceed to checkout <Icon.arrowRight size={18} />
              </button>
              <p className="secure muted"><Icon.lock size={13} /> Pay securely with any UPI app</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
