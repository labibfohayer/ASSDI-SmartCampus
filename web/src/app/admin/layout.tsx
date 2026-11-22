'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import DashboardShell from '@/components/layout/DashboardShell';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  // Role check: Only super_admin
  if (user && user.role !== 'super_admin') {
    const userDashboard =
      user.role === 'student'
        ? '/student'
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
            <h2 className="text-base font-extrabold text-[#0B2A21]">
              শুধুমাত্র সুপার অ্যাডমিনের জন্য সংরক্ষিত
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              এই পোর্টালটি শুধুমাত্র সুপার অ্যাডমিন অ্যাকাউন্টের জন্য নির্ধারিত। আপনি বর্তমানে{' '}
              <strong className="text-slate-800">{user.full_name} ({user.role})</strong> অ্যাকাউন্টে লগইন অবস্থায় আছেন।
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={async () => {
                await logoutUser();
                router.replace('/login');
              }}
              className="w-full py-2.5 bg-[#0B2A21] hover:bg-[#164E3D] text-[#E5C378] text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#C5A059]" />
              <span>লগআউট করে অ্যাডমিন হিসেবে লগইন করুন</span>
            </button>

            <button
              onClick={() => router.replace(userDashboard)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>আপনার ড্যাশবোর্ডে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell role="super_admin">
      {children}
    </DashboardShell>
  );
}
