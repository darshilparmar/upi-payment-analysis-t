/**
 * Lettermark badges for the UPI apps. Deliberately not the real logos —
 * brand colours + initials are recognisable enough for a demo and keep the
 * repo free of trademarked assets.
 */
const BRAND: Record<string, { bg: string; fg: string; mark: string; handle: string }> = {
  'PhonePe':    { bg: '#5f259f', fg: '#ffffff', mark: 'पे', handle: '@ybl' },
  'Google Pay': { bg: '#ffffff', fg: '#4285f4', mark: 'G',  handle: '@okhdfcbank' },
  'Paytm':      { bg: '#002e6e', fg: '#00baf2', mark: 'P',  handle: '@paytm' },
  'Amazon Pay': { bg: '#232f3e', fg: '#ff9900', mark: 'a',  handle: '@apl' },
  'BHIM':       { bg: '#0b4f9c', fg: '#ff8a00', mark: 'भ',  handle: '@upi' },
  'WhatsApp':   { bg: '#25d366', fg: '#ffffff', mark: 'W',  handle: '@waaxis' },
};

export function upiHandle(app: string) {
  return BRAND[app]?.handle ?? '@upi';
}

export function UpiLogo({ app, size = 36 }: { app: string; size?: number }) {
  const b = BRAND[app] ?? { bg: '#e5e7eb', fg: '#374151', mark: app[0], handle: '@upi' };
  const isGoogle = app === 'Google Pay';
  return (
    <span
      className="upi-logo"
      style={{ width: size, height: size, background: b.bg, color: b.fg, fontSize: size * 0.46, borderRadius: size * 0.26 }}
      aria-label={app}
    >
      {isGoogle ? (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.2c-1.6 3.2-1.6 7.1 0 10.3l4.1-2.6z" />
          <path fill="#EA4335" d="M12 4.7c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.1 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-5 6.7-5z" />
        </svg>
      ) : b.mark}
    </span>
  );
}
