import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট | ASSDI',
  description: 'শিক্ষার্থী লার্নিং প্রগ্রেস, ফিডব্যাক ও ম্যানেজমেন্ট সিস্টেম - স্মল বিজনেস ম্যানেজমেন্ট কোর্স (SBMC)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning className={`${hindSiliguri.variable} h-full antialiased`}>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
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
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans bg-[#F8FAF9] text-gray-900">
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1B4D3E',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: 'var(--font-hind-siliguri), sans-serif',
                },
              }}
            />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
