'use client';

import { useShop } from '@/lib/shop';
import { inr, metaFor, present, type CategoryMeta, type Product } from '@/lib/catalog';
import { Icon, type IconName } from './icons';

export function Tile({ meta, size, className = '' }: { meta: CategoryMeta; size?: number; className?: string }) {
  const I = Icon[meta.icon as IconName];
  const style: React.CSSProperties = {
    background: `linear-gradient(135deg, ${meta.from}, ${meta.to})`, color: meta.ink,
    ...(size ? { width: size, height: size, borderRadius: Math.round(size * 0.2), flex: 'none' } : {}),
  };
  return (
    <div className={`tile ${className}`} style={style}>
      <I size={size ? Math.round(size * 0.48) : 72} strokeWidth={1.5} />
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { cart, add, setQty } = useShop();
  const m = metaFor(p.category);
  const v = present(p);
  const qty = cart[p.product_id] ?? 0;
  const price = Number(p.price_inr);

  return (
    <article className="card">
      <div className="card-media">
        <Tile meta={m} />
        {v.discountPct > 0 && <span className="pill pill-deal">{v.discountPct}% off</span>}
        {v.bestseller && <span className="pill pill-best">Bestseller</span>}
        <button type="button" className="wish" aria-label="Save for later"><Icon.heartOutline size={17} /></button>
      </div>
      <div className="card-body">
        <div className="card-cat">{p.category}</div>
        <h3 className="card-name">{p.name}</h3>
        <div className="rating">
          <span className="rating-chip"><Icon.star size={11} /> {v.rating.toFixed(1)}</span>
          <span className="muted">({v.reviews.toLocaleString('en-IN')})</span>
        </div>
        <div className="price-row">
          <span className="price">{inr(price)}</span>
          {v.discountPct > 0 && <span className="mrp">{inr(v.mrp)}</span>}
        </div>
        <div className="delivery muted">
          {v.deliveryLabel === 'Instant delivery' ? <Icon.bolt size={13} /> : <Icon.truck size={13} />}
          {v.deliveryLabel}
        </div>
        {qty === 0 ? (
          <button type="button" className="btn btn-outline btn-block" onClick={() => add(p.product_id)}>
            <Icon.plus size={16} /> Add
          </button>
        ) : (
          <div className="stepper block">
            <button type="button" onClick={() => setQty(p.product_id, qty - 1)} aria-label="Decrease"><Icon.minus size={16} /></button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(p.product_id, qty + 1)} aria-label="Increase"><Icon.plus size={16} /></button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductSkeleton() {
  return (
    <article className="card skeleton">
      <div className="card-media"><div className="tile sk" /></div>
      <div className="card-body">
        <div className="sk sk-line w40" /><div className="sk sk-line w80" /><div className="sk sk-line w30" />
        <div className="sk sk-line w50" /><div className="sk sk-btn" />
      </div>
    </article>
  );
}
