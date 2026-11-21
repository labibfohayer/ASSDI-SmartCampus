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
    <div className="min-h-screen bg-[#1B4D3E] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white text-sm font-medium tracking-wide">
          লোড হচ্ছে...
        </p>
      </div>
    </div>
  );
}
