'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole, isLoggedIn } from '@/lib/auth';

export default function HomePage() {
  const { user, isMounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted) return;

    if (isLoggedIn() && user) {
      router.replace(getDefaultRouteForRole(user.role));
    } else {
      router.replace('/login');
    }
  }, [user, isMounted, router]);

  return (
    <div className="min-h-screen bg-[#0B2A21] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-900 border-t-[#C5A059] rounded-full animate-spin" />
        <p className="text-emerald-100 text-sm font-semibold tracking-wide">
          লোড হচ্ছে...
        </p>
      </div>
    </div>
  );
}
