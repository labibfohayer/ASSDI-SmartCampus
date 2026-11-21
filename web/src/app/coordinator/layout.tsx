'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import DashboardShell from '@/components/layout/DashboardShell';
import { Eye, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const { user, isMounted } = useAuth();
  const { isBangla } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }

    // Role check: coordinator, super_admin, observer
    const allowed = ['coordinator', 'super_admin', 'observer'];
    if (user && !allowed.includes(user.role)) {
      router.replace('/login');
    }
  }, [user, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  const isObserver = user?.role === 'observer';

  const noticeBanner = isObserver ? (
    <div className="bg-purple-900 text-purple-100 px-4 py-2 text-xs font-medium border-b border-purple-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-300 shrink-0" />
          <span>
            {isBangla
              ? 'পর্যবেক্ষক মোড (Observer Mode) সক্রিয়: শুধুমাত্র এগ্রিগেট মেট্রিক ও সামগ্রিক রিপোর্ট দৃশ্যমান। ব্যক্তিগত ফোন বা যোগাযোগ তথ্য গোপন রাখা হয়েছে।'
              : 'Observer Mode Active: Aggregate metrics & summary reports visible only. Personal contact details are protected.'}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-purple-800 text-[10px] uppercase font-bold tracking-wider">
          Read-Only
        </span>
      </div>
    </div>
  ) : null;

  return (
    <DashboardShell role={isObserver ? 'observer' : 'coordinator'} noticeBanner={noticeBanner}>
      {children}
    </DashboardShell>
  );
}
