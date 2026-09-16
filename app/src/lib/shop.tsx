'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from './catalog';

export type Me = { user_id: number; name: string; vpa: string; phone: string; city: string; kyc_level: string };

type Cart = Record<number, number>;

type Shop = {
  products: Product[];
  loading: boolean;
  error: string | null;
  me: Me | null;
  cart: Cart;
  count: number;
  subtotal: number;
  lines: { product: Product; qty: number }[];
  add: (id: number, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  query: string;
  setQuery: (q: string) => void;
  toast: string | null;
};

const ShopContext = createContext<Shop | null>(null);
const CART_KEY = 'upishop_cart';

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch('/api/products')
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok || !Array.isArray(body)) {
          throw new Error(body?.error ?? `${r.status} ${r.statusText}`);
        }
        setProducts(body);
      })
      .catch((e) => setError(e.message ?? 'Could not load the catalogue'))
      .finally(() => setLoading(false));
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
  }, [cart, hydrated]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const add = useCallback((id: number, qty = 1) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty }));
    showToast('Added to cart');
  }, [showToast]);

  const setQty = useCallback((id: number, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id]; else next[id] = qty;
      return next;
    });
  }, []);

  const remove = useCallback((id: number) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => setCart({}), []);

  const lines = useMemo(
    () => products.filter((p) => cart[p.product_id]).map((p) => ({ product: p, qty: cart[p.product_id] })),
    [products, cart],
  );
  const count = useMemo(() => Object.values(cart).reduce((s, n) => s + n, 0), [cart]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + Number(l.product.price_inr) * l.qty, 0), [lines]);

  const value: Shop = {
    products, loading, error, me, cart, count, subtotal, lines,
    add, setQty, remove, clear,
    drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    query, setQuery, toast,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}

/**
 * A stable per-browser device id. Module 11's "new device, high value" fraud
 * rule keys on exactly this — clear localStorage and buy something expensive
 * to fire the alert on camera.
 */
export function deviceId(): string {
  const key = 'upi_device_id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'DVC' + Math.floor(1e9 + Math.random() * 9e9);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'DVC' + Math.floor(1e9 + Math.random() * 9e9);
  }
}
