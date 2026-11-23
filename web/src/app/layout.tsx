import type { Metadata, Viewport } from 'next';
import { Noto_Serif_Bengali, Hind_Siliguri, Amiri } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import { PwaInstaller } from '@/components/pwa/PwaInstaller';

const notoSerifBengali = Noto_Serif_Bengali({
  weight: ['400', '600', '700', '800'],
  subsets: ['bengali', 'latin'],
  variable: '--font-noto-serif-bengali',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic', 'latin'],
  variable: '--font-amiri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট | ASSDI',
  description: 'শিক্ষার্থী লার্নিং প্রগ্রেস, ফিডব্যাক ও ম্যানেজমেন্ট সিস্টেম - স্মল বিজনেস ম্যানেজমেন্ট কোর্স (SBMC)',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ASSDI Portal',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${notoSerifBengali.variable} ${hindSiliguri.variable} ${amiri.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ASSDI Portal" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Strip browser extension injected attributes to prevent React hydration errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stripBadAttrs = function(node) {
                    if (node && node.nodeType === 1) {
                      ['bis_skin_checked', 'bis_register'].forEach(function(attr) {
                        if (node.hasAttribute(attr)) node.removeAttribute(attr);
                      });
                      Array.from(node.attributes || []).forEach(function(a) {
                        if (a && a.name && (a.name.startsWith('__processed_') || a.name.startsWith('bis_'))) {
                          node.removeAttribute(a.name);
                        }
                      });
                    }
                  };
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(m) {
                      if (m.type === 'attributes') stripBadAttrs(m.target);
                      if (m.type === 'childList') {
                        m.addedNodes.forEach(function(n) {
                          stripBadAttrs(n);
                          if (n.querySelectorAll) {
                            n.querySelectorAll('*').forEach(stripBadAttrs);
                          }
                        });
                      }
                    });
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked', 'bis_register']
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#0F172A]">
        <LanguageProvider>
          <AuthProvider>
            {children}
            <PwaInstaller />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0F766E',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: 'var(--font-noto-serif-bengali), var(--font-hind-siliguri), sans-serif',
                  borderRadius: '12px',
                  boxShadow: '0 16px 32px -20px rgba(15, 118, 110, 0.9)',
                },
              }}
            />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
