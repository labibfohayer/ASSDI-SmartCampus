'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Image
            src="/logo.png"
            alt="ASSDI Logo"
            width={44}
            height={44}
            className="object-contain"
          />
        </div>

        <span className="inline-block px-3 py-1 text-xs font-bold text-[#0369A1] bg-[#F0FDFA] border border-[#CCFBF1] rounded-full mb-3">
          ৪০৪ • পেজটি পাওয়া যায়নি
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-serif mb-2">
          অনুরোধকৃত পাতাটি বিদ্যমান নেই
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-6">
          আপনি যে ঠিকানাটি খুঁজছেন তা স্থানান্তরিত করা হয়েছে অথবা বর্তমানে উপলব্ধ নেই। দয়া করে সঠিক লিঙ্ক নিশ্চিত করুন।
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="w-full sm:flex-1 py-2.5 px-4 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>মূল পাতায় যান</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:flex-1 py-2.5 px-4 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#475569]" />
            <span>পূর্ববর্তী পাতা</span>
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-[#94A3B8]">
        আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI)
      </p>
    </div>
  );
}
