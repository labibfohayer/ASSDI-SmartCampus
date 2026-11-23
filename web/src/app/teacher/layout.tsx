'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import DashboardShell from '@/components/layout/DashboardShell';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, isMounted, logoutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
  }, [user, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  // Role guard: Only teacher can view the teacher dashboard. Super admin stays in /admin
  if (user && user.role === 'super_admin') {
    router.replace('/admin');
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A]">
              শুধুমাত্র শিক্ষকগণের জন্য সংরক্ষিত
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              এই পোর্টালটি আস-সুন্নাহ ইনস্টিটিউটের শিক্ষকগণের জন্য নির্ধারিত। আপনি বর্তমানে{' '}
              <strong className="text-slate-800">{user.full_name} ({user.role})</strong> অ্যাকাউন্টে লগইন অবস্থায় আছেন।
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={async () => {
                await logoutUser();
                router.replace('/login');
              }}
              className="w-full py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>লগআউট করে শিক্ষক হিসেবে লগইন করুন</span>
            </button>

            <button
              onClick={() => router.replace('/student')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>শিক্ষার্থী ড্যাশবোর্ডে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell role="teacher">
      {children}
    </DashboardShell>
  );
}
