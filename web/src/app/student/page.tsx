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
  Search,
  Download,
  FileText,
  Filter,
  Sparkles,
  Award,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import WebQRScannerModal from '@/components/student/WebQRScannerModal';
import StudentIdCardModal from '@/components/student/StudentIdCardModal';
import LectureMaterialsModal, { SessionMaterialItem } from '@/components/student/LectureMaterialsModal';
import { GraduationCertificateModal, GraduationData } from '@/components/student/GraduationCertificateModal';
import QuizAndHomeworkModal from '@/components/student/QuizAndHomeworkModal';
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
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'help' | 'materials' | 'graduation'>('today');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [graduationData, setGraduationData] = useState<GraduationData | null>(null);

  // Lecture Materials Hub & Modal
  const [materials, setMaterials] = useState<SessionMaterialItem[]>([]);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [selectedSessionForMaterials, setSelectedSessionForMaterials] = useState<ClassSessionItem | null>(null);
  const [selectedMaterialForModal, setSelectedMaterialForModal] = useState<SessionMaterialItem | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [downloadingMatId, setDownloadingMatId] = useState<number | null>(null);

  // Micro-Quiz & Homework Modal
  const [assignmentsModalOpen, setAssignmentsModalOpen] = useState(false);
  const [selectedSessionForAssignments, setSelectedSessionForAssignments] = useState<ClassSessionItem | null>(null);

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
    const handleUrlTab = (customHref?: string) => {
      if (typeof window !== 'undefined') {
        const search = customHref && customHref.includes('?')
          ? customHref.split('?')[1]
          : window.location.search;
        const params = new URLSearchParams(search);
        const tab = params.get('tab');
        if (tab === 'attendance' || tab === 'help' || tab === 'today' || tab === 'materials' || tab === 'graduation') {
          setActiveTab(tab as any);
        } else if (!tab && !params.get('scan')) {
          setActiveTab('today');
        }
        if (params.get('scan') === 'true') {
          setScannerOpen(true);
        }
      }
    };
    handleUrlTab();

    const onTabNav = (e: any) => {
      const href = e.detail?.href || '';
      handleUrlTab(href);
      setTimeout(() => {
        const tabEl = document.getElementById('student-tab-section');
        if (tabEl) {
          tabEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    };

    const onDirectTab = (e: any) => {
      const tab = e.detail;
      if (['today', 'attendance', 'help', 'materials', 'graduation'].includes(tab)) {
        setActiveTab(tab);
        setTimeout(() => {
          const tabEl = document.getElementById('student-tab-section');
          if (tabEl) {
            tabEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      }
    };

    window.addEventListener('popstate', () => handleUrlTab());
    window.addEventListener('assdi-tab-navigate', onTabNav);
    window.addEventListener('student-tab-change', onDirectTab);
    return () => {
      window.removeEventListener('popstate', () => handleUrlTab());
      window.removeEventListener('assdi-tab-navigate', onTabNav);
      window.removeEventListener('student-tab-change', onDirectTab);
    };
  }, [user]);

  const handleTabChange = (tab: 'today' | 'attendance' | 'help' | 'materials' | 'graduation') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const href = tab === 'today' ? '/student' : `/student?tab=${tab}`;
      window.history.pushState(null, '', href);
      window.dispatchEvent(new CustomEvent('assdi-nav-change', { detail: { href } }));
    }
  };

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
      const [profRes, attRes, sessRes, fbRes, helpRes, matRes, gradRes] = await Promise.all([
        api.get('/api/v1/students/me/').catch(() => ({ data: null })),
        api.get('/api/v1/attendance/mine/').catch(() => ({ data: null })),
        api.get('/api/v1/class-sessions/?status=published').catch(() => ({ data: [] })),
        api.get('/api/v1/feedback/mine/').catch(() => ({ data: [] })),
        api.get('/api/v1/help-requests/').catch(() => ({ data: [] })),
        api.get('/api/v1/session-materials/').catch(() => ({ data: [] })),
        api.get('/api/v1/students/me/graduation-eligibility/').catch(() => ({ data: null })),
      ]);

      if (gradRes.data) {
        setGraduationData(gradRes.data);
      }

      if (matRes.data) {
        const matList = Array.isArray(matRes.data)
          ? matRes.data
          : matRes.data?.results || [];
        setMaterials(matList);
      }

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

  const handleDownloadMaterial = async (mat: SessionMaterialItem) => {
    setDownloadingMatId(mat.id);
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

      mat.download_count += 1;
      setMaterials([...materials]);
      toast.success(isBangla ? 'লেকচার শিট ডাউনলোড শুরু হয়েছে!' : 'Download started!');
    } catch (err) {
      toast.error(isBangla ? 'ফাইল ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed');
    } finally {
      setDownloadingMatId(null);
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

  // Derived subjects and filtered materials for Tab 4 (Resource Hub)
  const availableSubjects = Array.from(
    new Set(materials.map((m) => m.subject_name).filter(Boolean))
  );

  const filteredMaterials = materials.filter((m) => {
    if (selectedSubjectFilter !== 'all' && m.subject_name !== selectedSubjectFilter) {
      return false;
    }
    if (selectedTypeFilter !== 'all' && m.material_type !== selectedTypeFilter) {
      return false;
    }
    if (materialSearchQuery.trim()) {
      const q = materialSearchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchTopic = m.topic_title?.toLowerCase().includes(q);
      const matchSubject = m.subject_name?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchEthics = m.hadith_or_ethics_ref?.toLowerCase().includes(q);
      return Boolean(matchTitle || matchTopic || matchSubject || matchDesc || matchEthics);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Student Profile Hero Card (Madrasat-us-Sunnah Warm Amber Banner Architecture) */}
      <div className="bg-[#FFFBEB] rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] shadow-xs p-6 sm:p-7 text-[#0F172A] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              <GraduationCap className="w-8 h-8 text-[#0F766E]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border border-[#CCFBF1] text-[#0F766E]">
                  {profile?.current_batch_name || 'SBMC Batch 42'}
                </span>
                <span className="text-xs font-mono font-bold bg-white text-[#0F766E] px-2.5 py-0.5 rounded-md border border-[#CCFBF1]">
                  {profile?.student_id_number || 'STD-2026-042-001'}
                </span>
                <span className="text-[11px] font-semibold bg-[#F0FDFA] text-[#0369A1] px-2 py-0.5 rounded-md border border-[#CCFBF1] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-pulse" />
                  {isBangla ? 'নিয়মিত শিক্ষার্থী' : 'Active Student'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight font-serif">
                {profile?.full_name || 'Abdullah Student'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] mt-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#0F766E]" />
                  {profile?.campus_name || 'Kazi Bari Campus'}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#0F766E]" />
                  {isBangla ? 'ব্যাকগ্রাউন্ড:' : 'Background:'} {profile?.education_background || 'General'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIdCardOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title={isBangla ? 'ডিজিটাল আইডি কার্ড ও এডমিট কার্ড' : 'Digital ID & Admit Card'}
            >
              <CreditCard className="w-4 h-4 text-[#B45309]" />
              <span>{isBangla ? 'আইডি কার্ড' : 'ID Card'}</span>
            </button>
            <button
              onClick={() => setCertModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title={isBangla ? 'কোর্স সনদপত্র প্রিভিউ ও প্রিন্ট' : 'Course Certificate Preview & Print'}
            >
              <Award className="w-4 h-4 text-[#B45309]" />
              <span>{isBangla ? 'সনদপত্র' : 'Certificate'}</span>
            </button>
            <button
              onClick={() => setScannerOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 border border-[#FCD34D]"
              title={isBangla ? 'ক্যামেরা দিয়ে কিউআর স্ক্যান করুন' : 'Scan Attendance QR'}
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>{isBangla ? 'কিউআর দিয়ে উপস্থিতি' : 'Scan Attendance QR'}</span>
            </button>
            <button
              onClick={loadStudentData}
              title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#B45309] ${loading ? 'animate-spin' : ''}`} />
              <span>{isBangla ? 'তথ্য রিফ্রেশ' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance & Learning Metric Cards (Bento Style & Clickable Shortcuts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            handleTabChange('attendance');
            document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTabChange('attendance');
              document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          title={isBangla ? 'উপস্থিতির বিস্তারিত হিস্ট্রি দেখতে ক্লিক করুন' : 'Click to view attendance history'}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              {isBangla ? 'উপস্থিতি হার' : 'Attendance Rate'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-emerald-600">
              {safeFixed(attSummary?.attendance_percentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (attSummary?.attendance_percentage || 0) < 75
                  ? 'bg-red-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(attSummary?.attendance_percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {(attSummary?.attendance_percentage || 0) >= 80
              ? isBangla ? 'সন্তোষজনক ও নিয়মিত উপস্থিতি' : 'Satisfactory attendance'
              : isBangla ? 'উপস্থিতির হার বৃদ্ধি করা প্রয়োজন' : 'Needs improvement'}
          </p>
        </div>

        {/* Present Days */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            handleTabChange('attendance');
            document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTabChange('attendance');
              document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          title={isBangla ? 'উপস্থিত সেশনের তালিকা দেখতে ক্লিক করুন' : 'Click to view attended sessions'}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              {isBangla ? 'উপস্থিত সেশন' : 'Present Sessions'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">
            {attSummary?.present || 0}{' '}
            <span className="text-sm font-semibold text-slate-400">
              / {attSummary?.total_sessions || 0}
            </span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-3 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isBangla ? 'সফলভাবে ক্লাসে সম্পন্ন' : 'Attended successfully'}
          </p>
        </div>

        {/* Absent Days */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            handleTabChange('attendance');
            document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTabChange('attendance');
              document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          title={isBangla ? 'অনুপস্থিতির হিস্ট্রি ও বিস্তারিত দেখতে ক্লিক করুন' : 'Click to view absence history'}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-red-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-red-700 transition-colors">
              {isBangla ? 'অনুপস্থিতি' : 'Absences'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200 group-hover:bg-red-100 transition-colors">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 mt-3">
            {attSummary?.absent || 0}{' '}
            <span className="text-sm font-semibold text-red-400">
              {isBangla ? 'সেশন' : 'sessions'}
            </span>
          </p>
          <p className="text-[11px] text-red-600 mt-3 flex items-center gap-1 font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            {(attSummary?.absent || 0) >= 3
              ? isBangla ? 'সতর্কবার্তা: অনুপস্থিতি বেশি' : 'Warning: High absences'
              : isBangla ? 'স্বাভাবিক সীমার মধ্যে' : 'Normal range'}
          </p>
        </div>

        {/* Help Requests */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            handleTabChange('help');
            document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTabChange('help');
              document.getElementById('student-tab-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          title={isBangla ? 'শিক্ষকের সমাধান ও উত্তর দেখতে ক্লিক করুন' : 'Click to view teacher solutions'}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-900 transition-colors">
              {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center border border-blue-200 group-hover:bg-blue-200 transition-colors">
              <HelpCircle className="w-4 h-4 text-blue-900" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-950 mt-3">
            {helpRequests.length}
          </p>
          <p className="text-[11px] text-blue-900 mt-3 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            {helpRequests.filter((h) => h.status === 'resolved').length}{' '}
            {isBangla ? 'টি সমাধান হয়েছে' : 'resolved'}
          </p>
        </div>
      </div>

      {/* Modern Segmented Tabs Bar */}
      <div id="student-tab-section" className="bg-slate-200/70 p-1.5 rounded-xl inline-flex gap-1.5 border border-slate-200 max-w-full overflow-x-auto scroll-mt-24">
        <button
          onClick={() => handleTabChange('today')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'today'
              ? 'bg-white text-[#0F766E] border border-[#CCFBF1] shadow-xs'
              : 'text-slate-600 hover:text-[#0F766E] hover:bg-white/40'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#0F766E]" />
          <span>{isBangla ? 'আজকের ক্লাস ও মূল্যায়ন' : "Today's Classes & Feedback"}</span>
        </button>

        <button
          onClick={() => handleTabChange('attendance')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-white text-[#0F766E] border border-[#CCFBF1] shadow-xs'
              : 'text-slate-600 hover:text-[#0F766E] hover:bg-white/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
          <span>{isBangla ? 'উপস্থিতির হিস্ট্রি লগ' : 'Attendance Log'}</span>
        </button>

        <button
          onClick={() => handleTabChange('help')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'help'
              ? 'bg-white text-[#0F766E] border border-[#CCFBF1] shadow-xs'
              : 'text-slate-600 hover:text-[#0F766E] hover:bg-white/40'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#0F766E]" />
          <span>{isBangla ? 'শিক্ষকের সহায়তা ও উত্তর' : 'Teacher Help Requests'}</span>
          {helpRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0FDFA] text-[#0369A1] font-bold border border-[#CCFBF1]">
              {helpRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('materials')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-white text-[#0F766E] border border-[#CCFBF1] shadow-xs'
              : 'text-slate-600 hover:text-[#0F766E] hover:bg-white/40'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#0F766E]" />
          <span>{isBangla ? 'লেকচার শিট ও রিসোর্স হাব' : 'Lecture Notes & Hub'}</span>
          {materials.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0FDFA] text-[#0F766E] font-bold border border-[#CCFBF1]">
              {materials.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('graduation')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'graduation'
              ? 'bg-white text-[#0F766E] border border-[#CCFBF1] shadow-xs'
              : 'text-slate-600 hover:text-[#0F766E] hover:bg-white/40'
          }`}
        >
          <Award className="w-4 h-4 text-[#C1982E]" />
          <span>{isBangla ? 'সনদ ও গ্র্যাজুয়েশন' : 'Graduation & Certificate'}</span>
          {graduationData?.is_eligible ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0FDF4] text-[#166534] font-extrabold border border-[#86EFAC]">
              {isBangla ? 'যোগ্য' : 'Eligible'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0FDFA] text-[#0369A1] font-bold border border-[#CCFBF1]">
              {graduationData?.overall_readiness_score || 0}%
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
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#0D9488]/40 transition-all flex flex-col justify-between gap-4 relative overflow-hidden pl-6"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F766E]" />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
                        {s.subject_name}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
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
                      <button
                        onClick={() => {
                          setSelectedSessionForMaterials(s);
                          setSelectedMaterialForModal(null);
                          setMaterialsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] rounded-md transition-colors cursor-pointer shadow-2xs"
                        title={isBangla ? 'ক্লাস লেকচার শিট ও রিসোর্স' : 'Lecture Sheet & Resources'}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>{isBangla ? 'লেকচার শিট' : 'Lecture Sheet'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedSessionForAssignments(s);
                          setAssignmentsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-[#92400E] border border-amber-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                        title={isBangla ? 'কুইজ ও বাড়ির কাজ' : 'Quiz & Homework'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>{isBangla ? 'কুইজ ও বাড়ির কাজ' : 'Quiz & Homework'}</span>
                      </button>

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
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-md shadow-xs transition-colors cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
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

      {/* TAB 4: Lecture Sheets & Resource Hub */}
      {activeTab === 'materials' && (
        <div className="space-y-5">
          {/* Hub Header & Controls */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#0F766E] text-white uppercase tracking-wider">
                    {isBangla ? 'রিসোর্স হাব' : 'Resource Hub'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {isBangla ? `মোট ${materials.length}টি লেকচার শিট` : `${materials.length} Materials`}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  {isBangla ? 'লেকচার শিট ও রিসোর্স ডাউনলোড হাব' : 'Lecture Sheet & Study Resource Hub'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBangla
                    ? 'আপনার কোর্সের প্রতিটি ক্লাসের পূর্ণাঙ্গ হ্যান্ডআউট, হাদিস রেফারেন্স ও প্র্যাকটিক্যাল শিট ডাউনলোড করুন।'
                    : 'Download authentic handouts, ethical guidelines, and practice sheets for every class.'}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={materialSearchQuery}
                  onChange={(e) => setMaterialSearchQuery(e.target.value)}
                  placeholder={
                    isBangla
                      ? 'টপিক, বিষয় বা শিরোনাম খুঁজুন...'
                      : 'Search topics, subjects...'
                  }
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                />
                {materialSearchQuery && (
                  <button
                    onClick={() => setMaterialSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Subject Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                {isBangla ? 'বিষয়:' : 'Subject:'}
              </span>
              <button
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isBangla ? 'সকল বিষয়' : 'All Subjects'}
              </button>
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSubjectFilter === subj
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>

            {/* Material Type Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                {isBangla ? 'ধরন:' : 'Type:'}
              </span>
              {[
                { key: 'all', bn: 'সব ধরন', en: 'All Types' },
                { key: 'lecture_sheet', bn: 'লেকচার শিট', en: 'Lecture Sheets' },
                { key: 'handout', bn: 'হ্যান্ডআউট', en: 'Handouts' },
                { key: 'hadith_ref', bn: 'হাদিস ও ইসলামিক এথিক্স', en: 'Hadith & Ethics' },
                { key: 'exercise_sheet', bn: 'প্র্যাকটিক্যাল এক্সারসাইজ', en: 'Exercises' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTypeFilter(t.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedTypeFilter === t.key
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {isBangla ? t.bn : t.en}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#0D9488]/40 transition-all flex flex-col justify-between gap-4 relative overflow-hidden pl-6"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F766E]" />
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
                      {mat.subject_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {mat.material_type_display}
                    </span>
                  </div>

                  <h3
                    onClick={() => {
                      setSelectedMaterialForModal(mat);
                      setSelectedSessionForMaterials(null);
                      setMaterialsModalOpen(true);
                    }}
                    className="font-black text-slate-900 text-sm hover:text-emerald-800 transition cursor-pointer leading-snug"
                  >
                    {mat.title}
                  </h3>

                  {mat.topic_title && (
                    <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{mat.topic_title}</span>
                    </p>
                  )}

                  {mat.teacher_name && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{isBangla ? 'শিক্ষক:' : 'Faculty:'} <strong>{mat.teacher_name}</strong></span>
                      {mat.session_date && (
                        <span>• <span className="font-mono">{mat.session_date}</span></span>
                      )}
                    </p>
                  )}

                  {/* Key takeaways snippet */}
                  {Array.isArray(mat.key_takeaways) && mat.key_takeaways.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 text-xs text-slate-700 space-y-1">
                      {mat.key_takeaways.slice(0, 2).map((pt, i) => (
                        <p key={i} className="flex items-start gap-1.5 line-clamp-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="truncate">{pt}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Ethics snippet */}
                  {mat.hadith_or_ethics_ref && (
                    <p className="text-[11px] text-amber-900 bg-amber-50/70 px-2.5 py-1.5 rounded-lg border border-amber-200/70 italic line-clamp-1">
                      &ldquo;{mat.hadith_or_ethics_ref}&rdquo;
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-mono font-bold text-slate-700">
                      {mat.formatted_file_size || '1.2 MB'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      {mat.download_count} {isBangla ? 'ডাউনলোড' : 'downloads'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedMaterialForModal(mat);
                        setSelectedSessionForMaterials(null);
                        setMaterialsModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      {isBangla ? 'বিস্তারিত দেখুন' : 'Preview'}
                    </button>

                    <button
                      onClick={() => handleDownloadMaterial(mat)}
                      disabled={downloadingMatId === mat.id}
                      className="px-3.5 py-1.5 text-xs font-extrabold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {downloadingMatId === mat.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>{isBangla ? 'ডাউনলোড' : 'Download'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredMaterials.length === 0 && (
              <div className="col-span-1 lg:col-span-2 p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-sm">
                  {isBangla ? 'কোনো লেকচার শিট বা রিসোর্স পাওয়া যায়নি' : 'No materials found'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isBangla
                    ? 'আপনার সার্চ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।'
                    : 'Try clearing your search or selecting a different filter.'}
                </p>
                {(materialSearchQuery || selectedSubjectFilter !== 'all' || selectedTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setMaterialSearchQuery('');
                      setSelectedSubjectFilter('all');
                      setSelectedTypeFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 cursor-pointer"
                  >
                    {isBangla ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Graduation & Certificate Eligibility Tracker */}
      {activeTab === 'graduation' && (
        <div className="space-y-5">
          {/* Tracker Header */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#B45309] text-white uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-white" />
                  {isBangla ? 'গ্র্যাজুয়েশন ও সনদ' : 'Graduation & Certificate'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {profile?.current_batch_name || 'SBMC Batch 42'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                {isBangla ? 'সনদ ও গ্র্যাজুয়েশন অর্জনের যোগ্যতা ট্র্যাকার' : 'Graduation & Certificate Eligibility Tracker'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                {isBangla
                  ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট কর্তৃক সনদ অর্জনের অগ্রগতি, শর্তাবলি পূরণ ও কোর্স সমাপনী সনদপত্র।'
                  : 'Track your real-time completion progress, institutional compliance criteria, and certificate readiness.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCertModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs sm:text-sm border border-emerald-400/40 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Award className="w-4 h-4 text-white" />
                <span>{isBangla ? 'সনদপত্র দেখুন ও প্রিন্ট করুন' : 'View & Print Certificate'}</span>
              </button>
            </div>
          </div>

          {/* Readiness Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Card: Overall Readiness Score Ring */}
            <div className="bg-[#F0FDFA] text-[#0F172A] p-6 rounded-2xl border border-[#CCFBF1] shadow-xs flex flex-col justify-between relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#0F766E]/5 blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                    {isBangla ? 'সার্বিক গ্র্যাজুয়েশন প্রস্তুতি' : 'Graduation Readiness'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      graduationData?.is_eligible
                        ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/40'
                        : graduationData?.eligibility_status === 'on_track'
                        ? 'bg-white text-[#0369A1] border-[#CCFBF1]'
                        : 'bg-amber-500/20 text-amber-800 border-amber-500/40'
                    }`}
                  >
                    {graduationData?.eligibility_status_bn || 'প্রস্তুতি চলছে'}
                  </span>
                </div>

                {/* Circular Score Visual */}
                <div className="flex items-center gap-5 my-6">
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-teal-200/50"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#0F766E] transition-all duration-1000 ease-out"
                        strokeDasharray={`${Math.min(graduationData?.overall_readiness_score || 0, 100)}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-black text-[#0F766E]">
                        {graduationData?.overall_readiness_score || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-[#0F766E] font-medium">
                      {isBangla ? 'প্রত্যাশিত ফলাফল ও গ্রেড:' : 'Expected Grade:'}
                    </p>
                    <p className="text-base font-bold text-[#0F172A] leading-tight">
                      {graduationData?.grade_bn || 'মুমতাজ (সর্বোচ্চ কৃতিত্ব)'}
                    </p>
                    <p className="text-[11px] text-[#0F766E] font-mono">
                      {graduationData?.grade_en || 'Distinction'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#CCFBF1] text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>{isBangla ? 'উপস্থিতির অবদান (৫০%):' : 'Attendance Weight (50%):'}</span>
                    <strong className="text-[#0F172A] font-mono">{graduationData?.attendance_percentage || 0}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'অনুধাবন মান (৩০%):' : 'Comprehension Weight (30%):'}</span>
                    <strong className="text-[#0F172A] font-mono">{graduationData?.average_understanding_percentage || 0}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'সমস্যা সমাধান (২০%):' : 'Help Clearance (20%):'}</span>
                    <strong className="text-[#0F172A] font-mono">
                      {graduationData?.pending_help_requests === 0
                        ? isBangla ? '১০০% নিষ্পন্ন' : '100% Cleared'
                        : isBangla ? `${graduationData?.pending_help_requests}টি বাকি` : `${graduationData?.pending_help_requests} Pending`}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#CCFBF1]">
                <button
                  onClick={() => setCertModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Award className="w-4 h-4 text-white" />
                  <span>{isBangla ? 'সনদপত্র প্রিভিউ ও ডাউনলোড' : 'Preview & Download Certificate'}</span>
                </button>
              </div>
            </div>

            {/* Right 2 Columns: Criteria Checklist */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#0F766E]" />
                    <span>{isBangla ? 'সনদপত্র পাওয়ার ৪টি আবশ্যিক শর্তাবলি' : 'Mandatory Certificate Criteria'}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {graduationData?.criteria_checklist?.filter((c) => c.met).length || 0} / 4 {isBangla ? 'শর্ত পূরণ' : 'Met'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Criterion 1: Attendance */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      (graduationData?.attendance_percentage || 0) >= 80
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            (graduationData?.attendance_percentage || 0) >= 80
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {(graduationData?.attendance_percentage || 0) >= 80 ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            {isBangla ? '১. ক্লাসে ন্যূনতম ৮০.০% নিয়মিত উপস্থিতি' : '1. Minimum 80.0% Session Attendance'}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isBangla
                              ? `মোট ${graduationData?.total_sessions || 0}টি নির্ধারিত ক্লাসের মধ্যে ${graduationData?.attended_sessions || 0}টি ক্লাসে উপস্থিত ছিলেন।`
                              : `Attended ${graduationData?.attended_sessions || 0} out of ${graduationData?.total_sessions || 0} scheduled classes.`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            (graduationData?.attendance_percentage || 0) >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {graduationData?.attendance_percentage || 0}% / ৮০%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Criterion 2: Understanding Rating */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      (graduationData?.average_understanding_percentage || 0) >= 60
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            (graduationData?.average_understanding_percentage || 0) >= 60
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {(graduationData?.average_understanding_percentage || 0) >= 60 ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            {isBangla ? '২. ক্লাসের বিষয়বস্তু অনুধাবন মান ন্যূনতম ৬০.০%' : '2. Class Understanding Rate Minimum 60.0%'}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isBangla
                              ? `মোট ${graduationData?.total_feedback_count || 0}টি সেশনে মূল্যায়ন সম্পন্ন হয়েছে (গড় অনুধাবন রেটিং: ${graduationData?.average_understanding_rating || 0}/৫)।`
                              : `Completed ${graduationData?.total_feedback_count || 0} class feedback submissions.`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            (graduationData?.average_understanding_percentage || 0) >= 60
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {graduationData?.average_understanding_percentage || 0}% / ৬০%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Criterion 3: Help Requests Clearance */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      (graduationData?.pending_help_requests || 0) === 0
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-blue-50/60 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            (graduationData?.pending_help_requests || 0) === 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {(graduationData?.pending_help_requests || 0) === 0 ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            {isBangla ? '৩. সকল শিক্ষকের সহায়তা ও প্রশ্ন সমাধান (০টি পেন্ডিং)' : '3. Resolution of All Help Requests (0 Pending)'}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isBangla
                              ? `মোট ${graduationData?.resolved_help_requests || 0}টি অ্যাকাডেমিক সমস্যার সমাধান শিক্ষক সম্পন্ন করেছেন।`
                              : `Resolved ${graduationData?.resolved_help_requests || 0} questions with course teachers.`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            (graduationData?.pending_help_requests || 0) === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {graduationData?.pending_help_requests || 0}টি পেন্ডিং
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Criterion 4: Institutional Registration & Verification */}
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#B45309] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            {isBangla ? '৪. প্রাতিষ্ঠানিক ডাটাবেজ ভেরিফিকেশন ও অনুমোদন' : '4. Institutional Verification & Govt. Accreditation'}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isBangla
                              ? `Govt. Reg #STP-DHA-000877 • সনদ সিরিয়াল: ${graduationData?.certificate_info?.certificate_no || 'ASSDI-SBMC-REG-2026'}`
                              : 'Official QR accreditation linked to As-Sunnah central verification database.'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {isBangla ? 'ভেরিফায়েড' : 'Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Feedback Submission Modal (10-15s submittable) */}
      {selectedSessionForFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
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
                    <span className="text-xs font-black text-[#0F766E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
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
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                        <span className="text-[10px] font-extrabold font-mono">
                          {starVal === 1 ? '২০%' : starVal === 2 ? '৪০%' : starVal === 3 ? '৬০%' : starVal === 4 ? '৮০%' : '১০০%'}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs font-bold text-[#0F766E] mt-2.5 bg-[#F0FDFA] py-1.5 px-3 rounded-md border border-[#CCFBF1]">
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
                      className="mt-0.5 rounded text-[#0F766E] focus:ring-[#0F766E] w-4 h-4 cursor-pointer accent-[#0F766E]"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
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
                    className="px-5 py-2.5 text-xs font-extrabold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submittingFeedback ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-white" />
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

      {/* Student Lecture Sheets and Resources Modal */}
      <LectureMaterialsModal
        isOpen={materialsModalOpen}
        onClose={() => {
          setMaterialsModalOpen(false);
          setSelectedSessionForMaterials(null);
          setSelectedMaterialForModal(null);
        }}
        session={selectedSessionForMaterials}
        initialMaterial={selectedMaterialForModal}
        onDownloadSuccess={loadStudentData}
      />

      {/* Student Course Completion & Merit Certificate Modal */}
      <GraduationCertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        data={graduationData}
      />

      {/* Student Micro-Quiz & Homework Submissions Modal */}
      <QuizAndHomeworkModal
        isOpen={assignmentsModalOpen}
        onClose={() => {
          setAssignmentsModalOpen(false);
          setSelectedSessionForAssignments(null);
        }}
        session={selectedSessionForAssignments}
      />
    </div>
  );
}
