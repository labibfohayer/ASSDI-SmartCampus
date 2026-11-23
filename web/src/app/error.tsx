'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('ASSDI Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-5 text-[#DC2626]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 text-xs font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-full mb-3">
          ত্রুটি সংঘটিত হয়েছে
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-serif mb-2">
          দুঃখিত, কোনো একটি সমস্যা হয়েছে
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-6">
          সিস্টেম সাময়িকভাবে আপনার অনুরোধটি সম্পূর্ণ করতে পারেনি। পৃষ্ঠাটি রিলোড করে পুনরায় চেষ্টা করুন।
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 py-2.5 px-4 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পুনরায় চেষ্টা করুন</span>
          </button>

          <Link
            href="/"
            className="w-full sm:flex-1 py-2.5 px-4 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#475569]" />
            <span>হোমে যান</span>
          </Link>
        </div>
      </div>

      <p className="mt-8 text-xs text-[#94A3B8]">
        আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI)
      </p>
    </div>
  );
}
