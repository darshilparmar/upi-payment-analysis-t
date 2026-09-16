'use client';

import { useShop } from '@/lib/shop';
import { Icon } from './icons';

export function Toast() {
  const { toast, openDrawer } = useShop();
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      <Icon.check size={16} /> <span>{toast}</span>
      <button type="button" onClick={openDrawer}>View cart</button>
    </div>
  );
}
