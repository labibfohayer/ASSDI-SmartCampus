'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  BookOpen,
  Download,
  Eye,
  Printer,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Sparkles,
  ExternalLink,
  Layers,
  ScrollText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SessionMaterialItem {
  id: number;
  session?: number | null;
  session_date?: string | null;
  session_time?: string | null;
  subject: number;
  subject_name: string;
  subject_code?: string;
  topic?: number | null;
  topic_title?: string | null;
  teacher_name?: string;
  title: string;
  description?: string;
  key_takeaways?: string[];
  hadith_or_ethics_ref?: string;
  material_type: string;
  material_type_display: string;
  file?: string | null;
  file_url?: string | null;
  file_size_bytes?: number;
  formatted_file_size?: string;
  download_count: number;
  uploaded_by_name?: string;
  created_at: string;
}

interface LectureMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: {
    id: number;
    subject_name: string;
    topic_title?: string | null;
    teacher_name?: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
  } | null;
  initialMaterial?: SessionMaterialItem | null;
  onDownloadSuccess?: () => void;
}

export default function LectureMaterialsModal({
  isOpen,
  onClose,
  session,
  initialMaterial,
  onDownloadSuccess,
}: LectureMaterialsModalProps) {
  const { isBangla } = useLanguage();
  const [materials, setMaterials] = useState<SessionMaterialItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMaterials([]);
      setSelectedIndex(0);
      return;
    }

    if (initialMaterial) {
      setMaterials([initialMaterial]);
      setSelectedIndex(0);
      // Also fetch related materials for the session/topic if available
      if (initialMaterial.session) {
        fetchSessionMaterials(initialMaterial.session);
      }
    } else if (session?.id) {
      fetchSessionMaterials(session.id);
    }
  }, [isOpen, session, initialMaterial]);

  const fetchSessionMaterials = async (sessionId: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/class-sessions/${sessionId}/materials/`);
      const items: SessionMaterialItem[] = Array.isArray(res.data) ? res.data : res.data?.results || [];
      if (items.length > 0) {
        setMaterials(items);
        setSelectedIndex(0);
      } else if (!initialMaterial) {
        setMaterials([]);
      }
    } catch (err) {
      console.error('Failed to load session materials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const current = materials[selectedIndex] || initialMaterial || null;

  const handleDownload = async (mat: SessionMaterialItem) => {
    setDownloadingId(mat.id);
    try {
      const res = await api.get(`/api/v1/session-materials/${mat.id}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = mat.title.replace(/[/\\?%*:|"<>]/g, '_');
      link.setAttribute('download', `${cleanTitle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Increment local count
      mat.download_count += 1;
      setMaterials([...materials]);
      toast.success(isBangla ? 'লেকচার শিট ডাউনলোড শুরু হয়েছে!' : 'Download started!');
      if (onDownloadSuccess) onDownloadSuccess();
    } catch (err: any) {
      toast.error(isBangla ? 'ফাইল ডাউনলোড করতে সমস্যা হয়েছে' : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOnlineView = async (mat: SessionMaterialItem) => {
    try {
      const res = await api.get(`/api/v1/session-materials/${mat.id}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(isBangla ? 'অনলাইনে ফাইল ওপেন করা যায়নি' : 'Unable to preview online');
    }
  };

  const handlePrint = async (mat: SessionMaterialItem) => {
    try {
      const res = await api.get(`/api/v1/session-materials/${mat.id}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      toast.error(isBangla ? 'প্রিন্ট ভিউ ওপেন করা যায়নি' : 'Print view failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with As-Sunnah Emerald Branding */}
        <div className="bg-[#0B2A21] text-white p-5 sm:p-6 border-b border-[#071F18] relative shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md border border-[#C5A059]/40">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#164E3D] text-[#E5C378] border border-[#C5A059]/30">
                    {isBangla ? 'আস-সুন্নাহ লেকচার হাব' : 'As-Sunnah Lecture Hub'}
                  </span>
                  {current && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-200">
                      {current.material_type_display}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-tight">
                  {isBangla ? 'ক্লাস লেকচার শিট ও রিসোর্স' : 'Session Handout & Study Material'}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title={isBangla ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Session Overview Bar */}
          <div className="mt-4 pt-3 border-t border-emerald-900/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-200/90 font-medium">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" />
              {session?.subject_name || current?.subject_name || 'SBMC Subject'}
            </span>
            {(session?.topic_title || current?.topic_title) && (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                {session?.topic_title || current?.topic_title}
              </span>
            )}
            {(session?.teacher_name || current?.teacher_name) && (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                {session?.teacher_name || current?.teacher_name}
              </span>
            )}
            {(session?.session_date || current?.session_date) && (
              <span className="flex items-center gap-1.5 font-mono text-emerald-300">
                <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                {session?.session_date || current?.session_date}
              </span>
            )}
          </div>
        </div>

        {/* Multi-material Switcher Tabs if more than 1 material available */}
        {materials.length > 1 && (
          <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
              {isBangla ? 'রিসোর্স তালিকা:' : 'Materials:'}
            </span>
            {materials.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedIndex === idx
                    ? 'bg-[#0B2A21] text-[#E5C378] shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">{m.material_type_display}</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-14 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                {isBangla ? 'লেকচার শিট লোড হচ্ছে...' : 'Loading materials...'}
              </p>
            </div>
          ) : current ? (
            <>
              {/* Title & Type Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {current.material_type_display}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2 leading-snug">
                      {current.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {current.description ||
                        (isBangla
                          ? 'এই হ্যান্ডআউটে ক্লাসের যাবতীয় মূল আলোচনা, ব্যবহারিক ধাপ ও নৈতিক অনুশাসন সংক্ষেপে লিপিবদ্ধ করা হয়েছে।'
                          : 'Comprehensive summary, practical steps, and ethical guidelines for this session.')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700">
                      {current.formatted_file_size || '1.2 MB'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      {current.download_count} {isBangla ? 'বার ডাউনলোড হয়েছে' : 'downloads'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    PDF Document (A4 Print Ready)
                  </span>
                </div>
              </div>

              {/* Key Takeaways Section */}
              {Array.isArray(current.key_takeaways) && current.key_takeaways.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-[#0B2A21] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isBangla ? 'মূল শিক্ষণীয় বিষয়সমূহ (Key Takeaways):' : 'Key Takeaways:'}</span>
                  </h4>
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/70 space-y-2">
                    {current.key_takeaways.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hadith / Ethical Guidance Callout */}
              {current.hadith_or_ethics_ref && (
                <div className="bg-amber-50/90 rounded-2xl p-4 sm:p-5 border border-amber-300 text-xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                    <ScrollText className="w-4 h-4 text-amber-700" />
                    <span>{isBangla ? 'ইসলামিক ব্যবসায়িক নীতি ও নৈতিক দিকনির্দেশনা:' : 'Islamic Ethics & Value Reference:'}</span>
                  </div>
                  <blockquote className="italic font-medium text-amber-950 pl-6 border-l-2 border-amber-400 py-0.5 leading-relaxed">
                    &ldquo;{current.hadith_or_ethics_ref}&rdquo;
                  </blockquote>
                  <p className="text-[11px] text-amber-800/90 font-medium pl-6">
                    {isBangla
                      ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট প্রতিটি পেশাগত দক্ষতায় সততা, হালাল উপার্জন ও বিশ্বস্ততাকে অগ্রাধিকার দেয়।'
                      : 'ASSDI emphasizes honesty, halal livelihood, and trust in every professional skill.'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">
                {isBangla ? 'কোনো লেকচার শিট পাওয়া যায়নি' : 'No lecture material found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isBangla
                  ? 'এই সেশনের লেকচার শিট বা হ্যান্ডআউট শীঘ্রই আপলোড করা হবে। দয়া করে শিক্ষক বা কো-অর্ডিনেটরের সাথে যোগাযোগ করুন।'
                  : 'Materials for this class session will be published shortly.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        {current && (
          <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOnlineView(current)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title={isBangla ? 'অনলাইনে সম্পূর্ণ ফাইল পড়ুন' : 'Read Full PDF Online'}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isBangla ? 'অনলাইনে পড়ুন' : 'Read Online'}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint(current)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title={isBangla ? 'হ্যান্ডআউট প্রিন্ট করুন' : 'Print Handout'}
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(current)}
              disabled={downloadingId === current.id}
              className="px-5 py-2.5 text-xs font-extrabold bg-[#0B2A21] hover:bg-[#164E3D] text-[#E5C378] rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {downloadingId === current.id ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059]" />
              ) : (
                <Download className="w-4 h-4 text-[#C5A059]" />
              )}
              <span>{isBangla ? 'পিডিএফ ডাউনলোড করুন' : 'Download PDF Handout'}</span>
              <span className="text-[10px] bg-[#164E3D] px-1.5 py-0.5 rounded text-white font-mono">
                {current.formatted_file_size || 'PDF'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
