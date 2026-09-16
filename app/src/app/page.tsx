'use client';

import { useMemo, useState } from 'react';
import { useShop } from '@/lib/shop';
import { CATEGORY_META, metaFor } from '@/lib/catalog';
import { ProductCard, ProductSkeleton } from '@/components/ProductCard';
import { UpiLogo } from '@/components/UpiLogo';
import { Icon, type IconName } from '@/components/icons';

const HERO_APPS = ['PhonePe', 'Google Pay', 'Paytm', 'BHIM'];

export default function Shop() {
  const { products, loading, error, query, setQuery, openDrawer, count } = useShop();
  const [cat, setCat] = useState<string>('All');
  const [sort, setSort] = useState<'popular' | 'low' | 'high'>('popular');

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    products.forEach((p) => seen.set(p.category, (seen.get(p.category) ?? 0) + 1));
    return Array.from(seen.entries());
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => (cat === 'All' || p.category === cat) &&
      (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
    if (sort === 'low') list = [...list].sort((a, b) => Number(a.price_inr) - Number(b.price_inr));
    if (sort === 'high') list = [...list].sort((a, b) => Number(b.price_inr) - Number(a.price_inr));
    return list;
  }, [products, cat, query, sort]);

  return (
    <main className="container">
      {!query && (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Icon.bolt size={14} /> Instant UPI checkout</span>
            <h1>Everyday essentials,<br />paid in a tap.</h1>
            <p>Groceries, recharges, tickets and gadgets — one cart, any UPI app, confirmation in seconds.</p>
            <div className="hero-cta">
              <a href="#catalogue" className="btn btn-light btn-lg">Shop now</a>
              {count > 0 && (
                <button type="button" className="btn btn-ghost btn-lg" onClick={openDrawer}>
                  View cart ({count})
                </button>
              )}
            </div>
            <div className="hero-apps">
              <span>Pay with</span>
              {HERO_APPS.map((a) => <UpiLogo key={a} app={a} size={26} />)}
              <span>+ more</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="phone">
              <div className="phone-top"><span /><span /></div>
              <div className="phone-body">
                <div className="phone-check"><Icon.check size={28} strokeWidth={3} /></div>
                <div className="phone-amt">₹1,298</div>
                <div className="phone-to">Paid to UPI Shop</div>
                <div className="phone-row"><span>UPI Ref</span><span>UPI2026…4419</span></div>
                <div className="phone-row"><span>From</span><span>aarav@okhdfcbank</span></div>
              </div>
            </div>
            <div className="float f1"><Icon.truck size={16} /> Free delivery over ₹499</div>
            <div className="float f2"><Icon.shield size={16} /> Bank-grade security</div>
          </div>
        </section>
      )}

      <section className="perks">
        <div><Icon.bolt size={18} /><div><strong>Instant confirmation</strong><span>Live status from your bank</span></div></div>
        <div><Icon.refresh size={18} /><div><strong>Auto-refunds</strong><span>Failed payments refunded</span></div></div>
        <div><Icon.truck size={18} /><div><strong>Free delivery</strong><span>On orders above ₹499</span></div></div>
        <div><Icon.shield size={18} /><div><strong>No card needed</strong><span>Just your UPI PIN</span></div></div>
      </section>

      <section id="catalogue" className="catalogue">
        <div className="chips" role="tablist" aria-label="Categories">
          <button type="button" role="tab" aria-selected={cat === 'All'} className={`chip ${cat === 'All' ? 'on' : ''}`} onClick={() => setCat('All')}>
            All <span className="chip-n">{products.length}</span>
          </button>
          {categories.map(([c, n]) => {
            const m = metaFor(c);
            const I = Icon[m.icon as IconName];
            return (
              <button type="button" role="tab" aria-selected={cat === c} key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
                <span className="chip-ic" style={{ background: m.from, color: m.ink }}><I size={14} /></span>
                {c} <span className="chip-n">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="section-head">
          <div>
            <h2>{query ? `Results for “${query}”` : cat === 'All' ? 'Popular right now' : cat}</h2>
            <p className="muted">
              {query ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}` :
               cat === 'All' ? 'Handpicked across every category' : CATEGORY_META[cat]?.blurb}
            </p>
          </div>
          <label className="sort">
            <span className="muted">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="popular">Popularity</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid">{Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}</div>
        ) : error ? (
          <div className="empty">
            <div className="empty-art fail"><Icon.alert size={36} strokeWidth={1.5} /></div>
            <h3>Couldn&apos;t load the catalogue</h3>
            <p className="muted">The shop&apos;s database didn&apos;t answer.</p>
            <pre className="err-detail">{error}</pre>
            <p className="muted small">
              On Vercel: add <code>DATABASE_URL</code> under Settings → Environment Variables (all environments), redeploy,
              and make sure <code>npm run db:setup</code> has been run against that same Neon database.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty">
            <div className="empty-art"><Icon.box size={36} strokeWidth={1.5} /></div>
            <h3>The catalogue is empty</h3>
            <p className="muted">The database is reachable but has no products. Run <code>npm run db:setup</code> against it.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <div className="empty-art"><Icon.search size={36} strokeWidth={1.5} /></div>
            <h3>Nothing matches “{query}”</h3>
            <p className="muted">Try a different word, or browse a category.</p>
            <button type="button" className="btn btn-outline" onClick={() => { setQuery(''); setCat('All'); }}>Clear search</button>
          </div>
        ) : (
          <div className="grid">{visible.map((p) => <ProductCard key={p.product_id} p={p} />)}</div>
        )}
      </section>

      <section className="how">
        <div className="how-head">
          <h2>How paying by UPI works here</h2>
          <p className="muted">Exactly what happens after you tap Pay — no surprises.</p>
        </div>
        <ol className="how-steps">
          <li><span>1</span><strong>Choose your app</strong><p>PhonePe, Google Pay, Paytm, Amazon Pay, BHIM or WhatsApp.</p></li>
          <li><span>2</span><strong>Approve in the app</strong><p>The request is forwarded to your bank through NPCI. Status shows <em>Pending</em>.</p></li>
          <li><span>3</span><strong>Bank confirms</strong><p>Within seconds the bank answers and your order flips to <em>Paid</em> — or tells you why not.</p></li>
        </ol>
      </section>
    </main>
  );
}
