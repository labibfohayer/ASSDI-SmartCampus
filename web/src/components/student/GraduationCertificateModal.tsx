'use client';

import React, { useRef } from 'react';
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
    className={`absolute w-12 h-12 pointer-events-none text-[#C1982E] ${className}`}
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

  if (!isOpen || !data) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
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

      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#B45309] via-[#92400E] to-[#B45309] text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C1982E]/20 border border-[#C1982E]/40 flex items-center justify-center text-[#D4AF37]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight font-serif tracking-wide text-[#F3E5C8]">
                আস-সুন্নাহ প্রাতিষ্ঠানিক কোর্স সনদপত্র প্রিভিউ
              </h3>
              <p className="text-xs text-amber-200/90">
                Course Completion & Merit Certificate • SBMC Batch 42
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C1982E] hover:bg-[#A17E24] text-white font-medium text-xs sm:text-sm shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / সেভ পিডিএফ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Eligibility Notice Banner (Hidden in Print) */}
        {!data.is_eligible && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-amber-800 text-xs sm:text-sm print:hidden">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <span className="font-semibold">নমুনা প্রিভিউ (Sample Preview):</span> আপনার উপস্থিতি বা শর্তাবলি এখনও পূর্ণ হয়নি ({data.overall_readiness_score}% অর্জিত)। চূড়ান্ত কোর্স সমাপনীতে শর্তাবলী পূরণ হলে এই সনদপত্রটি কার্যকর ও ভেরিফায়েড হবে।
            </p>
          </div>
        )}

        {/* Certificate Display Canvas */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100/70 flex justify-center items-center">
          <div
            id="graduation-certificate-print-area"
            ref={certificateRef}
            className="relative w-full aspect-[1.414/1] max-w-[960px] bg-white rounded-lg p-6 sm:p-10 shadow-lg border-[3px] border-[#B45309] flex flex-col justify-between text-slate-800 select-none overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at center, #FBFBF9 0%, #FFFFFF 100%)',
            }}
          >
            {/* Inner Golden Double Border */}
            <div className="absolute inset-2 sm:inset-3 border-2 border-[#C1982E]/70 rounded pointer-events-none" />
            <div className="absolute inset-3 sm:inset-4 border border-[#C1982E]/30 rounded pointer-events-none" />

            {/* Corner Arabesque Motifs */}
            <OrnateCorner className="top-3 left-3" />
            <OrnateCorner className="top-3 right-3 rotate-90" />
            <OrnateCorner className="bottom-3 left-3 -rotate-90" />
            <OrnateCorner className="bottom-3 right-3 rotate-180" />

            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] z-0">
              <svg className="w-96 h-96" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M22 78 L78 22" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>

            {/* Certificate Header Section */}
            <div className="relative z-10 text-center flex flex-col items-center">
              {/* Govt Reg & Accreditation */}
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">
                <span>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত</span>
                <span className="text-[#C1982E]">•</span>
                <span>Govt. Reg. No: STP-DHA-000877</span>
              </div>

              {/* Institution Logo & Emblem */}
              <div className="flex items-center justify-center gap-3 my-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#B45309] text-[#D4AF37] flex items-center justify-center border-2 border-[#C1982E] shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              {/* Institute Name */}
              <h1 className="text-xl sm:text-3xl font-extrabold text-[#B45309] tracking-tight font-serif mt-1">
                আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
              </h1>
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#C1982E] uppercase mt-0.5">
                As-Sunnah Skill Development Institute
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500">
                (একটি আস-সুন্নাহ ফাউন্ডেশন উদ্যোগ | An As-Sunnah Foundation Initiative)
              </p>

              {/* Certificate Title Badge */}
              <div className="relative mt-3 sm:mt-4 mb-2 inline-block">
                <div className="px-6 sm:px-10 py-1 sm:py-1.5 bg-gradient-to-r from-[#B45309] via-[#92400E] to-[#B45309] rounded-full text-[#F3E5C8] border border-[#C1982E] shadow-sm">
                  <span className="text-xs sm:text-base font-bold tracking-wide font-serif">
                    কোর্স সমাপনী ও কৃতিত্ব সনদপত্র
                  </span>
                </div>
                <div className="text-[9px] sm:text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1">
                  Certificate of Course Completion & Academic Merit
                </div>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="relative z-10 text-center my-auto px-4 sm:px-12 py-2">
              <p className="text-xs sm:text-sm text-slate-600 font-serif italic mb-1.5">
                এই মর্মে প্রত্যয়ন করা যাচ্ছে যে / This is to certify that
              </p>

              {/* Student Name */}
              <div className="inline-block relative my-1">
                <h2 className="text-xl sm:text-3xl font-black text-[#B45309] tracking-tight font-serif border-b-2 border-[#C1982E] px-6 pb-1">
                  {data.student_name}
                </h2>
              </div>

              {/* Student Metadata Bar */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-slate-600 font-medium my-2">
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
              <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed mt-2 font-serif">
                সফলতার সাথে আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের ৩ মাস মেয়াদী
              </p>
              <p className="text-sm sm:text-base font-bold text-[#B45309] my-1">
                {cert.course_name}
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                পাঠ্যক্রম, প্র্যাকটিক্যাল অ্যাসাইনমেন্ট ও মূল্যায়ন পরীক্ষায় অংশগ্রহণপূর্বক কৃতিত্বের সাথে কোর্স সম্পন্ন করেছেন।
              </p>

              {/* Merit Grade Badge */}
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs sm:text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-[#C1982E]" />
                <span>অর্জিত গ্রেড ও কৃতিত্ব:</span>
                <span className="text-[#B45309] font-bold">{data.grade_bn}</span>
                <span className="text-xs text-emerald-700">({data.grade_en})</span>
              </div>
            </div>

            {/* Certificate Footer / Signatures & QR */}
            <div className="relative z-10 pt-4 border-t border-slate-200/90 grid grid-cols-3 items-end text-center mt-2">
              {/* Left Column: Chairman Signature */}
              <div className="flex flex-col items-center">
                <div className="h-10 sm:h-12 flex items-end justify-center pb-1">
                  {/* Stylized Arabic / Bengali Signature Representation */}
                  <span className="font-serif italic font-bold text-[#B45309] text-lg sm:text-xl tracking-tight opacity-90 select-none">
                    শায়খ আহমাদুল্লাহ
                  </span>
                </div>
                <div className="w-32 sm:w-44 border-t border-slate-700 my-1" />
                <p className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">
                  শায়খ আহমাদুল্লাহ
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  চেয়ারম্যান, আস-সুন্নাহ ফাউন্ডেশন
                </p>
              </div>

              {/* Center Column: Official Embossed Seal & Serial */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#C1982E] bg-gradient-to-br from-[#FBF8EF] to-[#EBDCB7] p-1 shadow-sm flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#B45309]" />
                  <span className="text-[7px] sm:text-[8px] font-bold text-[#B45309] uppercase leading-none mt-0.5">
                    Official Seal
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 mt-1.5">
                  সনদ নং: {cert.certificate_no}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-500">
                  ইস্যুর তারিখ: {cert.issue_date}
                </p>
              </div>

              {/* Right Column: Coordinator Signature & Verification QR */}
              <div className="flex flex-col items-center">
                <div className="h-10 sm:h-12 flex items-center justify-center">
                  <div className="p-1 bg-white border border-slate-300 rounded shadow-xs">
                    <QRCodeSVG
                      value={cert.qr_verification_code}
                      size={44}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#B45309"
                    />
                  </div>
                </div>
                <div className="w-32 sm:w-44 border-t border-slate-700 my-1" />
                <p className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">
                  কোর্স সমন্বয়ক
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              সনদপত্রটি আস-সুন্নাহ কেন্দ্রীয় ডাটাবেজে স্থায়ীভাবে এনক্রিপ্ট ও ভেরিফায়েড।
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B45309] hover:bg-[#92400E] text-white font-medium text-xs sm:text-sm shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
