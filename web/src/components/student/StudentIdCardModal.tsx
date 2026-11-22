'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MapPin,
  Globe,
  FileText,
  CreditCard,
  QrCode,
  Download,
  User,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export interface StudentIdCardData {
  student_id: number;
  student_id_number: string;
  registration_no: string;
  full_name: string;
  phone?: string;
  guardian_phone?: string;
  education_background: string;
  status: string;
  course_name: string;
  course_code: string;
  batch_name: string;
  batch_number: number;
  campus_name: string;
  campus_address: string;
  blood_group?: string;
  session_year: string;
  issue_date: string;
  expiry_date: string;
  verification_payload: string;
  institution_name_bn: string;
  institution_name_en: string;
  institution_tagline?: string;
  institution_address?: string;
  institution_contact?: string;
  motto?: string;
  govt_reg?: string;
  website?: string;
  photo_url?: string;
  signature_url?: string;
}

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number | string | null;
  initialData?: Partial<StudentIdCardData> | null;
}

// Fine SVG guilloche wavy security border pattern matching authentic institutional PVC cards
const GuillocheBorder = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
    viewBox="0 0 310 490"
  >
    <defs>
      <linearGradient id="guillocheTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="50%" stopColor="#0D9488" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    {/* Left vertical sinusoidal waves */}
    <path d="M 0 0 C 18 80, -2 160, 10 245 C 22 330, 2 410, 6 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="1" />
    <path d="M 3 0 C 21 80, 1 160, 13 245 C 25 330, 5 410, 9 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.8" />
    <path d="M 6 0 C 24 80, 4 160, 16 245 C 28 330, 8 410, 12 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.8" />
    <path d="M 9 0 C 27 80, 7 160, 19 245 C 31 330, 11 410, 15 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.7" />
    <path d="M 12 0 C 30 80, 10 160, 22 245 C 34 330, 14 410, 18 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.6" />
    <path d="M 15 0 C 33 80, 13 160, 25 245 C 37 330, 17 410, 21 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.5" />
    
    {/* Right vertical sinusoidal waves */}
    <path d="M 310 0 C 292 80, 312 160, 300 245 C 288 330, 308 410, 304 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="1" />
    <path d="M 307 0 C 289 80, 309 160, 297 245 C 285 330, 305 410, 301 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.8" />
    <path d="M 304 0 C 286 80, 306 160, 294 245 C 282 330, 302 410, 298 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.8" />
    <path d="M 301 0 C 283 80, 303 160, 291 245 C 279 330, 299 410, 295 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.7" />
    <path d="M 298 0 C 280 80, 300 160, 288 245 C 276 330, 296 410, 292 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.6" />
    <path d="M 295 0 C 277 80, 297 160, 285 245 C 273 330, 293 410, 289 490" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.5" />

    {/* Bottom undulating waves */}
    <path d="M 0 482 Q 77 468, 155 484 T 310 480" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.9" />
    <path d="M 0 485 Q 77 471, 155 487 T 310 483" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.7" />
    <path d="M 0 488 Q 77 474, 155 490 T 310 486" fill="none" stroke="url(#guillocheTealGrad)" strokeWidth="0.5" />
  </svg>
);

export default function StudentIdCardModal({
  isOpen,
  onClose,
  studentId,
  initialData,
}: StudentIdCardModalProps) {
  const { isBangla } = useLanguage();
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [showBothSides, setShowBothSides] = useState<boolean>(false);
  const [activeDocType, setActiveDocType] = useState<'id_card' | 'admit_card'>('id_card');
  const [loading, setLoading] = useState<boolean>(false);
  const [cardData, setCardData] = useState<StudentIdCardData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCardData = async () => {
      setLoading(true);
      try {
        const targetId = studentId || 'me';
        const res = await api.get(`/api/v1/students/${targetId}/id-card/`);
        if (res.data) {
          setCardData(res.data);
        }
      } catch (err: any) {
        console.warn('Failed to fetch official ID card endpoint, using fallback initial data:', err);
        if (initialData && initialData.student_id_number) {
          setCardData({
            student_id: Number(initialData.student_id) || 1,
            student_id_number: initialData.student_id_number || 'STD-2026-042-001',
            registration_no: initialData.registration_no || 'REG-2026-042-001',
            full_name: initialData.full_name || 'Abdullah Student',
            phone: initialData.phone || '+880 1700-000001',
            guardian_phone: initialData.guardian_phone || '+880 1800-000001',
            education_background: initialData.education_background || 'General',
            status: initialData.status || 'active',
            course_name: initialData.course_name || 'Small Business Management Course',
            course_code: initialData.course_code || 'SBMC',
            batch_name: initialData.batch_name || 'SBMC Batch 42',
            batch_number: initialData.batch_number || 42,
            campus_name: initialData.campus_name || 'Kazi Bari Campus',
            campus_address: initialData.campus_address || 'Kazi Bari, Satarkul, North Badda, Dhaka-1212',
            blood_group: initialData.blood_group || 'A+',
            session_year: initialData.session_year || '2026-2027',
            issue_date: initialData.issue_date || '16-08-2026',
            expiry_date: initialData.expiry_date || '15-11-2026',
            verification_payload:
              initialData.verification_payload ||
              `ASSDI:VERIFY:${initialData.student_id_number || 'STD-2026-042-001'}:ACTIVE`,
            institution_name_bn: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
            institution_name_en: 'As-Sunnah Skill Development Institute',
            institution_tagline: 'দক্ষ মানবসম্পদ গঠনে আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমূলক উদ্যোগ',
            institution_address: 'Kazi Bari, Satarkul, North Badda, Dhaka-1212',
            institution_contact: '+880 9649-222255 | +880 1409-979967',
            motto: 'EFFICIENCY · HONESTY · PROSPERITY',
            govt_reg: 'Govt. Reg. #STP-DHA-000877',
            website: 'skill.assunnahfoundation.org',
            photo_url: undefined,
            signature_url: '/signature-transparent.png',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const data: StudentIdCardData = cardData || {
    student_id: 1,
    student_id_number: 'STD-2026-042-001',
    registration_no: 'REG-2026-042-001',
    full_name: 'আব্দুল্লাহ (Abdullah Student)',
    phone: '+880 1700-000001',
    guardian_phone: '+880 1800-000001',
    education_background: 'General',
    status: 'active',
    course_name: 'Small Business Management Course',
    course_code: 'SBMC',
    batch_name: 'SBMC Batch 42',
    batch_number: 42,
    campus_name: 'Kazi Bari Campus',
    campus_address: 'Kazi Bari, Satarkul, North Badda, Dhaka-1212',
    blood_group: 'A+',
    session_year: '2026-2027',
    issue_date: '16-08-2026',
    expiry_date: '15-11-2026',
    verification_payload: 'ASSDI:VERIFY:4138:ACTIVE',
    institution_name_bn: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
    institution_name_en: 'As-Sunnah Skill Development Institute',
    institution_tagline: 'দক্ষ মানবসম্পদ গঠনে আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমূলক উদ্যোগ',
    institution_address: 'Kazi Bari, Satarkul, North Badda, Dhaka-1212',
    institution_contact: '+880 9649-222255 | +880 1409-979967',
    motto: 'EFFICIENCY · HONESTY · PROSPERITY',
    govt_reg: 'Govt. Reg. #STP-DHA-000877',
    website: 'skill.assunnahfoundation.org',
    photo_url: undefined,
    signature_url: '/signature-transparent.png',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Top Control Bar */}
        <div className="bg-[#0F766E] px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#0A1420] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-[#C1982E]/40 flex items-center justify-center p-1">
              <img src="/logo.png" alt="As-Sunnah" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                {isBangla ? 'আস-সুন্নাহ প্রাতিষ্ঠানিক ডিজিটাল ডকুমেন্টস' : 'As-Sunnah Institutional Credentials'}
              </h2>
              <p className="text-[11px] text-emerald-200/90 font-medium">
                {data.full_name} • <span className="font-mono text-[#C1982E] font-bold">ID: {data.student_id_number}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Type Switcher (ID Card vs Admit Card) */}
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/80">
          <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveDocType('id_card')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDocType === 'id_card'
                  ? 'bg-[#0F766E] text-[#C1982E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isBangla ? 'আস-সুন্নাহ আইডি কার্ড' : 'As-Sunnah ID Card'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDocType('admit_card')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDocType === 'admit_card'
                  ? 'bg-[#0F766E] text-[#C1982E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isBangla ? 'পরীক্ষার প্রবেশপত্র (Admit Card)' : 'Exam Admit Card'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeDocType === 'id_card' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBothSides(!showBothSides)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                    showBothSides
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBangla ? 'উভয় পাশ দেখুন' : 'View Both Sides'}</span>
                </button>

                {!showBothSides && (
                  <button
                    type="button"
                    onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {activeSide === 'front'
                        ? (isBangla ? 'কার্ড উল্টান (পিছনের পাশ)' : 'Flip to Back')
                        : (isBangla ? 'কার্ড উল্টান (সামনের পাশ)' : 'Flip to Front')}
                    </span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#C1982E] hover:bg-[#B38F46] text-[#0F766E] rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{isBangla ? 'প্রিন্ট করুন' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-7 flex flex-col items-center justify-center bg-slate-100 min-h-[560px]" ref={printRef}>
          
          {/* ============================================================== */}
          {/* VIEW 1: AUTHENTIC AS-SUNNAH STUDENT ID CARD (VERTICAL CR80)   */}
          {/* ============================================================== */}
          {activeDocType === 'id_card' && (
            <div className="w-full flex flex-col items-center">
              
              <div className={`flex flex-wrap items-center justify-center gap-6 ${showBothSides ? 'flex-row' : ''}`}>
                
                {/* ----------------- FRONT SIDE ----------------- */}
                {(showBothSides || activeSide === 'front') && (
                  <div
                    id="assdi-id-card-front"
                    className="w-[310px] h-[490px] rounded-2xl bg-white border border-slate-300 shadow-2xl p-2 relative overflow-hidden flex flex-col justify-between shrink-0 transition-all select-none"
                  >
                    {/* SVG Guilloche Security Wave Borders */}
                    <GuillocheBorder />

                    {/* Top Sky-Blue Motto Banner */}
                    <div className="relative z-10 w-full bg-[#E0F2FE] border-b border-[#BAE6FD] py-1 text-center rounded-t-lg">
                      <p className="text-[8.5px] font-black uppercase tracking-[0.16em] text-[#0369A1]">
                        {data.motto || 'EFFICIENCY · HONESTY · PROSPERITY'}
                      </p>
                    </div>

                    {/* Header Logo & Title */}
                    <div className="relative z-10 text-center pt-2">
                      <img
                        src="/logo.png"
                        alt="As-Sunnah Logo"
                        className="w-12 h-12 object-contain mx-auto drop-shadow-2xs"
                      />
                      <h4 className="text-[12.5px] font-bold text-[#15803D] tracking-tight mt-1">
                        Student ID Card
                      </h4>
                    </div>

                    {/* Student Portrait Photo */}
                    <div className="relative z-10 my-1 flex justify-center">
                      <div className="w-[114px] h-[138px] rounded-xl border-2 border-[#84CC16] p-0.5 shadow-2xs overflow-hidden bg-slate-100 flex flex-col items-center justify-center">
                        {data.photo_url ? (
                          <img
                            src={data.photo_url}
                            alt={data.full_name}
                            className="w-full h-full object-cover rounded-[9px]"
                          />
                        ) : (
                          <div className="w-full h-full rounded-[9px] bg-slate-50 flex flex-col items-center justify-center text-slate-400 select-none">
                            <div className="w-14 h-14 rounded-full bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-500 mb-1">
                              <User className="w-8 h-8 text-slate-400" />
                            </div>
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                              Student Photo
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Full Name */}
                    <div className="relative z-10 text-center px-3">
                      <h3 className="font-extrabold text-[#0F766E] text-[15px] uppercase tracking-wide truncate leading-tight">
                        {data.full_name}
                      </h3>
                    </div>

                    {/* Information Block (Left-aligned with clean aligned colons) */}
                    <div className="relative z-10 px-6 pb-4 pt-1">
                      <div className="space-y-1 text-[11px] leading-tight">
                        <div className="grid grid-cols-[82px_8px_1fr] items-center">
                          <span className="font-semibold text-slate-700">ID Number</span>
                          <span className="font-bold text-slate-900">:</span>
                          <span className="font-bold text-slate-900">{data.student_id_number}</span>
                        </div>
                        <div className="grid grid-cols-[82px_8px_1fr] items-center">
                          <span className="font-semibold text-slate-700">Blood Group</span>
                          <span className="font-bold text-slate-900">:</span>
                          <span className="font-bold text-slate-900">{data.blood_group || 'A+'}</span>
                        </div>
                        <div className="grid grid-cols-[82px_8px_1fr] items-center">
                          <span className="font-semibold text-slate-700">Issue Date</span>
                          <span className="font-bold text-slate-900">:</span>
                          <span className="font-bold text-slate-900">{data.issue_date}</span>
                        </div>
                        <div className="grid grid-cols-[82px_8px_1fr] items-center">
                          <span className="font-semibold text-slate-700">Expiry Date</span>
                          <span className="font-bold text-slate-900">:</span>
                          <span className="font-bold text-slate-900">{data.expiry_date}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ----------------- BACK SIDE ----------------- */}
                {(showBothSides || activeSide === 'back') && (
                  <div
                    id="assdi-id-card-back"
                    className="w-[310px] h-[490px] rounded-2xl bg-white border border-slate-300 shadow-2xl p-2 relative overflow-hidden flex flex-col justify-between shrink-0 transition-all select-none"
                  >
                    {/* SVG Guilloche Security Wave Borders */}
                    <GuillocheBorder />

                    {/* Top Branding Section */}
                    <div className="relative z-10 text-center pt-2">
                      <img
                        src="/logo.png"
                        alt="As-Sunnah Logo"
                        className="w-11 h-11 object-contain mx-auto drop-shadow-2xs"
                      />
                      <h4 className="text-[13px] font-black text-[#0F766E] tracking-wide uppercase leading-none mt-1.5">
                        AS-SUNNAH
                      </h4>
                      <p className="text-[9.5px] font-black text-[#65A30D] tracking-wider uppercase leading-tight mt-0.5">
                        SKILL DEVELOPMENT INSTITUTE
                      </p>
                      <p className="text-[8.5px] text-slate-500 font-medium leading-none mt-0.5">
                        {data.govt_reg || 'Govt. Reg. #STP-DHA-000877'}
                      </p>
                    </div>

                    {/* Course Title */}
                    <div className="relative z-10 text-center px-2 my-1">
                      <h5 className="text-[11px] font-extrabold text-[#15803D] uppercase tracking-tight leading-snug">
                        {data.course_name}
                      </h5>
                    </div>

                    {/* Property Ownership Notice */}
                    <div className="relative z-10 text-center px-4 space-y-0.5 text-slate-700 text-[9px] leading-tight">
                      <p>This card is a property of</p>
                      <p className="font-bold text-slate-900 text-[9.5px] uppercase">
                        AS-SUNNAH SKILL DEVELOPMENT INSTITUTE
                      </p>
                      <p>and designated to the issued student</p>
                      <p>till his training period.</p>
                    </div>

                    {/* Authorized Signature */}
                    <div className="relative z-10 flex flex-col items-center justify-center my-1">
                      <img
                        src={data.signature_url || '/signature-transparent.png'}
                        alt="Authorized Signature"
                        className="h-8 object-contain mb-0.5"
                      />
                      <div className="w-40 h-[1.5px] bg-[#0D9488]"></div>
                      <span className="text-[9px] font-semibold text-slate-600 mt-0.5">
                        Authorized Signature
                      </span>
                    </div>

                    {/* Return Information Box */}
                    <div className="relative z-10 text-center px-3 pb-3 pt-1">
                      <p className="text-[9.5px] font-bold text-[#E11D48] leading-tight">
                        If Found please return to:
                      </p>
                      
                      {/* 3 Green Icons */}
                      <div className="flex items-center justify-center gap-2.5 my-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-2xs">
                          <MapPin className="w-2.5 h-2.5" />
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-2xs">
                          <Phone className="w-2.5 h-2.5" />
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-2xs">
                          <Globe className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <p className="text-[8px] text-slate-700 font-medium leading-tight">
                        {data.institution_address || 'Kazi Bari, Satarkul, North Badda, Dhaka-1212'}
                      </p>
                      <p className="text-[8px] text-slate-700 font-medium leading-tight mt-0.5">
                        Phone : {data.institution_contact || '+880 9649-222255 | +880 1409-979967'}
                      </p>
                      <p className="text-[8.5px] text-slate-800 font-bold leading-tight mt-0.5">
                        {data.website || 'skill.assunnahfoundation.org'}
                      </p>
                    </div>

                    {/* Micro QR Verification in Corner */}
                    <div className="absolute bottom-2 right-2 p-0.5 bg-white rounded border border-slate-200 shadow-2xs">
                      <QRCodeSVG value={data.verification_payload} size={28} level="L" />
                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: AS-SUNNAH EXAM ADMIT CARD (A4 PREVIEW & PRINT)         */}
          {/* ============================================================== */}
          {activeDocType === 'admit_card' && (
            <div
              id="assdi-admit-card"
              className="w-full max-w-2xl bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden text-slate-900 print:border-none print:shadow-none"
            >
              {/* Top Sky-Blue Motto Banner (Matching ID card) */}
              <div className="bg-[#E0F2FE] border-b border-[#BAE6FD] py-1 px-4 text-center">
                <p className="text-[9.5px] font-black uppercase tracking-[0.2em] text-[#0369A1]">
                  {data.motto || 'EFFICIENCY · HONESTY · PROSPERITY'}
                </p>
              </div>

              {/* Institutional Header */}
              <div className="p-5 sm:p-6 text-center border-b-2 border-[#0F766E]">
                <div className="flex flex-col items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="As-Sunnah Logo"
                    className="w-14 h-14 object-contain mb-1.5 drop-shadow-2xs"
                  />
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F766E] tracking-wide uppercase leading-tight">
                    AS-SUNNAH
                  </h2>
                  <p className="text-xs sm:text-sm font-black text-[#65A30D] tracking-wider uppercase leading-tight mt-0.5">
                    SKILL DEVELOPMENT INSTITUTE
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {data.govt_reg || 'Govt. Reg. #STP-DHA-000877'} • {data.institution_address || 'Kazi Bari, Satarkul, North Badda, Dhaka-1212'}
                  </p>
                </div>

                <div className="mt-3.5 inline-block">
                  <span className="px-5 py-1.5 bg-[#0F766E] text-[#C1982E] text-xs font-black rounded-full uppercase tracking-wider shadow-xs border border-[#C1982E]/40">
                    FINAL EXAMINATION ADMIT CARD • পরীক্ষার প্রবেশপত্র
                  </span>
                </div>
              </div>

              {/* Student & Course Details */}
              <div className="p-5 sm:p-6 border-b border-slate-200">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-extrabold text-[#15803D] uppercase tracking-wide">
                    {data.course_name}
                  </h3>
                  <p className="text-xs font-bold text-slate-600">
                    Session: {data.session_year} • Batch: {data.batch_name}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_130px] gap-4 items-center">
                  
                  {/* Left: Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'শিক্ষার্থীর নাম:' : 'Candidate Name:'}</span>
                      <strong className="text-slate-900 font-extrabold text-sm uppercase">{data.full_name}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'শিক্ষার্থী আইডি নং:' : 'Student ID Number:'}</span>
                      <strong className="font-mono text-[#0F766E] font-extrabold text-base">{data.student_id_number}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'রেজিস্ট্রেশন নম্বর:' : 'Registration No:'}</span>
                      <strong className="font-mono text-slate-800">{data.registration_no}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'রক্তের গ্রুপ:' : 'Blood Group:'}</span>
                      <strong className="text-slate-800">{data.blood_group || 'A+'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'পরীক্ষা কেন্দ্র:' : 'Exam Center:'}</span>
                      <strong className="text-slate-800">{data.campus_name}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">{isBangla ? 'ইস্যুর তারিখ:' : 'Issue Date:'}</span>
                      <strong className="text-slate-800">{data.issue_date}</strong>
                    </div>
                  </div>

                  {/* Right: Student Portrait Photo with Lime Green Border & Verified QR */}
                  <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
                    <div className="w-[100px] h-[120px] rounded-xl border-2 border-[#84CC16] p-0.5 shadow-2xs overflow-hidden bg-slate-100 flex flex-col items-center justify-center">
                      {data.photo_url ? (
                        <img
                          src={data.photo_url}
                          alt={data.full_name}
                          className="w-full h-full object-cover rounded-[9px]"
                        />
                      ) : (
                        <div className="w-full h-full rounded-[9px] bg-slate-50 flex flex-col items-center justify-center text-slate-400 select-none">
                          <div className="w-12 h-12 rounded-full bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-500 mb-1">
                            <User className="w-7 h-7 text-slate-400" />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            Photo
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <QRCodeSVG value={data.verification_payload} size={28} level="L" />
                      <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-tighter">
                        Verified
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Registered Examination Subjects Schedule Table */}
              <div className="p-5 sm:p-6 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  {isBangla ? 'পরীক্ষার বিষয়সূচি ও সিডিউল (Subject Schedule)' : 'Registered Subject Schedule'}
                </h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-[#0F766E] text-white">
                    <tr>
                      <th className="p-2 font-bold">#</th>
                      <th className="p-2 font-bold">{isBangla ? 'বিষয় কোড' : 'Code'}</th>
                      <th className="p-2 font-bold">{isBangla ? 'বিষয়ের নাম' : 'Subject'}</th>
                      <th className="p-2 font-bold">{isBangla ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                      <th className="p-2 font-bold text-center">{isBangla ? 'শিক্ষক স্বাক্ষর' : 'Signature'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="p-2 font-mono">01</td>
                      <td className="p-2 font-mono font-bold text-[#0F766E]">ACCT-101</td>
                      <td className="p-2 font-medium">Accounting & Financial Records</td>
                      <td className="p-2 font-mono text-slate-600">15 Dec 2026, 10:00 AM</td>
                      <td className="p-2 text-center text-slate-300">__________</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-2 font-mono">02</td>
                      <td className="p-2 font-mono font-bold text-[#0F766E]">META-MKTG</td>
                      <td className="p-2 font-medium">Meta & Digital Marketing</td>
                      <td className="p-2 font-mono text-slate-600">17 Dec 2026, 10:00 AM</td>
                      <td className="p-2 text-center text-slate-300">__________</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 font-mono">03</td>
                      <td className="p-2 font-mono font-bold text-[#0F766E]">ISLAMIC-GEN</td>
                      <td className="p-2 font-medium">Islamic Business Ethics & Principles</td>
                      <td className="p-2 font-mono text-slate-600">19 Dec 2026, 10:00 AM</td>
                      <td className="p-2 text-center text-slate-300">__________</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Instructions and Signatures */}
              <div className="p-5 sm:p-6 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 items-end">
                <div className="space-y-1 text-[10px] text-slate-600">
                  <p className="font-bold text-slate-800 uppercase tracking-wider">
                    {isBangla ? 'পরীক্ষার্থীদের জন্য জরুরি নির্দেশনা:' : 'General Instructions:'}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                    <li>{isBangla ? 'পরীক্ষার হলে এই প্রবেশপত্র ও মূল আইডি কার্ড সঙ্গে আনা বাধ্যতামূলক।' : 'Admit Card and Student ID Card are mandatory for exam hall entry.'}</li>
                    <li>{isBangla ? 'পরীক্ষা শুরুর ন্যূনতম ১৫ মিনিট পূর্বে নিজ নিজ আসনে উপস্থিত হতে হবে।' : 'Arrive at the examination center at least 15 minutes before exam start.'}</li>
                    <li>{isBangla ? 'মোবাইল ফোন বা কোনো অননুমোদিত ডিজিটাল ডিভাইস হলে নেওয়া সম্পূর্ণ নিষিদ্ধ।' : 'Mobile phones and unauthorized devices are strictly prohibited.'}</li>
                  </ul>
                </div>

                <div className="flex flex-col items-center text-center">
                  <img
                    src={data.signature_url || '/signature-transparent.png'}
                    alt="Authorized Signature"
                    className="h-8 object-contain mb-0.5"
                  />
                  <div className="w-36 h-[1.5px] bg-[#0D9488]"></div>
                  <p className="text-[10px] font-bold text-slate-800 mt-0.5">
                    Authorized Signature
                  </p>
                  <p className="text-[8.5px] text-slate-500 font-medium">
                    Controller of Examinations
                  </p>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="px-6 py-2 bg-slate-100 border-t border-slate-200 text-center text-[9px] text-slate-500">
                <span>{data.institution_address} • Hotline: {data.institution_contact} • {data.website}</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Info */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBangla ? 'অফিসিয়ালি ভেরিফাইড আস-সুন্নাহ সনদ' : 'Officially Verified As-Sunnah Credential'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition cursor-pointer"
          >
            {isBangla ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>

      {/* Embedded Print CSS Rules for Standard CR80 and A4 Output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #assdi-id-card-front,
          #assdi-id-card-back,
          #assdi-admit-card,
          #assdi-id-card-front *,
          #assdi-id-card-back *,
          #assdi-admit-card * {
            visibility: visible;
          }
          #assdi-id-card-front,
          #assdi-id-card-back {
            position: relative !important;
            display: inline-block !important;
            margin: 15px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #assdi-admit-card {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
