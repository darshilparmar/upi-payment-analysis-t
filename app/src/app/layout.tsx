import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ShopProvider } from '@/lib/shop';
import { Navbar } from '@/components/Navbar';
import { CartDrawer } from '@/components/CartDrawer';
import { Footer } from '@/components/Footer';
import { Toast } from '@/components/Toast';

export const metadata: Metadata = {
  title: { default: 'UPI Shop — everyday essentials, paid in a tap', template: '%s · UPI Shop' },
  description: 'Groceries, recharges, tickets and more. Pay with PhonePe, Google Pay, Paytm or any UPI app.',
};

export const viewport: Viewport = { themeColor: '#4f46e5', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ShopProvider>
          <Navbar />
          <div className="page">{children}</div>
          <Footer />
          <CartDrawer />
          <Toast />
        </ShopProvider>
      </body>
    </html>
  );
}
