/**
 * Presentation metadata for the catalogue. The database only knows a name,
 * a category and a price — everything a real storefront shows on top of that
 * (artwork, ratings, MRP, delivery promise) is derived deterministically from
 * the SKU so it is stable across reloads and identical for every visitor.
 */

export type Product = {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  price_inr: string;
};

export type CategoryMeta = {
  icon: string;          // key into the icon set in components/icons.tsx
  from: string;          // gradient start
  to: string;            // gradient end
  ink: string;           // icon colour on the tile
  blurb: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  'Grocery':          { icon: 'basket',   from: '#dcfce7', to: '#bbf7d0', ink: '#15803d', blurb: 'Staples & pantry' },
  'Food & Beverage':  { icon: 'coffee',   from: '#fef3c7', to: '#fde68a', ink: '#b45309', blurb: 'Coffee, tea & snacks' },
  'Telecom Recharge': { icon: 'phone',    from: '#e0f2fe', to: '#bae6fd', ink: '#0369a1', blurb: 'Prepaid plans' },
  'Utilities':        { icon: 'zap',      from: '#fef9c3', to: '#fef08a', ink: '#a16207', blurb: 'Bills & top-ups' },
  'Fuel':             { icon: 'fuel',     from: '#ffedd5', to: '#fed7aa', ink: '#c2410c', blurb: 'Fuel vouchers' },
  'E-commerce':       { icon: 'bag',      from: '#ede9fe', to: '#ddd6fe', ink: '#6d28d9', blurb: 'Gadgets & fashion' },
  'Travel':           { icon: 'bus',      from: '#dbeafe', to: '#bfdbfe', ink: '#1d4ed8', blurb: 'Tickets & trips' },
  'Entertainment':    { icon: 'ticket',   from: '#fce7f3', to: '#fbcfe8', ink: '#be185d', blurb: 'Movies & events' },
  'Healthcare':       { icon: 'heart',    from: '#ffe4e6', to: '#fecdd3', ink: '#be123c', blurb: 'Wellness' },
  'Education':        { icon: 'cap',      from: '#ccfbf1', to: '#99f6e4', ink: '#0f766e', blurb: 'Courses' },
};

export const DEFAULT_META: CategoryMeta = {
  icon: 'bag', from: '#f3f4f6', to: '#e5e7eb', ink: '#374151', blurb: '',
};

export function metaFor(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? DEFAULT_META;
}

/** Small stable hash so the same SKU always gets the same rating & discount. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Presentation = {
  rating: number;        // 3.9 – 4.8
  reviews: number;       // 120 – 9,000
  discountPct: number;   // 0 | 10 | 15 | 20 | 25
  mrp: number;           // strike-through price, >= price
  deliveryLabel: string;
  bestseller: boolean;
};

export function present(p: Product): Presentation {
  const h = hash(p.sku);
  const price = Number(p.price_inr);
  const rating = 3.9 + ((h % 10) / 10) * 0.9;
  const reviews = 120 + ((h >>> 4) % 8900);
  const tiers = [0, 0, 10, 15, 20, 25];
  const discountPct = tiers[(h >>> 8) % tiers.length];
  const mrp = discountPct ? Math.round(price / (1 - discountPct / 100)) : price;
  const digital = ['Telecom Recharge', 'Utilities', 'Fuel', 'Entertainment', 'Education', 'Travel'].includes(p.category);
  const deliveryLabel = digital ? 'Instant delivery' : price >= 499 ? 'Free delivery' : 'Delivery ₹40';
  const bestseller = (h >>> 12) % 4 === 0;
  return { rating: Math.round(rating * 10) / 10, reviews, discountPct, mrp, deliveryLabel, bestseller };
}

export const FREE_DELIVERY_ABOVE = 499;
export const DELIVERY_FEE = 40;

export function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Human copy for NPCI failure codes — what the customer sees on the result screen. */
export const FAILURE_COPY: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Your bank declined the payment — insufficient balance in the linked account.',
  EXCEEDS_LIMIT:      'This payment exceeds the daily UPI limit set by your bank.',
  INVALID_VPA:        'The UPI ID could not be verified by your bank.',
  ACCOUNT_BLOCKED:    'Your bank has temporarily blocked UPI transactions on this account.',
  COLLECT_EXPIRED:    'The payment request expired before it was approved.',
  BANK_TIMEOUT:       'Your bank did not respond in time. Any debited amount will be auto-refunded.',
  SWITCH_ERROR:       'A technical error occurred at the UPI switch. Please try again.',
  PSP_UNAVAILABLE:    'Your UPI app could not reach the bank. Please try again in a moment.',
  DEBIT_TIMEOUT:      'The debit request timed out at your bank.',
  NETWORK_ERROR:      'A network error interrupted the payment. Please try again.',
  UDIR_REVERSAL:      'This payment was reversed by NPCI. The amount will be credited back to your account.',
};
