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

    // Strict role check: Super admin stays exclusively in /admin; coordinator & observer in /coordinator
    if (user && user.role === 'super_admin') {
      router.replace('/admin');
      return;
    }

    const allowed = ['coordinator', 'observer'];
    if (user && !allowed.includes(user.role)) {
      router.replace('/login');
    }
  }, [user, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
      </div>
    );
  }

  // Strict role isolation: Super admin is redirected to /admin
  if (user && user.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-[#D97706]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A] font-heading">
              {isBangla ? 'সুপার অ্যাডমিন ড্যাশবোর্ডে পুনঃনির্দেশ করা হচ্ছে' : 'Redirecting to Super Admin Dashboard'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              {isBangla
                ? 'সুপার অ্যাডমিন শুধুমাত্র নিজস্ব ড্যাশবোর্ডে কার্যক্রম পরিচালনা করবেন।'
                : 'Super Admins operate exclusively from the Super Admin dashboard.'}
            </p>
          </div>
          <button
            onClick={() => router.replace('/admin')}
            className="w-full py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            {isBangla ? 'সুপার অ্যাডমিন ড্যাশবোর্ডে যান' : 'Go to Super Admin Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  const isObserver = user?.role === 'observer';

  const noticeBanner = isObserver ? (
    <div className="bg-[#FFFBEB] text-[#92400E] px-4 py-2 text-xs font-medium border-b border-[#FCD34D]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#0F766E] shrink-0" />
          <span>
            {isBangla
              ? 'পর্যবেক্ষক মোড (Observer Mode) সক্রিয়: শুধুমাত্র এগ্রিগেট মেট্রিক ও সামগ্রিক রিপোর্ট দৃশ্যমান। ব্যক্তিগত ফোন বা যোগাযোগ তথ্য গোপন রাখা হয়েছে।'
              : 'Observer Mode Active: Aggregate metrics & summary reports visible only. Personal contact details are protected.'}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#0F766E] text-white text-[10px] uppercase font-bold tracking-wider">
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
