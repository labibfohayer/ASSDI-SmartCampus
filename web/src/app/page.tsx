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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#FCD34D] border-t-[#B45309] rounded-full animate-spin" />
        <p className="text-[#B45309] text-sm font-semibold tracking-wide font-serif">
          লোড হচ্ছে...
        </p>
      </div>
    </div>
  );
}
