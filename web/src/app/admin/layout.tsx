'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import DashboardShell from '@/components/layout/DashboardShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isMounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }

    // Role check: Only super_admin
    if (user && user.role !== 'super_admin') {
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

  return (
    <DashboardShell role="super_admin">
      {children}
    </DashboardShell>
  );
}
