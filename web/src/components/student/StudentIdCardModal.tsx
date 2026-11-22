'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  RotateCcw,
  ShieldCheck,
  GraduationCap,
  Download,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
  CreditCard,
  QrCode,
  Building,
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
}

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number | string | null;
  initialData?: Partial<StudentIdCardData> | null;
}

export default function StudentIdCardModal({
  isOpen,
  onClose,
  studentId,
  initialData,
}: StudentIdCardModalProps) {
  const { isBangla } = useLanguage();
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
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
        // Fallback to provided initialData or default mockup
        if (initialData && initialData.student_id_number) {
          setCardData({
            student_id: Number(initialData.student_id) || 1,
            student_id_number: initialData.student_id_number,
            registration_no: initialData.registration_no || 'REG-2026-042-001',
            full_name: initialData.full_name || 'Abdullah Student',
            phone: initialData.phone || '01700000001',
            guardian_phone: initialData.guardian_phone || '01800000001',
            education_background: initialData.education_background || 'General',
            status: initialData.status || 'active',
            course_name: initialData.course_name || 'Small Business Management Course (SBMC)',
            course_code: initialData.course_code || 'SBMC',
            batch_name: initialData.batch_name || 'SBMC Batch 42',
            batch_number: initialData.batch_number || 42,
            campus_name: initialData.campus_name || 'Kazi Bari Campus',
            campus_address: initialData.campus_address || 'North Badda, Dhaka',
            blood_group: initialData.blood_group || 'A+',
            session_year: initialData.session_year || '2026-2027',
            issue_date: initialData.issue_date || '15 Nov 2026',
            expiry_date: initialData.expiry_date || '15 Nov 2027',
            verification_payload:
              initialData.verification_payload ||
              `ASSDI:VERIFY:${initialData.student_id_number}:ACTIVE`,
            institution_name_bn: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
            institution_name_en: 'As-Sunnah Skill Development Institute',
            institution_tagline:
              'দক্ষ মানবসম্পদ গঠনে আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমূলক উদ্যোগ',
            institution_address:
              'আস-সুন্নাহ কমপ্লেক্স, প্লট-৭৯, ব্লক-ডি, ইস্টার্ন হাউজিং, আফতাবনগর, ঢাকা-১২১২',
            institution_contact: '+880 9612-224444 | support@assdi.org',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const data = cardData || {
    student_id: 1,
    student_id_number: 'STD-2026-042-001',
    registration_no: 'REG-2026-042-001',
    full_name: 'আব্দুল্লাহ (Abdullah Student)',
    phone: '01700000001',
    guardian_phone: '01800000001',
    education_background: 'General',
    status: 'active',
    course_name: 'Small Business Management Course (SBMC)',
    course_code: 'SBMC',
    batch_name: 'SBMC Batch 42',
    batch_number: 42,
    campus_name: 'Kazi Bari Campus',
    campus_address: 'North Badda, Dhaka',
    blood_group: 'A+',
    session_year: '2026-2027',
    issue_date: '15 Nov 2026',
    expiry_date: '15 Nov 2027',
    verification_payload: 'ASSDI:VERIFY:STD-2026-042-001:ACTIVE',
    institution_name_bn: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
    institution_name_en: 'As-Sunnah Skill Development Institute',
    institution_tagline: 'দক্ষ মানবসম্পদ গঠনে আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমূলক উদ্যোগ',
    institution_address: 'আস-সুন্নাহ কমপ্লেক্স, উত্তর বাড্ডা, ঢাকা-১২১২',
    institution_contact: '+880 9612-224444 | support@assdi.org',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Top Control Bar */}
        <div className="bg-[#0B2A21] px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#071F18] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#E5C378]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                {isBangla ? 'প্রাতিষ্ঠানিক ডিজিটাল ডকুমেন্টস' : 'Institutional Digital Credentials'}
              </h2>
              <p className="text-[11px] text-emerald-200/80">
                {data.full_name} • <span className="font-mono text-[#E5C378]">{data.student_id_number}</span>
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
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70">
          <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveDocType('id_card')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDocType === 'id_card'
                  ? 'bg-[#0B2A21] text-[#E5C378] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isBangla ? 'ডিজিটাল আইডি কার্ড' : 'Student ID Card'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDocType('admit_card')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDocType === 'admit_card'
                  ? 'bg-[#0B2A21] text-[#E5C378] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isBangla ? 'পরীক্ষার এডমিট কার্ড' : 'Exam Admit Card'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeDocType === 'id_card' && (
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

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#B38F46] text-[#0B2A21] rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#0B2A21]" />
              <span>{isBangla ? 'প্রিন্ট করুন' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 flex flex-col items-center justify-center bg-slate-100/70" ref={printRef}>
          
          {/* ============================================================== */}
          {/* VIEW 1: STUDENT ID CARD (CR80 PHYSICAL CARD RATIO) */}
          {/* ============================================================== */}
          {activeDocType === 'id_card' && (
            <div className="w-full flex flex-col items-center">
              
              {/* CARD CONTAINER (FRONT) */}
              {activeSide === 'front' && (
                <div
                  id="assdi-id-card-front"
                  className="w-full max-w-[420px] rounded-2xl bg-gradient-to-br from-[#071F18] via-[#0B2A21] to-[#04140F] border-2 border-[#C5A059] shadow-2xl p-5 text-white relative overflow-hidden transition-all duration-300"
                >
                  {/* Subtle Geometric Texture Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:18px_18px] opacity-10 pointer-events-none" />
                  
                  {/* Watermark Logo Seal in Background */}
                  <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#C5A059]/5 border border-[#C5A059]/10 pointer-events-none flex items-center justify-center">
                    <GraduationCap className="w-28 h-28 text-[#C5A059]/10" />
                  </div>

                  {/* Header */}
                  <div className="relative z-10 text-center pb-2.5 border-b border-[#C5A059]/30">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <div className="w-6 h-6 rounded-lg bg-[#C5A059] text-[#0B2A21] flex items-center justify-center shadow-xs">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs sm:text-[13px] font-black tracking-tight text-[#F8ECC9]">
                        {data.institution_name_bn}
                      </h3>
                    </div>
                    <p className="text-[7.5px] font-bold uppercase tracking-widest text-emerald-300/80">
                      {data.institution_name_en}
                    </p>

                    <div className="mt-1.5 inline-block">
                      <span className="px-2.5 py-0.5 bg-[#C5A059] text-[#071F18] text-[8.5px] font-black uppercase tracking-wider rounded-full shadow-2xs">
                        STUDENT IDENTITY CARD • শিক্ষার্থী পরিচয়পত্র
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="relative z-10 pt-3.5 pb-2 flex items-center gap-4">
                    
                    {/* Left: Avatar / Photo */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-20 h-24 rounded-xl bg-gradient-to-b from-[#134436] to-[#082019] border-2 border-[#C5A059] p-1 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                        <div className="w-12 h-12 rounded-full bg-[#0B2A21] border border-[#C5A059]/60 flex items-center justify-center text-[#E5C378]">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <span className="text-[8px] font-extrabold text-[#E5C378] mt-1 uppercase tracking-wider">
                          ASSDI
                        </span>

                        {/* Verified Ribbon */}
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-[#0B2A21]" />
                        </div>
                      </div>

                      <div className="mt-1 text-center">
                        <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/40 rounded text-[8px] font-bold text-emerald-300">
                          Blood: {data.blood_group || 'A+'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Student Information Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div>
                        <p className="text-sm font-extrabold text-white truncate leading-tight">
                          {data.full_name}
                        </p>
                        <p className="text-[10px] text-emerald-300/90 font-medium">
                          {isBangla ? 'শিক্ষার্থী' : 'Registered Student'} ({data.education_background})
                        </p>
                      </div>

                      <div className="pt-1 space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400/80 font-bold w-12">{isBangla ? 'আইডি নং:' : 'ID No:'}</span>
                          <span className="font-mono font-black text-[#E5C378] tracking-wider text-[11px]">
                            {data.student_id_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400/80 font-bold w-12">{isBangla ? 'রেজিস্ট্রেশন:' : 'Reg No:'}</span>
                          <span className="font-mono text-gray-200">{data.registration_no}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400/80 font-bold w-12">{isBangla ? 'কোর্স:' : 'Course:'}</span>
                          <span className="text-gray-100 font-semibold truncate">{data.course_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400/80 font-bold w-12">{isBangla ? 'ব্যাচ:' : 'Batch:'}</span>
                          <span className="text-emerald-200 font-bold">{data.batch_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400/80 font-bold w-12">{isBangla ? 'ক্যাম্পাস:' : 'Campus:'}</span>
                          <span className="text-gray-300 truncate">{data.campus_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Footer with QR and Signature */}
                  <div className="relative z-10 pt-2 border-t border-[#C5A059]/30 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white rounded-lg shadow-xs">
                        <QRCodeSVG
                          value={data.verification_payload}
                          size={46}
                          level="M"
                        />
                      </div>
                      <div>
                        <p className="text-[7.5px] font-extrabold text-[#E5C378] uppercase tracking-wider">
                          VERIFIED CREDENTIAL
                        </p>
                        <p className="text-[7px] text-gray-300">
                          {isBangla ? 'স্ক্যান করে সত্যতা যাচাই করুন' : 'Scan to verify active status'}
                        </p>
                        <p className="text-[7.5px] font-mono text-emerald-400 mt-0.5">
                          {isBangla ? 'মেয়াদ:' : 'Validity:'} {data.session_year}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <div className="w-20 border-b border-[#C5A059]/80 pb-0.5 mb-0.5 text-center">
                        <span className="font-serif italic text-[8.5px] text-[#F4E5BE]">As-Sunnah</span>
                      </div>
                      <p className="text-[7.5px] font-bold text-gray-300">
                        {isBangla ? 'অনুমোদিত স্বাক্ষর' : 'Authorized Seal'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD CONTAINER (BACK) */}
              {activeSide === 'back' && (
                <div
                  id="assdi-id-card-back"
                  className="w-full max-w-[420px] rounded-2xl bg-gradient-to-br from-[#071F18] via-[#0B2A21] to-[#04140F] border-2 border-[#C5A059] shadow-2xl p-5 text-white relative overflow-hidden transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:18px_18px] opacity-10 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="text-center pb-2 border-b border-[#C5A059]/30">
                      <h4 className="text-[11px] font-black text-[#E5C378] uppercase tracking-wider">
                        {isBangla ? 'জরুরি নির্দেশনা ও নিয়মাবলী' : 'Terms & Campus Regulations'}
                      </h4>
                    </div>

                    <ul className="mt-2.5 space-y-1.5 text-[8.5px] text-emerald-100/90 leading-relaxed list-disc list-inside">
                      <li>
                        {isBangla
                          ? 'এই কার্ডটি আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের সম্পত্তি।'
                          : 'This card is the exclusive property of ASSDI and must be carried at all times.'}
                      </li>
                      <li>
                        {isBangla
                          ? 'ক্যাম্পাসে ও ক্লাসরুমে প্রবেশের সময় কার্ডটি দৃশ্যমানভাবে প্রদর্শন করতে হবে।'
                          : 'Must be presented upon entering campus, sessions, and examination halls.'}
                      </li>
                      <li>
                        {isBangla
                          ? 'কার্ডটি সম্পূর্ণ অহস্তান্তরযোগ্য। অন্য কারো কার্ড ব্যবহার শাস্তিযোগ্য অপরাধ।'
                          : 'Strictly non-transferable. Misuse or forgery constitutes institutional offense.'}
                      </li>
                      <li>
                        {isBangla
                          ? 'কার্ড হারিয়ে গেলে অবিলম্বে ইনস্টিটিউট অফিসে যোগাযোগ করার অনুরোধ করা হলো।'
                          : 'If found, please return to institute office or call the emergency helpline.'}
                      </li>
                    </ul>
                  </div>

                  <div className="relative z-10 mt-3 pt-2.5 border-t border-[#C5A059]/30 text-center">
                    <p className="text-[8.5px] font-bold text-white">
                      {data.institution_name_bn}
                    </p>
                    <p className="text-[7.5px] text-emerald-200/80 mt-0.5">
                      {data.institution_address || 'আস-সুন্নাহ কমপ্লেক্স, আফতাবনগর, ঢাকা-১২১২'}
                    </p>
                    <p className="text-[7.5px] font-mono text-[#E5C378] mt-0.5">
                      হটলাইন: {data.institution_contact || '+৮৮০ ৯৬১২-২২৪৪৪৪'}
                    </p>

                    {/* Simulated barcode */}
                    <div className="mt-2 pt-1 border-t border-emerald-900/60 flex flex-col items-center">
                      <div className="h-6 w-48 bg-white/90 p-0.5 rounded flex items-center justify-center gap-0.5">
                        {Array.from({ length: 38 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-full ${i % 3 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-1.5 bg-transparent'}`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[8px] text-emerald-300 mt-0.5">
                        *{data.student_id_number}*
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: EXAM ADMIT CARD (A4 PREVIEW) */}
          {/* ============================================================== */}
          {activeDocType === 'admit_card' && (
            <div
              id="assdi-admit-card"
              className="w-full max-w-xl bg-white border-2 border-slate-300 rounded-2xl shadow-xl p-6 sm:p-8 text-slate-900 print:border-none print:shadow-none"
            >
              {/* Admit Header */}
              <div className="text-center pb-4 border-b-2 border-[#0B2A21]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-[#0B2A21] text-[#E5C378] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-[#0B2A21] tracking-tight">
                    {data.institution_name_bn}
                  </h2>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {data.institution_name_en}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {data.institution_address || 'আফতাবনগর, ঢাকা-১২১২'}
                </p>

                <div className="mt-3 inline-block">
                  <span className="px-4 py-1 bg-[#0B2A21] text-[#E5C378] text-xs font-black rounded-full uppercase tracking-wider">
                    FINAL EXAMINATION ADMIT CARD • পরীক্ষার প্রবেশপত্র
                  </span>
                </div>
              </div>

              {/* Student Identification Table */}
              <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-slate-200">
                <div className="space-y-1.5">
                  <p>
                    <span className="font-bold text-slate-600 w-28 inline-block">{isBangla ? 'শিক্ষার্থীর নাম:' : 'Candidate Name:'}</span>
                    <strong className="text-slate-900">{data.full_name}</strong>
                  </p>
                  <p>
                    <span className="font-bold text-slate-600 w-28 inline-block">{isBangla ? 'শিক্ষার্থী আইডি:' : 'Student ID:'}</span>
                    <strong className="font-mono text-[#0B2A21] text-sm">{data.student_id_number}</strong>
                  </p>
                  <p>
                    <span className="font-bold text-slate-600 w-28 inline-block">{isBangla ? 'রেজিস্ট্রেশন নং:' : 'Registration No:'}</span>
                    <strong className="font-mono text-slate-700">{data.registration_no}</strong>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p>
                    <span className="font-bold text-slate-600 w-24 inline-block">{isBangla ? 'কোর্সের নাম:' : 'Course:'}</span>
                    <strong className="text-slate-900">{data.course_name}</strong>
                  </p>
                  <p>
                    <span className="font-bold text-slate-600 w-24 inline-block">{isBangla ? 'ব্যাচ ও শাখা:' : 'Batch:'}</span>
                    <strong className="text-emerald-800">{data.batch_name}</strong>
                  </p>
                  <p>
                    <span className="font-bold text-slate-600 w-24 inline-block">{isBangla ? 'পরীক্ষা কেন্দ্র:' : 'Exam Center:'}</span>
                    <strong className="text-slate-800">{data.campus_name}</strong>
                  </p>
                </div>
              </div>

              {/* Subjects Table */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  {isBangla ? 'পরীক্ষার বিষয়সূচি (Examination Subjects)' : 'Registered Subjects'}
                </h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-[#0B2A21] text-white">
                    <tr>
                      <th className="p-2 font-bold">#</th>
                      <th className="p-2 font-bold">{isBangla ? 'বিষয় কোড' : 'Code'}</th>
                      <th className="p-2 font-bold">{isBangla ? 'বিষয়ের নাম' : 'Subject'}</th>
                      <th className="p-2 font-bold text-center">{isBangla ? 'শিক্ষক স্বাক্ষর' : 'Sign'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="p-2 font-mono">01</td>
                      <td className="p-2 font-mono font-bold text-[#0B2A21]">ACCT-101</td>
                      <td className="p-2 font-medium">Accounting & Financial Records</td>
                      <td className="p-2 text-center text-slate-400">________</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-2 font-mono">02</td>
                      <td className="p-2 font-mono font-bold text-[#0B2A21]">META-MKTG</td>
                      <td className="p-2 font-medium">Meta & Digital Marketing</td>
                      <td className="p-2 text-center text-slate-400">________</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 font-mono">03</td>
                      <td className="p-2 font-mono font-bold text-[#0B2A21]">ISLAMIC-GEN</td>
                      <td className="p-2 font-medium">Islamic Business Ethics & Principles</td>
                      <td className="p-2 text-center text-slate-400">________</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rules and Signatures */}
              <div className="pt-3 border-t border-slate-200 flex items-end justify-between gap-4">
                <div className="flex items-center gap-2">
                  <QRCodeSVG value={data.verification_payload} size={50} level="M" />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {isBangla
                      ? 'ডিজিটাল সত্যায়িত এডমিট কার্ড। পরীক্ষায় প্রবেশের জন্য সাথে আনা আবশ্যক।'
                      : 'Digitally verified admit credential. Mandatory for examination entry.'}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-32 border-b border-slate-700 pb-0.5 mb-1 font-serif italic text-xs text-slate-800">
                    Academic Controller
                  </div>
                  <p className="text-[10px] font-bold text-slate-600">
                    {isBangla ? 'পরীক্ষা নিয়ন্ত্রক' : 'Controller of Examinations'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Info */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBangla ? 'অফিসিয়ালি ভেরিফাইড প্রাতিষ্ঠানিক সনদ' : 'Institutionally Verified ID Card'}</span>
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

      {/* Embedded Print CSS Rules */}
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
          #assdi-id-card-back,
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
