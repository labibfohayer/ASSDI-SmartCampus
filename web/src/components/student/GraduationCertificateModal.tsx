'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  QrCode,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export interface GraduationData {
  student_id: number;
  student_name: string;
  student_id_number: string;
  registration_no: string;
  batch_name: string;
  campus_name: string;
  total_sessions: number;
  attended_sessions: number;
  absent_sessions: number;
  attendance_percentage: number;
  average_understanding_percentage: number;
  average_understanding_rating: number;
  total_feedback_count: number;
  pending_help_requests: number;
  resolved_help_requests: number;
  is_eligible: boolean;
  eligibility_status: 'eligible' | 'on_track' | 'at_risk';
  eligibility_status_bn: string;
  overall_readiness_score: number;
  grade_en: string;
  grade_bn: string;
  criteria_checklist: Array<{
    key: string;
    label_bn: string;
    target: string;
    current: string;
    met: boolean;
  }>;
  certificate_info?: {
    certificate_no: string;
    title_bn: string;
    title_en: string;
    course_name: string;
    student_name: string;
    registration_no: string;
    issue_date: string;
    qr_verification_code: string;
    is_ready_for_issue: boolean;
    authorized_by: string;
  };
}

interface GraduationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GraduationData | null;
}

// Ornate Islamic geometric corner brackets
const OrnateCorner = ({ className }: { className: string }) => (
  <svg
    className={`absolute w-8 h-8 sm:w-10 sm:h-10 pointer-events-none text-[#C1982E] ${className}`}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 24V4H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M8 20V8H20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    <path d="M4 4L16 16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

export const GraduationCertificateModal: React.FC<GraduationCertificateModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !data || !mounted) return null;

  const cert = data.certificate_info || {
    certificate_no: `ASSDI-SBMC-${data.registration_no || '2026-001'}`,
    title_bn: 'কোর্স সমাপনী ও কৃতিত্ব সনদপত্র',
    title_en: 'Certificate of Course Completion & Academic Merit',
    course_name: 'স্মল বিজনেস ম্যানেজমেন্ট কোর্স (Small Business Management Course - SBMC)',
    student_name: data.student_name,
    registration_no: data.registration_no,
    issue_date: '১৫ নভেম্বর, ২০২৬',
    qr_verification_code: `ASSDI:CERT:SBMC:${data.student_id_number}:VERIFIED`,
    is_ready_for_issue: data.is_eligible,
    authorized_by: 'Shaikh Ahmadullah (Chairman)',
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      {/* Print-specific style tag */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #graduation-certificate-print-area,
          #graduation-certificate-print-area * {
            visibility: visible !important;
          }
          #graduation-certificate-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: scale(1) !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#0F766E] via-[#115E59] to-[#0F766E] text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#C1982E]/20 border border-[#C1982E]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm md:text-base leading-tight font-serif tracking-wide text-[#F3E5C8]">
                আস-সুন্নাহ প্রাতিষ্ঠানিক কোর্স সনদপত্র প্রিভিউ
              </h3>
              <p className="text-[10px] sm:text-xs text-amber-200/90 truncate max-w-xs sm:max-w-md">
                Course Completion & Merit Certificate • {data.batch_name || 'SBMC Batch 42'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C1982E] hover:bg-[#A17E24] text-white font-medium text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">প্রিন্ট / সেভ পিডিএফ</span>
              <span className="sm:hidden">প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Eligibility Notice Banner (Hidden in Print) */}
        {!data.is_eligible && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm print:hidden">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="leading-snug">
              <span className="font-bold">নমুনা প্রিভিউ (Sample Preview):</span> আপনার উপস্থিতি বা শর্তাবলি এখনও পূর্ণ হয়নি ({data.overall_readiness_score}% অর্জিত)। চূড়ান্ত কোর্স সমাপনীতে শর্তাবলী পূরণ হলে এই সনদপত্রটি কার্যকর ও ভেরিফায়েড হবে।
            </p>
          </div>
        )}

        {/* Certificate Display Canvas */}
        <div className="flex-1 min-h-0 p-2 sm:p-4 md:p-5 bg-slate-100/90 flex items-center justify-center overflow-auto">
          <div
            id="graduation-certificate-print-area"
            ref={certificateRef}
            className="relative aspect-[1.414/1] bg-white rounded-lg p-3 sm:p-5 pb-4 sm:pb-6 shadow-xl border-[2px] sm:border-[3px] border-[#0F766E] flex flex-col justify-between text-slate-800 select-none overflow-hidden mx-auto shrink-0"
            style={{
              maxHeight: 'min(62vh, 520px)',
              width: 'min(100%, calc(min(62vh, 520px) * 1.414))',
              aspectRatio: '1.414 / 1',
              backgroundImage: 'radial-gradient(circle at center, #FBFBF9 0%, #FFFFFF 100%)',
            }}
          >
            {/* Inner Golden Double Border */}
            <div className="absolute inset-1.5 sm:inset-2.5 border-2 border-[#C1982E]/70 rounded pointer-events-none" />
            <div className="absolute inset-2.5 sm:inset-3.5 border border-[#C1982E]/30 rounded pointer-events-none" />

            {/* Corner Arabesque Motifs */}
            <OrnateCorner className="top-1.5 sm:top-2.5 left-1.5 sm:left-2.5" />
            <OrnateCorner className="top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 rotate-90" />
            <OrnateCorner className="bottom-1.5 sm:bottom-2.5 left-1.5 sm:left-2.5 -rotate-90" />
            <OrnateCorner className="bottom-1.5 sm:bottom-2.5 right-1.5 sm:right-2.5 rotate-180" />

            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] z-0">
              <svg className="w-64 h-64 sm:w-80 sm:h-80" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M22 78 L78 22" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>

            {/* Certificate Header Section */}
            <div className="relative z-10 text-center flex flex-col items-center">
              {/* Govt Reg & Accreditation */}
              <div className="flex items-center gap-1.5 text-[7px] sm:text-[8px] text-slate-500 font-medium uppercase tracking-widest mb-0.5">
                <span>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত</span>
                <span className="text-[#C1982E]">•</span>
                <span>Govt. Reg. No: STP-DHA-000877</span>
              </div>

              {/* Institution Logo & Emblem */}
              <div className="flex items-center justify-center gap-2 my-0.5">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0F766E] text-[#D4AF37] flex items-center justify-center border-2 border-[#C1982E] shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              {/* Institute Name */}
              <h1 className="text-xs sm:text-base md:text-lg font-extrabold text-[#0F766E] tracking-tight font-serif mt-0.5">
                আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
              </h1>
              <p className="text-[7px] sm:text-[9px] font-semibold tracking-wider text-[#C1982E] uppercase">
                As-Sunnah Skill Development Institute
              </p>
              <p className="text-[7px] sm:text-[8px] text-slate-500">
                (একটি আস-সুন্নাহ ফাউন্ডেশন উদ্যোগ | An As-Sunnah Foundation Initiative)
              </p>

              {/* Certificate Title Badge */}
              <div className="relative mt-1 mb-0.5 inline-block">
                <div className="px-3 sm:px-5 py-0.5 bg-gradient-to-r from-[#0F766E] via-[#115E59] to-[#0F766E] rounded-full text-[#F3E5C8] border border-[#C1982E] shadow-2xs">
                  <span className="text-[9px] sm:text-[11px] font-bold tracking-wide font-serif">
                    কোর্স সমাপনী ও কৃতিত্ব সনদপত্র
                  </span>
                </div>
                <div className="text-[6px] sm:text-[7px] font-semibold text-slate-500 tracking-wider uppercase mt-0.5">
                  Certificate of Course Completion & Academic Merit
                </div>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="relative z-10 text-center my-auto px-2 sm:px-6 py-0.5">
              <p className="text-[8px] sm:text-[9px] text-slate-600 font-serif italic mb-0.5">
                এই মর্মে প্রত্যয়ন করা যাচ্ছে যে / This is to certify that
              </p>

              {/* Student Name */}
              <div className="inline-block relative my-0.5">
                <h2 className="text-xs sm:text-base md:text-lg font-black text-[#0F766E] tracking-tight font-serif border-b-2 border-[#C1982E] px-4 pb-0.5">
                  {data.student_name}
                </h2>
              </div>

              {/* Student Metadata Bar */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-[7px] sm:text-[9px] text-slate-600 font-medium my-0.5">
                <span>
                  আইডি: <strong className="text-slate-800 font-mono">{data.student_id_number}</strong>
                </span>
                <span className="text-[#C1982E]">•</span>
                <span>
                  রেজিস্ট্রেশন: <strong className="text-slate-800 font-mono">{data.registration_no}</strong>
                </span>
                <span className="text-[#C1982E]">•</span>
                <span>
                  ক্যাম্পাস: <strong className="text-slate-800">{data.campus_name}</strong>
                </span>
              </div>

              {/* Program Statement */}
              <p className="text-[8px] sm:text-[9px] text-slate-700 max-w-xl mx-auto leading-tight font-serif">
                সফলতার সাথে আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের ৩ মাস মেয়াদী
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#0F766E] my-0.5">
                {cert.course_name}
              </p>
              <p className="text-[7px] sm:text-[9px] text-slate-700 leading-tight font-serif">
                পাঠ্যক্রম, প্র্যাকটিক্যাল অ্যাসাইনমেন্ট ও মূল্যায়ন পরীক্ষায় অংশগ্রহণপূর্বক কৃতিত্বের সাথে কোর্স সম্পন্ন করেছেন।
              </p>

              {/* Merit Grade Badge */}
              <div className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded-md text-emerald-900 text-[8px] sm:text-[9px] font-semibold">
                <Sparkles className="w-2.5 h-2.5 text-[#C1982E]" />
                <span>অর্জিত গ্রেড ও কৃতিত্ব:</span>
                <span className="text-[#0F766E] font-bold">{data.grade_bn}</span>
                <span className="text-[7px] sm:text-[8px] text-emerald-700">({data.grade_en})</span>
              </div>
            </div>

            {/* Certificate Footer / Signatures & QR */}
            <div className="relative z-10 pt-1.5 border-t border-slate-200/90 grid grid-cols-3 items-end text-center mt-auto pb-1 px-2 sm:px-4">
              {/* Left Column: Chairman Signature */}
              <div className="flex flex-col items-center">
                <div className="h-4 sm:h-5 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic font-bold text-[#0F766E] text-[11px] sm:text-xs tracking-tight opacity-90 select-none">
                    শায়খ আহমাদুল্লাহ
                  </span>
                </div>
                <div className="w-16 sm:w-28 border-t border-slate-700 my-0.5" />
                <p className="font-bold text-[8px] sm:text-[9px] text-slate-800 leading-tight">
                  শায়খ আহমাদুল্লাহ
                </p>
                <p className="text-[6.5px] sm:text-[7.5px] text-slate-500">
                  চেয়ারম্যান, আস-সুন্নাহ ফাউন্ডেশন
                </p>
              </div>

              {/* Center Column: Official Embossed Seal & Serial */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-[#C1982E] bg-gradient-to-br from-[#FBF8EF] to-[#EBDCB7] p-0.5 shadow-2xs flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0F766E]" />
                  <span className="text-[4.5px] sm:text-[5.5px] font-bold text-[#0F766E] uppercase leading-none mt-0.5">
                    Official Seal
                  </span>
                </div>
                <p className="text-[6.5px] sm:text-[7.5px] font-mono text-slate-500 mt-0.5">
                  সনদ নং: {cert.certificate_no}
                </p>
                <p className="text-[6.5px] sm:text-[7.5px] text-slate-500">
                  ইস্যুর তারিখ: {cert.issue_date}
                </p>
              </div>

              {/* Right Column: Coordinator Signature & Verification QR */}
              <div className="flex flex-col items-center">
                <div className="h-4 sm:h-5 flex items-center justify-center">
                  <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs">
                    <QRCodeSVG
                      value={cert.qr_verification_code}
                      size={24}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#0F766E"
                    />
                  </div>
                </div>
                <div className="w-16 sm:w-28 border-t border-slate-700 my-0.5" />
                <p className="font-bold text-[8px] sm:text-[9px] text-slate-800 leading-tight">
                  কোর্স সমন্বয়ক
                </p>
                <p className="text-[6.5px] sm:text-[7.5px] text-slate-500">
                  আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              সনদপত্রটি আস-সুন্নাহ কেন্দ্রীয় ডাটাবেজে স্থায়ীভাবে এনক্রিপ্ট ও ভেরিফায়েড।
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
