'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTeachersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/courses');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
    </div>
  );
}
