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

    // Role check: Coordinator & Super admin are allowed in /coordinator
    const allowed = ['coordinator', 'super_admin'];
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

  return (
    <DashboardShell role="coordinator">
      {children}
    </DashboardShell>
  );
}
