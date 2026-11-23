'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import DashboardShell from '@/components/layout/DashboardShell';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isMounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }

    // Strict role check: ONLY students are allowed on /student
    if (user && user.role !== 'student') {
      const targetDashboard =
        user.role === 'super_admin'
          ? '/admin'
          : user.role === 'teacher'
          ? '/teacher'
          : user.role === 'coordinator'
          ? '/coordinator'
          : '/login';
      router.replace(targetDashboard);
    }
  }, [user, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in as non-student, do NOT render student dashboard
  if (user && user.role !== 'student') {
    const targetDashboard =
      user.role === 'super_admin'
        ? '/admin'
        : user.role === 'teacher'
        ? '/teacher'
        : user.role === 'coordinator'
        ? '/coordinator'
        : '/login';

    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A]">
              শুধুমাত্র শিক্ষার্থীদের জন্য সংরক্ষিত
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              এই পোর্টালটি শুধুমাত্র নিবন্ধিত শিক্ষার্থীদের জন্য নির্ধারিত। আপনি{' '}
              <strong className="text-slate-800">{user.full_name} ({user.role})</strong> অ্যাকাউন্টে লগইন অবস্থায় আছেন।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.replace(targetDashboard)}
              className="w-full py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>আপনার ড্যাশবোর্ডে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell role="student">
      {children}
    </DashboardShell>
  );
}
