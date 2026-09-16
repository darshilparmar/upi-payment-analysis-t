'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useShop } from '@/lib/shop';
import { Icon } from './icons';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="logo">
      <span className="logo-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="logo-word">UPI<span>Shop</span></span>
    </span>
  );
}

export function Navbar() {
  const { count, openDrawer, query, setQuery, me } = useShop();
  const router = useRouter();
  const pathname = usePathname();

  function onSearch(v: string) {
    setQuery(v);
    if (pathname !== '/') router.push('/');
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand" aria-label="UPI Shop home"><Logo /></Link>

        <label className="search">
          <Icon.search size={18} />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search for groceries, recharges, gadgets…"
            aria-label="Search products"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <Icon.close size={14} />
            </button>
          )}
        </label>

        <nav className="nav-links">
          <Link href="/orders" className={`nav-link ${pathname.startsWith('/orders') ? 'active' : ''}`}>
            <Icon.box size={20} /><span>Orders</span>
          </Link>
          <span className="nav-link nav-user" title={me ? `${me.vpa} · ${me.city}` : ''}>
            <span className="avatar">{me ? me.name[0] : <Icon.user size={16} />}</span>
            <span>{me ? me.name : 'Account'}</span>
          </span>
          <button type="button" className="nav-link nav-cart" onClick={openDrawer} aria-label={`Cart, ${count} items`}>
            <span className="cart-icon">
              <Icon.cart size={21} />
              {count > 0 && <span className="cart-badge">{count > 99 ? '99+' : count}</span>}
            </span>
            <span>Cart</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
