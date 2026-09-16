import Link from 'next/link';
import { Logo } from './Navbar';
import { UpiLogo } from './UpiLogo';
import { Icon } from './icons';

const APPS = ['PhonePe', 'Google Pay', 'Paytm', 'Amazon Pay', 'BHIM', 'WhatsApp'];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="muted footer-blurb">
              Everyday essentials, recharges and more — paid in one tap with any UPI app.
            </p>
            <div className="footer-apps">
              {APPS.map((a) => <UpiLogo key={a} app={a} size={28} />)}
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <Link href="/">All products</Link>
            <Link href="/orders">My orders</Link>
            <Link href="/checkout">Checkout</Link>
          </div>
          <div>
            <h4>Help</h4>
            <a href="#">Payment issues</a>
            <a href="#">Refunds &amp; reversals</a>
            <a href="#">Contact us</a>
          </div>
          <div>
            <h4>Trust</h4>
            <span className="trust"><Icon.shield size={15} /> UPI-secured payments</span>
            <span className="trust"><Icon.refresh size={15} /> Auto-refund on failure</span>
            <span className="trust"><Icon.lock size={15} /> No card details stored</span>
          </div>
        </div>
        <div className="footer-bottom muted">
          <span>© {new Date().getFullYear()} UPI Shop · Merchant VPA <code>upishop@ybl</code></span>
          <span>Demo storefront · no real money moves</span>
        </div>
      </div>
    </footer>
  );
}
