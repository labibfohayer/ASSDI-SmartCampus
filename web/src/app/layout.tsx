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
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAF9] text-gray-900">
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
