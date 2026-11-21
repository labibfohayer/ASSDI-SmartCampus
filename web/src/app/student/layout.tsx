'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLoggedIn } from '@/lib/auth';
import StudentNavbar from '@/components/student/StudentNavbar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isMounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }

    // Role check: Only students (or super_admin)
    if (user && user.role !== 'student' && user.role !== 'super_admin') {
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
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col text-gray-900">
      <StudentNavbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
      <footer className="border-t border-emerald-100/60 bg-white py-4 text-center text-xs text-gray-500">
        <p>© 2026 আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI) • শিক্ষার্থী লার্নিং পোর্টাল</p>
      </footer>
    </div>
  );
}
