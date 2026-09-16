/** Minimal inline icon set (24px viewBox, stroke-based) so the UI has no external asset dependency. */

type P = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 20, className, strokeWidth = 2, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const Icon = {
  search: (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  cart: (p: P) => <Svg {...p}><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></Svg>,
  user: (p: P) => <Svg {...p}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" /></Svg>,
  box: (p: P) => <Svg {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3.3 8.3 8.7 4.9 8.7-4.9" /><path d="M12 13.2V21" /></Svg>,
  close: (p: P) => <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>,
  plus: (p: P) => <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>,
  minus: (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>,
  trash: (p: P) => <Svg {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></Svg>,
  star: (p: P) => <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" /></svg>,
  heartOutline: (p: P) => <Svg {...p}><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 6.5-6.5l1 1 1-1a4.6 4.6 0 0 1 6.5 6.5Z" /></Svg>,
  check: (p: P) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>,
  shield: (p: P) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Svg>,
  truck: (p: P) => <Svg {...p}><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.3a1 1 0 0 0-.3-.7l-3.4-3.4a1 1 0 0 0-.7-.3H14v7.7h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Svg>,
  refresh: (p: P) => <Svg {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></Svg>,
  arrowLeft: (p: P) => <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>,
  arrowRight: (p: P) => <Svg {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>,
  chevronDown: (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>,
  chevronRight: (p: P) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>,
  mapPin: (p: P) => <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>,
  lock: (p: P) => <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>,
  info: (p: P) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>,
  code: (p: P) => <Svg {...p}><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></Svg>,
  alert: (p: P) => <Svg {...p}><path d="m10.3 3.9-8.2 14.2A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>,
  bolt: (p: P) => <Svg {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></Svg>,
  qr: (p: P) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3" /><path d="M21 14v7h-7" /><path d="M17 17v.01" /></Svg>,
  card: (p: P) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Svg>,
  bank: (p: P) => <Svg {...p}><path d="m3 9 9-6 9 6" /><path d="M4 9h16v2H4z" /><path d="M6 11v7" /><path d="M10 11v7" /><path d="M14 11v7" /><path d="M18 11v7" /><path d="M3 21h18" /></Svg>,
  wallet: (p: P) => <Svg {...p}><path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M16 3H6a2 2 0 0 0-2 2v2" /><path d="M17 14h.01" /></Svg>,
  // category tiles
  basket: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="m5 11 4-7" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L20.5 11" /><path d="M9 15v3" /><path d="M12 15v3" /><path d="M15 15v3" /></Svg>,
  coffee: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" /></Svg>,
  phone: (p: P) => <Svg {...p} strokeWidth={1.6}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /><path d="M9 6h6" /><path d="M9 9h4" /></Svg>,
  zap: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></Svg>,
  fuel: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" /><path d="M2 22h14" /><path d="M6 8h6" /><path d="M6 12h6" /><path d="M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" /></Svg>,
  bag: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Svg>,
  bus: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M8 6v6" /><path d="M16 6v6" /><path d="M2 12h20" /><path d="M18 18h1a2 2 0 0 0 2-2V6a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v10a2 2 0 0 0 2 2h1" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /><path d="M9 18h6" /></Svg>,
  ticket: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></Svg>,
  heart: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 6.5-6.5l1 1 1-1a4.6 4.6 0 0 1 6.5 6.5Z" /><path d="M3.2 12H8l1.5-3 2 6 2-4h4.3" /></Svg>,
  cap: (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /><path d="M22 10v6" /></Svg>,
};

export type IconName = keyof typeof Icon;
