'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  BookOpen,
  Send,
  RefreshCw,
  UserCheck,
  Building,
  Layers,
  MessageSquare,
  ChevronRight,
  X,
  QrCode,
  CreditCard,
} from 'lucide-react';
import WebQRScannerModal from '@/components/student/WebQRScannerModal';
import StudentIdCardModal from '@/components/student/StudentIdCardModal';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUser } from '@/lib/auth';

interface StudentProfile {
  id: number;
  student_id_number: string;
  registration_no: string;
  full_name: string;
  phone: string;
  education_background: string;
  campus_name: string;
  current_batch_name: string;
  status: string;
}

interface AttendanceSummary {
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  approved_leave: number;
  attendance_percentage: number;
}

interface AttendanceRecord {
  id: number;
  session?: number;
  session_date: string;
  subject_name: string;
  status: 'present' | 'late' | 'absent' | 'approved_leave';
  marked_at: string;
  reason?: string;
}

interface ClassSessionItem {
  id: number;
  subject_name: string;
  topic_title: string | null;
  teacher_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  audience: string;
  description?: string;
}

interface FeedbackRecord {
  id: number;
  session: number;
  session_date: string;
  subject_name: string;
  topic_title: string;
  understanding_rating: number;
  percentage: number;
  band: string;
  needs_help: boolean;
  student_comment?: string;
  submitted_at: string;
}

interface HelpRequestItem {
  id: number;
  subject_name: string;
  topic_title: string;
  teacher_name: string;
  student_message: string;
  teacher_note?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export default function StudentPortalPage() {
  const { isBangla } = useLanguage();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'help'>('today');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  // Feedback modal / card
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<ClassSessionItem | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackNeedsHelp, setFeedbackNeedsHelp] = useState<boolean>(false);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);
  const [resolvingHelpId, setResolvingHelpId] = useState<number | null>(null);

  useEffect(() => {
    loadStudentData();
    const handleUrlTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'attendance' || tab === 'help' || tab === 'today') {
          setActiveTab(tab as any);
        }
        if (params.get('scan') === 'true') {
          setScannerOpen(true);
        }
      }
    };
    handleUrlTab();
    window.addEventListener('popstate', handleUrlTab);
    return () => window.removeEventListener('popstate', handleUrlTab);
  }, [user]);

  const loadStudentData = async () => {
    const currentUser = user || getUser();
    if (currentUser && currentUser.role !== 'student') {
      // Non-students are blocked and redirected by StudentLayout
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Normal student loading with graceful individual error handling
      const [profRes, attRes, sessRes, fbRes, helpRes] = await Promise.all([
        api.get('/api/v1/students/me/').catch(() => ({ data: null })),
        api.get('/api/v1/attendance/mine/').catch(() => ({ data: null })),
        api.get('/api/v1/class-sessions/?status=published').catch(() => ({ data: [] })),
        api.get('/api/v1/feedback/mine/').catch(() => ({ data: [] })),
        api.get('/api/v1/help-requests/').catch(() => ({ data: [] })),
      ]);

      if (profRes.data) {
        setProfile(profRes.data?.data || profRes.data);
      }
      if (attRes.data) {
        setAttSummary(attRes.data?.summary || null);
        setAttRecords(attRes.data?.records || []);
      }
      
      const sessList = Array.isArray(sessRes.data)
        ? sessRes.data
        : sessRes.data?.results || [];
      setSessions(sessList);

      const fbList = Array.isArray(fbRes.data) ? fbRes.data : [];
      setFeedbacks(fbList);

      const helpList = Array.isArray(helpRes.data)
        ? helpRes.data
        : helpRes.data?.results || [];
      setHelpRequests(helpList);
    } catch (err) {
      console.warn('Error loading student portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForFeedback) return;

    // Strict Anti-Fakibaz Validation:
    // If understanding is less than 100% (rating < 5) or needs_help is true,
    // student MUST specify exactly what was not understood.
    if ((feedbackRating < 5 || feedbackNeedsHelp) && feedbackComment.trim().length < 8) {
      toast.error(
        isBangla
          ? 'যেহেতু পুরো পাঠটি সম্পূর্ণ বুঝতে পারেননি, ক্লাসের কোন নির্দিষ্ট অংশটি বুঝতে সমস্যা হয়েছে তা স্পষ্টভাবে উল্লেখ করুন।'
          : 'Please specifically describe which part of the class you struggled with.'
      );
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackSuccessMsg(null);
    try {
      await api.post('/api/v1/feedback/', {
        session: selectedSessionForFeedback.id,
        understanding_rating: feedbackRating,
        needs_help: feedbackNeedsHelp || feedbackRating <= 3,
        student_comment: feedbackComment.trim(),
      });

      setFeedbackSuccessMsg(
        isBangla
          ? 'আলহামদুলিল্লাহ! আপনার ক্লাসের মূল্যায়ন সফলভাবে জমা হয়েছে।'
          : 'Alhamdulillah! Your session feedback has been submitted successfully.'
      );

      // Refresh feedbacks & help requests
      const [fbRes, helpRes] = await Promise.all([
        api.get('/api/v1/feedback/mine/').catch(() => ({ data: [] })),
        api.get('/api/v1/help-requests/').catch(() => ({ data: [] })),
      ]);
      setFeedbacks(Array.isArray(fbRes.data) ? fbRes.data : []);
      setHelpRequests(Array.isArray(helpRes.data) ? helpRes.data : helpRes.data?.results || []);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification-refresh'));
      }

      setTimeout(() => {
        setSelectedSessionForFeedback(null);
        setFeedbackComment('');
        setFeedbackNeedsHelp(false);
        setFeedbackRating(5);
        setFeedbackSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.error?.message ||
          (isBangla ? 'ফিডব্যাক জমা দিতে ব্যর্থ হয়েছে।' : 'Failed to submit feedback.')
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleMarkHelpResolved = async (helpRequestId: number) => {
    setResolvingHelpId(helpRequestId);
    try {
      const target = helpRequests.find((h) => h.id === helpRequestId);
      if (target?.status === 'pending') {
        await api.post(`/api/v1/help-requests/${helpRequestId}/start/`);
      }
      await api.post(`/api/v1/help-requests/${helpRequestId}/resolve/`, {
        teacher_note: isBangla
          ? 'শিক্ষার্থী নিজে অনুশীলন করে/শিক্ষকের সাথে কথা বলে বিষয়টি সম্পূর্ণ বুঝে নিয়েছেন।'
          : 'Student reviewed and fully understood the topic.',
      });
      toast.success(
        isBangla
          ? 'মাশাআল্লাহ! বিষয়টি এখন সম্পূর্ণ বুঝে গেছেন হিসেবে সমাধান করা হয়েছে।'
          : 'Marked as understood and resolved!'
      );
      loadStudentData();
    } catch (err: any) {
      toast.error(isBangla ? 'স্ট্যাটাস আপডেট করা যায়নি' : 'Failed to update status');
    } finally {
      setResolvingHelpId(null);
    }
  };

  const safeFixed = (val: any, decimals = 1): string => {
    if (val === null || val === undefined || isNaN(Number(val))) return 'N/A';
    return Number(val).toFixed(decimals);
  };

  const ratingDescriptions: Record<number, { bn: string; en: string; pct: string }> = {
    1: {
      bn: '২০% বুঝেছি, বাকি ৮০% বুঝতে পারিনি (সহায়তা আবশ্যক)',
      en: '20% Understood, 80% struggle (Assistance Needed)',
      pct: '২০%',
    },
    2: {
      bn: '৪০% বুঝেছি, বাকি ৬০% অস্পষ্ট (সহায়তা আবশ্যক)',
      en: '40% Understood, 60% unclear (Assistance Needed)',
      pct: '৪০%',
    },
    3: {
      bn: '৬০% বুঝেছি, বাকি ৪০% আরও স্পষ্ট হওয়া দরকার',
      en: '60% Understood, 40% needs review',
      pct: '৬০%',
    },
    4: {
      bn: '৮০% ভালোভাবে বুঝেছি, সামান্য কিছু অস্পষ্ট',
      en: '80% Good Understanding, minor queries',
      pct: '৮০%',
    },
    5: {
      bn: '১০০% সম্পূর্ণ পাঠ চমৎকারভাবে বুঝতে পেরেছি',
      en: '100% Full & Complete Understanding',
      pct: '১০০%',
    },
  };

  // Check if student already gave feedback for a session
  const hasGivenFeedback = (sessionId: number) => {
    return feedbacks.some((fb) => fb.session === sessionId);
  };

  // Check if student attendance is recorded for a session
  const hasAttended = (sessionId: number) => {
    return attRecords.some((rec) => rec.session === sessionId);
  };

  return (
    <div className="space-y-6">
      {/* Student Profile Hero Card */}
      <div className="bg-[#0B2A21] rounded-2xl border border-emerald-900 shadow-md p-6 sm:p-7 text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#164E3D] border-2 border-[#C5A059]/70 text-white flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
              <GraduationCap className="w-8 h-8 text-emerald-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#164E3D] border border-emerald-600/50 text-emerald-200">
                  {profile?.current_batch_name || 'SBMC Batch 42'}
                </span>
                <span className="text-xs font-mono font-bold bg-[#071F18] text-[#C5A059] px-2.5 py-0.5 rounded-md border border-[#C5A059]/40">
                  {profile?.student_id_number || 'STD-2026-042-001'}
                </span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isBangla ? 'নিয়মিত শিক্ষার্থী' : 'Active Student'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                {profile?.full_name || 'Abdullah Student'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-200/90 mt-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  {profile?.campus_name || 'Kazi Bari Campus'}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  {isBangla ? 'ব্যাকগ্রাউন্ড:' : 'Background:'} {profile?.education_background || 'General'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIdCardOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#061C16] hover:bg-[#08261e] text-[#E5C378] border border-[#C5A059]/40 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              title={isBangla ? 'ডিজিটাল আইডি কার্ড ও এডমিট কার্ড' : 'Digital ID & Admit Card'}
            >
              <CreditCard className="w-4 h-4 text-[#C5A059]" />
              <span>{isBangla ? 'আইডি কার্ড' : 'ID Card'}</span>
            </button>
            <button
              onClick={() => setScannerOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#B38F48] text-[#061C16] font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
              title={isBangla ? 'ক্যামেরা দিয়ে কিউআর স্ক্যান করুন' : 'Scan Attendance QR'}
            >
              <QrCode className="w-4 h-4 text-[#061C16]" />
              <span>{isBangla ? 'কিউআর দিয়ে উপস্থিতি' : 'Scan Attendance QR'}</span>
            </button>
            <button
              onClick={loadStudentData}
              title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
              className="px-4 py-2 rounded-xl bg-[#164E3D] hover:bg-[#1D634E] text-white border border-emerald-500/40 transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-200 ${loading ? 'animate-spin' : ''}`} />
              <span>{isBangla ? 'তথ্য রিফ্রেশ' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance & Learning Metric Cards (Bento Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isBangla ? 'উপস্থিতি হার' : 'Attendance Rate'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-[#0B2A21]">
              {safeFixed(attSummary?.attendance_percentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (attSummary?.attendance_percentage || 0) < 75
                  ? 'bg-rose-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(attSummary?.attendance_percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
            {(attSummary?.attendance_percentage || 0) >= 80
              ? isBangla ? 'সন্তোষজনক ও নিয়মিত উপস্থিতি' : 'Satisfactory attendance'
              : isBangla ? 'উপস্থিতির হার বৃদ্ধি করা প্রয়োজন' : 'Needs improvement'}
          </p>
        </div>

        {/* Present Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isBangla ? 'উপস্থিত সেশন' : 'Present Sessions'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">
            {attSummary?.present || 0}{' '}
            <span className="text-sm font-semibold text-slate-400">
              / {attSummary?.total_sessions || 0}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isBangla ? 'সফলভাবে ক্লাসে সম্পন্ন' : 'Attended successfully'}
          </p>
        </div>

        {/* Absent Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isBangla ? 'অনুপস্থিতি' : 'Absences'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-700 mt-3">
            {attSummary?.absent || 0}{' '}
            <span className="text-sm font-semibold text-slate-400">
              {isBangla ? 'সেশন' : 'sessions'}
            </span>
          </p>
          <p className="text-[11px] text-rose-600 mt-3 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            {(attSummary?.absent || 0) >= 3
              ? isBangla ? 'সতর্কবার্তা: অনুপস্থিতি বেশি' : 'Warning: High absences'
              : isBangla ? 'স্বাভাবিক সীমার মধ্যে' : 'Normal range'}
          </p>
        </div>

        {/* Help Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-800 mt-3">
            {helpRequests.length}
          </p>
          <p className="text-[11px] text-blue-600 mt-3 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            {helpRequests.filter((h) => h.status === 'resolved').length}{' '}
            {isBangla ? 'টি সমাধান হয়েছে' : 'resolved'}
          </p>
        </div>
      </div>

      {/* Modern Segmented Tabs Bar */}
      <div className="bg-slate-200/70 p-1.5 rounded-xl inline-flex gap-1.5 border border-slate-200 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'today'
              ? 'bg-white text-[#0B2A21] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#0B2A21]" />
          <span>{isBangla ? 'আজকের ক্লাস ও মূল্যায়ন' : "Today's Classes & Feedback"}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-white text-[#0B2A21] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#0B2A21]" />
          <span>{isBangla ? 'উপস্থিতির হিস্ট্রি লগ' : 'Attendance Log'}</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'help'
              ? 'bg-white text-[#0B2A21] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#0B2A21]" />
          <span>{isBangla ? 'শিক্ষকের সহায়তা ও উত্তর' : 'Teacher Help Requests'}</span>
          {helpRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {helpRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Today's Classes & Feedback */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {isBangla ? 'আপনার কোর্স ক্লাস সমূহ' : 'Your Scheduled Sessions'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? '১০-১৫ সেকেন্ডে ফিডব্যাক জমা দিন' : '10-15s Quick Feedback'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s) => {
              const given = hasGivenFeedback(s.id);
              const pastFeedback = feedbacks.find((fb) => fb.session === s.id);

              return (
                <div
                  key={s.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between gap-4 relative overflow-hidden pl-6"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#0B2A21]" />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#0B2A21] border border-emerald-200">
                        {s.subject_name}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">
                      {s.topic_title || (isBangla ? 'সাধারণ ক্লাস সেশন' : 'General Session')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isBangla ? 'তারিখ:' : 'Date:'} {s.session_date} • {isBangla ? 'শিক্ষক:' : 'Faculty:'}{' '}
                      <strong className="text-slate-700">{s.teacher_name}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {hasAttended(s.id) ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isBangla ? 'উপস্থিতি গৃহীত' : 'Attended'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setScannerOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md transition-colors cursor-pointer"
                          title={isBangla ? 'কিউআর স্ক্যান করে উপস্থিতি দিন' : 'Scan attendance'}
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-700" />
                          <span>{isBangla ? 'উপস্থিতি স্ক্যান' : 'Scan QR'}</span>
                        </button>
                      )}

                      {given ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {isBangla ? 'ফিডব্যাক সম্পন্ন' : 'Feedback Given'} (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500 inline mx-0.5" />
                            {pastFeedback?.understanding_rating}/5)
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSessionForFeedback(s);
                            setFeedbackRating(5);
                            setFeedbackNeedsHelp(false);
                            setFeedbackComment('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#0B2A21] hover:bg-[#134E3E] text-white rounded-md shadow-xs transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>{isBangla ? 'ফিডব্যাক দিন' : 'Rate Class'}</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium capitalize">
                      {s.audience === 'all'
                        ? isBangla ? 'সকলের জন্য' : 'All Students'
                        : `${s.audience} module`}
                    </span>
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className="col-span-2 p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">
                  {isBangla ? 'বর্তমানে কোনো ক্লাস সেশন শিডিউল নেই' : 'No active sessions scheduled'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Attendance History */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              {isBangla ? 'উপস্থিতির বিস্তারিত রেকর্ড' : 'Detailed Attendance Records'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? `মোট ${attRecords.length}টি ক্লাস রেকর্ড` : `Total ${attRecords.length} records`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                  <th className="py-2.5 px-4">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="py-2.5 px-4">{isBangla ? 'বিষয়' : 'Subject'}</th>
                  <th className="py-2.5 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-2.5 px-4 text-right">{isBangla ? 'মন্তব্য' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-medium text-gray-900">
                      {rec.session_date}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-800">
                      {rec.subject_name}
                    </td>
                    <td className="py-2.5 px-4">
                      {rec.status === 'present' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {isBangla ? 'উপস্থিত' : 'Present'}
                        </span>
                      )}
                      {rec.status === 'late' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isBangla ? 'দেরিতে উপস্থিত' : 'Late'}
                        </span>
                      )}
                      {rec.status === 'absent' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          {isBangla ? 'অনুপস্থিত' : 'Absent'}
                        </span>
                      )}
                      {rec.status === 'approved_leave' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          {isBangla ? 'অনুমোদিত ছুটি' : 'Leave'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-500">
                      {rec.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Help Requests */}
      {activeTab === 'help' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {isBangla ? 'আমার হেল্প রিকোয়েস্ট ও শিক্ষকের উত্তর' : 'Teacher Help Inquiries & Answers'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? 'শিক্ষক উত্তর দিলে এখানে দেখতে পাবেন' : 'Teacher answers will appear here'}
            </span>
          </div>

          <div className="space-y-3">
            {helpRequests.map((hr) => (
              <div
                key={hr.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {hr.subject_name}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      {hr.topic_title}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      hr.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : hr.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hr.status === 'resolved'
                      ? isBangla ? 'সমাধান হয়েছে' : 'Resolved'
                      : hr.status === 'in_progress'
                      ? isBangla ? 'শিক্ষক পর্যালোচনা করছেন' : 'In Progress'
                      : isBangla ? 'অপেক্ষমান' : 'Pending'}
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                  <p className="text-gray-500 font-medium mb-1">
                    {isBangla ? 'আপনার প্রশ্ন / জিজ্ঞাসা:' : 'Your Question:'}
                  </p>
                  <p className="text-gray-800">{hr.student_message}</p>
                </div>

                {hr.teacher_note ? (
                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs">
                    <p className="text-emerald-800 font-bold flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      {hr.teacher_name} {isBangla ? 'এর সমাধান ও নির্দেশনা:' : 'Teacher Reply:'}
                    </p>
                    <p className="text-emerald-950 font-medium pl-5">{hr.teacher_note}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    {isBangla
                      ? 'শিক্ষক শীঘ্রই আপনার প্রশ্নটির উত্তর প্রদান করবেন।'
                      : 'Teacher will review and answer your request soon.'}
                  </p>
                )}

                {hr.status !== 'resolved' && (
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isBangla
                        ? 'পাঠটি কি এখন বুঝে গেছেন?'
                        : 'Do you now understand this topic?'}
                    </p>
                    <button
                      onClick={() => handleMarkHelpResolved(hr.id)}
                      disabled={resolvingHelpId === hr.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#0B2A21] hover:text-[#E5C378] text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {resolvingHelpId === hr.id
                          ? isBangla ? 'আপডেট হচ্ছে...' : 'Updating...'
                          : isBangla ? 'আলহামদুলিল্লাহ, এখন বুঝে গেছি' : 'Mark as Understood'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {helpRequests.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                <HelpCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">
                  {isBangla ? 'কোনো সক্রিয় হেল্প রিকোয়েস্ট নেই' : 'No help requests found'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isBangla
                    ? 'ক্লাসের কোনো বিষয়ে সাহায্য লাগলে ফিডব্যাক জমা দেওয়ার সময় "সহায়তা প্রয়োজন" সিলেক্ট করুন।'
                    : 'Check "I need help" when rating a class if you need extra support.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Feedback Submission Modal (10-15s submittable) */}
      {selectedSessionForFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 border-t-4 border-t-[#C5A059] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0B2A21] flex items-center justify-center shadow-xs">
                  <Star className="w-5 h-5 fill-[#C5A059] text-[#C5A059]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'ক্লাস ফিডব্যাক ও মূল্যায়ন' : 'Class Understanding Feedback'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedSessionForFeedback.subject_name} • {selectedSessionForFeedback.session_date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSessionForFeedback(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSuccessMsg ? (
              <div className="p-6 text-center text-emerald-800 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">{feedbackSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {/* 5-Star / Percentage Rating Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {isBangla
                        ? 'আজকের পাঠ আপনি শতকরা কতটুকু বুঝেছেন?'
                        : 'How much of this class did you understand?'}
                    </label>
                    <span className="text-xs font-black text-[#0B2A21] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {ratingDescriptions[feedbackRating]?.pct}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => {
                          setFeedbackRating(starVal);
                          if (starVal < 5) setFeedbackNeedsHelp(true);
                        }}
                        className={`flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                          feedbackRating >= starVal
                            ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 shadow-xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            feedbackRating >= starVal
                              ? 'fill-[#C5A059] text-[#C5A059]'
                              : 'text-slate-300'
                          }`}
                        />
                        <span className="text-[10px] font-extrabold font-mono">
                          {starVal === 1 ? '২০%' : starVal === 2 ? '৪০%' : starVal === 3 ? '৬০%' : starVal === 4 ? '৮০%' : '১০০%'}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs font-bold text-[#0B2A21] mt-2.5 bg-emerald-50/60 py-1.5 px-3 rounded-md border border-emerald-100">
                    {isBangla
                      ? ratingDescriptions[feedbackRating]?.bn
                      : ratingDescriptions[feedbackRating]?.en}
                  </p>
                </div>

                {/* Anti-Fakibaz Guardrail Notice if not 100% */}
                {feedbackRating < 5 && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>
                        {isBangla
                          ? 'সুনির্দিষ্ট কারণ উল্লেখ করা আবশ্যক'
                          : 'Specific Explanation Required'}
                      </span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      {isBangla
                        ? `যেহেতু আপনি পাঠের ${ratingDescriptions[feedbackRating]?.pct} বুঝেছেন এবং বাকি অংশ বুঝতে পারেননি, শিক্ষককে নির্দিষ্টভাবে জানাতে নিচের বক্সে কোন অংশটি/ধাপটি বুঝেননি তা লিখুন। ফাঁকিবাজি রোধে সুনির্দিষ্ট বিবরণ ছাড়া জমা হবে না।`
                        : `Since you understood ${ratingDescriptions[feedbackRating]?.pct}, describe specifically which concept was unclear so the teacher can resolve it.`}
                    </p>
                  </div>
                )}

                {/* Need Help Checkbox */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackNeedsHelp}
                      onChange={(e) => setFeedbackNeedsHelp(e.target.checked)}
                      className="mt-0.5 rounded text-[#0B2A21] focus:ring-[#0B2A21] w-4 h-4 cursor-pointer accent-[#0B2A21]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {isBangla
                          ? 'আমার এই বিষয়ে শিক্ষকের ব্যক্তিগত সহায়তা প্রয়োজন'
                          : 'I need personal help/clarification from the teacher'}
                      </span>
                      <span className="text-[11px] text-slate-600 mt-0.5 block">
                        {isBangla
                          ? 'এটি টিক দিলে শিক্ষক আপনার জন্য একটি হেল্প রিকোয়েস্ট পাবেন।'
                          : 'Checking this opens an actionable help ticket for your teacher.'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Specific Problem Description Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {feedbackRating < 5 || feedbackNeedsHelp
                      ? isBangla
                        ? 'ক্লাসের কোন অংশটি বা বিষয়টি বুঝতে পারেননি (বাধ্যতামূলক):'
                        : 'Specify which part/concept was not understood (Required):'
                      : isBangla
                      ? 'অতিরিক্ত মন্তব্য বা অভিজ্ঞতা (ঐচ্ছিক):'
                      : 'Additional Comments (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    required={feedbackRating < 5 || feedbackNeedsHelp}
                    minLength={feedbackRating < 5 || feedbackNeedsHelp ? 8 : 0}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder={
                      feedbackRating < 5 || feedbackNeedsHelp
                        ? isBangla
                          ? 'উদা: হিসাবের ৩য় জার্নাল এন্ট্রি বা ডেবিল-ক্রেডিট রুল বুঝতে সমস্যা হয়েছে... (সুনির্দিষ্ট সমস্যা লিখুন)'
                          : 'E.g., Having trouble understanding the 3rd journal entry formula in practice...'
                        : isBangla
                        ? 'আলহামদুলিল্লাহ পুরো পাঠটি চমৎকারভাবে বুঝতে পেরেছি...'
                        : 'Understood everything clearly...'
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0B2A21] focus:ring-1 focus:ring-[#0B2A21]"
                  />
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSessionForFeedback(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="px-5 py-2.5 text-xs font-extrabold bg-[#0B2A21] hover:bg-[#164E3D] text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submittingFeedback ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[#C5A059]" />
                    )}
                    <span>{isBangla ? 'ফিডব্যাক জমা দিন' : 'Submit Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Browser Live QR Code Attendance Scanner Modal */}
      <WebQRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSuccess={loadStudentData}
      />

      {/* Student Digital ID Card and Admit Card Modal */}
      <StudentIdCardModal
        isOpen={idCardOpen}
        onClose={() => setIdCardOpen(false)}
        studentId={profile?.id || 'me'}
        initialData={
          profile
            ? {
                student_id: profile.id,
                student_id_number: profile.student_id_number,
                registration_no: profile.registration_no,
                full_name: profile.full_name,
                campus_name: profile.campus_name,
                batch_name: profile.current_batch_name,
                education_background: profile.education_background,
              }
            : null
        }
      />
    </div>
  );
}
