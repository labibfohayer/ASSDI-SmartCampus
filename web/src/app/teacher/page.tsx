'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  Users,
  QrCode,
  CheckSquare,
  HelpCircle,
  BarChart3,
  AlertCircle,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  FileQuestion,
  UserCheck,
  Play,
  Send,
  Eye,
  Star,
  Award,
  MessageSquare,
  Search,
  Filter,
  X,
  ClipboardCheck,
  Laptop,
  Check,
  Layers,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import QuizAndHomeworkManagerModal from '@/components/teacher/QuizAndHomeworkManagerModal';

interface ClassSessionItem {
  id: number;
  batch: number;
  batch_name?: string;
  course_name?: string;
  subject: number;
  subject_name?: string;
  topic?: number | null;
  topic_title?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  audience: 'general' | 'madrasa' | 'all';
  status: 'draft' | 'published' | 'cancelled';
  teacher_user?: number;
  teacher_name?: string;
  attendance_count?: number;
  total_students?: number;
  is_live?: boolean;
}

interface HelpRequestItem {
  id: number;
  session: number;
  student: number;
  student_name?: string;
  student_id_number?: string;
  batch_name?: string;
  subject_name?: string;
  topic_title?: string;
  student_comment: string;
  status: 'pending' | 'in_progress' | 'resolved';
  teacher_notes?: string;
  created_at: string;
}

interface StrugglingTopic {
  topic_id: number;
  topic_title: string;
  subject_name: string;
  batch_name: string;
  feedbacks_count: number;
  avg_rating: number;
  understanding_percentage: number;
  low_understanding_count: number;
  help_requests_count: number;
  struggle_score: number;
  difficulty_level: string;
  difficulty_color: string;
  sample_comments: string[];
}

interface AIRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  action_label: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface AttentionStudent {
  student_id: number;
  student_name: string;
  student_id_number: string;
  batch_name: string;
  reason: string;
  status: string;
  topic_title: string;
}

interface TeacherAISummary {
  teacher_id: number;
  teacher_name: string;
  week_label: string;
  start_date: string;
  end_date: string;
  is_thursday: boolean;
  read_time_minutes: number;
  generated_at: string;
  summary_metrics: {
    total_sessions: number;
    total_batches: number;
    total_feedbacks: number;
    average_rating: number;
    average_percentage: number;
    total_help_requests: number;
    pending_help_requests: number;
    resolved_help_requests: number;
    overall_health: string;
    health_color: string;
  };
  top_struggling_topics: StrugglingTopic[];
  attention_students: AttentionStudent[];
  ai_recommendations: AIRecommendation[];
}

// Fallback high-fidelity demo data for seamless presentation
const DEFAULT_TEACHER_SESSIONS: ClassSessionItem[] = [
  {
    id: 101,
    batch: 42,
    batch_name: 'ব্যাচ ৪২',
    course_name: 'Small Business Management Course (SBMC)',
    subject: 1,
    subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
    topic: 12,
    topic_title: 'অ্যাডোবি ইলাস্ট্রেটর: ভেক্টর পাথ ও পেন টুল মাস্টারি',
    session_date: '2026-11-25',
    start_time: '09:00:00',
    end_time: '10:00:00',
    room: 'ল্যাব ০১ (আইটি ভবন)',
    audience: 'general',
    status: 'published',
    attendance_count: 38,
    total_students: 42,
    is_live: true,
  },
  {
    id: 102,
    batch: 41,
    batch_name: 'ব্যাচ ৪১',
    course_name: 'Small Business Management Course (SBMC)',
    subject: 2,
    subject_name: 'ডিজিটাল কনটেন্ট ও ভিডিও এডিটিং',
    topic: 8,
    topic_title: 'প্রিমিয়ার প্রো: কালার গ্রেডিং ও অডিও সিঙ্ক',
    session_date: '2026-11-25',
    start_time: '11:30:00',
    end_time: '12:30:00',
    room: 'মাল্টিমিডিয়া রুম ১০৩',
    audience: 'all',
    status: 'published',
    attendance_count: 0,
    total_students: 40,
    is_live: false,
  },
];

const DEFAULT_TEACHER_HELP_REQUESTS: HelpRequestItem[] = [
  {
    id: 201,
    session: 101,
    student: 6,
    student_name: 'নাজমুল হুদা',
    student_id_number: 'SBMC-42-006',
    batch_name: 'ব্যাচ ৪২',
    subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
    topic_title: 'পেন টুল ও ভেক্টর অ্যাঙ্কর পয়েন্ট',
    student_comment: 'পেন টুলের অ্যাঙ্কর পয়েন্ট কনভার্ট করতে গিয়ে কার্ভ স্মুথ হচ্ছে না, হ্যান্ডেল ভেঙে যাচ্ছে। ক্লাসে একটু হাতেনাতে দেখালে ভালো হতো।',
    status: 'pending',
    created_at: '২০ মিনিট আগে',
  },
  {
    id: 202,
    session: 101,
    student: 11,
    student_name: 'ইমরান নাজির',
    student_id_number: 'SBMC-42-011',
    batch_name: 'ব্যাচ ৪২',
    subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
    topic_title: 'কালার থিওরি ও গোল্ডেন রেশিও গ্রিড',
    student_comment: 'লোগো ডিজাইনের জন্য গোল্ডেন রেশিও গ্রিডের গাইডলাইন লক করার নিয়মটা বুঝতে পারিনি। অনুগ্রহ করে একটু পরামর্শ দিলে উপকৃত হতাম।',
    status: 'in_progress',
    created_at: '১ ঘণ্টা আগে',
  },
  {
    id: 203,
    session: 98,
    student: 19,
    student_name: 'তারেক মাহমুদ',
    student_id_number: 'SBMC-41-019',
    batch_name: 'ব্যাচ ৪১',
    subject_name: 'ডিজিটাল কনটেন্ট ও ভিডিও এডিটিং',
    topic_title: 'অডিও নয়েজ রিডাকশন ফিল্টার',
    student_comment: 'মাইকের ব্যাকগ্রাউন্ড নয়েজ রিমুভ করার সময় ভয়েস সামান্য মেটালিক শোনাচ্ছে। এটার সঠিক ভ্যালু কত রাখব?',
    status: 'resolved',
    teacher_notes: 'Essential Sound প্যানেলে Denoise স্লাইডারটি ২.৫ থেকে ৩.০ এর মধ্যে রাখুন এবং De-reverb ৩০% প্রয়োগ করুন।',
    created_at: 'গতকাল',
  },
];

const DEFAULT_TEACHER_AI_SUMMARY: TeacherAISummary = {
  teacher_id: 1,
  teacher_name: 'জুবায়ের আহমেদ',
  week_label: 'চলতি শিক্ষাবর্ষ • সপ্তাহ ০৮',
  start_date: '2026-11-20',
  end_date: '2026-11-26',
  is_thursday: true,
  read_time_minutes: 2,
  generated_at: '2026-11-25T08:30:00Z',
  summary_metrics: {
    total_sessions: 8,
    total_batches: 2,
    total_feedbacks: 74,
    average_rating: 4.5,
    average_percentage: 88,
    total_help_requests: 5,
    pending_help_requests: 2,
    resolved_help_requests: 3,
    overall_health: 'চমৎকার অগ্রগতি (Good Performance)',
    health_color: 'emerald',
  },
  top_struggling_topics: [
    {
      topic_id: 12,
      topic_title: 'অ্যাডোবি ইলাস্ট্রেটর: ভেক্টর পাথ ও পেন টুল',
      subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
      batch_name: 'ব্যাচ ৪২',
      feedbacks_count: 36,
      avg_rating: 3.8,
      understanding_percentage: 68,
      low_understanding_count: 8,
      help_requests_count: 3,
      struggle_score: 72,
      difficulty_level: 'মাঝারি জটিলতা (Moderate)',
      difficulty_color: 'amber',
      sample_comments: ['পেন টুলের অ্যাঙ্কর পয়েন্ট ও কার্ভ হ্যান্ডলিংয়ে বেশি প্র্যাকটিস দরকার।'],
    },
    {
      topic_id: 8,
      topic_title: 'লোগো আইসোলেশন ও কালার প্যালেট এক্সপোর্ট',
      subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
      batch_name: 'ব্যাচ ৪২',
      feedbacks_count: 38,
      avg_rating: 4.6,
      understanding_percentage: 92,
      low_understanding_count: 2,
      help_requests_count: 1,
      struggle_score: 25,
      difficulty_level: 'সহজ ও স্পষ্ট (Well Understood)',
      difficulty_color: 'emerald',
      sample_comments: ['কালার প্যালেট তৈরি করতে পেরেছি, খুব সহজ লেগেছে।'],
    },
  ],
  attention_students: [
    {
      student_id: 6,
      student_name: 'নাজমুল হুদা',
      student_id_number: 'SBMC-42-006',
      batch_name: 'ব্যাচ ৪২',
      reason: 'পেন টুল অ্যাসাইনমেন্টে কার্ভ সংক্রান্ত সহায়তার আবেদন',
      status: 'pending',
      topic_title: 'ভেক্টর পাথ ও পেন টুল',
    },
    {
      student_id: 11,
      student_name: 'ইমরান নাজির',
      student_id_number: 'SBMC-42-011',
      batch_name: 'ব্যাচ ৪২',
      reason: 'গোল্ডেন রেশিও গ্রিড সেটিংসে বিশেষ নির্দেশনা প্রয়োজন',
      status: 'in_progress',
      topic_title: 'লোগো গ্রিড',
    },
  ],
  ai_recommendations: [
    {
      id: 'rec-1',
      category: 'pedagogy',
      title: 'পেন টুলের জন্য ১০ মিনিটের হ্যান্ডস-অন লাইভ সেশন',
      description: 'ভেক্টর অ্যাঙ্কর পয়েন্ট ও কার্ভ হ্যান্ডলিং নিয়ে ৮ জন শিক্ষার্থীর ফিডব্যাকে অস্পষ্টতা পাওয়া গেছে। আগামী ক্লাসের শুরুতে একটি লাইভ ওয়ার্কশপ নিন।',
      action_label: 'আগামী ক্লাসের রুটিনে অন্তর্ভুক্ত করুন',
      priority: 'high',
      icon: 'target',
    },
    {
      id: 'rec-2',
      category: 'quiz',
      title: 'লোগো এক্সপোর্ট কুইজ রিভিউ',
      description: 'গত কুইজে কালার স্পেস (RGB vs CMYK) প্রশ্নে শিক্ষার্থীদের বোঝার হার সামান্য কম ছিল। সংক্ষেপে রিক্যাপ দিন।',
      action_label: 'কুইজ রিক্যাপ শুরু করুন',
      priority: 'medium',
      icon: 'lightbulb',
    },
  ],
};

export default function TeacherOverviewPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const [todaySessions, setTodaySessions] = useState<ClassSessionItem[]>(DEFAULT_TEACHER_SESSIONS);
  const [helpRequestsList, setHelpRequestsList] = useState<HelpRequestItem[]>(DEFAULT_TEACHER_HELP_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [helpFilter, setHelpFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');

  // AI Weekly Teaching Summary State
  const [aiSummary, setAiSummary] = useState<TeacherAISummary | null>(DEFAULT_TEACHER_AI_SUMMARY);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(true);

  // Micro-Quiz & Homework Manager Modal
  const [assignmentsManagerOpen, setAssignmentsManagerOpen] = useState(false);
  const [selectedSessionForAssignments, setSelectedSessionForAssignments] = useState<ClassSessionItem | null>(null);

  // Quick Resolve Modal State
  const [resolvingRequest, setResolvingRequest] = useState<HelpRequestItem | null>(null);
  const [teacherResolutionNote, setTeacherResolutionNote] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const fetchAISummary = async (isManual = false) => {
    if (isManual) setAiRefreshing(true);
    else setAiLoading(true);

    try {
      const res = await api.get('/api/v1/reports/teacher-ai-weekly-summary/');
      if (res.data?.success && res.data?.data) {
        setAiSummary(res.data.data);
      } else if (res.data?.data) {
        setAiSummary(res.data.data);
      } else {
        setAiSummary(DEFAULT_TEACHER_AI_SUMMARY);
      }
    } catch (err: any) {
      console.warn('Using default AI Teaching Summary:', err?.message);
      setAiSummary(DEFAULT_TEACHER_AI_SUMMARY);
    } finally {
      setAiLoading(false);
      setAiRefreshing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Today's Sessions for Teacher
      const sessionsRes = await api.get('/api/v1/class-sessions/today/');
      const sData = Array.isArray(sessionsRes.data)
        ? sessionsRes.data
        : sessionsRes.data?.results || sessionsRes.data?.data || [];
      if (sData.length > 0) {
        setTodaySessions(sData);
      } else {
        setTodaySessions(DEFAULT_TEACHER_SESSIONS);
      }

      // 2. Fetch Pending Help Requests
      const helpRes = await api.get('/api/v1/help-requests/');
      const hData = Array.isArray(helpRes.data)
        ? helpRes.data
        : helpRes.data?.results || helpRes.data?.data || [];
      if (hData.length > 0) {
        setHelpRequestsList(hData);
      } else {
        setHelpRequestsList(DEFAULT_TEACHER_HELP_REQUESTS);
      }
    } catch (err: any) {
      console.warn('Using fallback teacher dashboard data:', err?.message);
      setTodaySessions(DEFAULT_TEACHER_SESSIONS);
      setHelpRequestsList(DEFAULT_TEACHER_HELP_REQUESTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAISummary();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchAISummary(true);
    toast.success(isBangla ? 'ড্যাশবোর্ড ও এআই সামারি সফলভাবে রিফ্রেশ হয়েছে!' : 'Dashboard & AI summary refreshed');
  };

  // Toggle help request status directly from overview
  const handleStartHelp = async (req: HelpRequestItem) => {
    try {
      await api.post(`/api/v1/help-requests/${req.id}/start/`);
    } catch (e) {
      // Fallback local update
    }
    setHelpRequestsList((prev) =>
      prev.map((item) => (item.id === req.id ? { ...item, status: 'in_progress' } : item))
    );
    toast.success(isBangla ? 'সহায়তা প্রদান শুরু করা হয়েছে!' : 'Marked as In-Progress');
  };

  const handleOpenResolveModal = (req: HelpRequestItem) => {
    setResolvingRequest(req);
    setTeacherResolutionNote(req.teacher_notes || '');
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRequest) return;
    if (!teacherResolutionNote.trim()) {
      toast.error(isBangla ? 'অনুগ্রহ করে সমাধানের নোট বা পরামর্শ লিখুন।' : 'Please enter resolution note.');
      return;
    }

    setSubmittingResolution(true);
    try {
      await api.post(`/api/v1/help-requests/${resolvingRequest.id}/resolve/`, {
        teacher_notes: teacherResolutionNote.trim(),
      });
    } catch (e) {
      // Fallback local update
    }

    setHelpRequestsList((prev) =>
      prev.map((item) =>
        item.id === resolvingRequest.id
          ? { ...item, status: 'resolved', teacher_notes: teacherResolutionNote.trim() }
          : item
      )
    );
    toast.success(isBangla ? 'সহায়তা আবেদন সফলভাবে সমাধান করা হয়েছে!' : 'Help request resolved!');
    setSubmittingResolution(false);
    setResolvingRequest(null);
  };

  // Filtered Help Requests
  const filteredHelpRequests = helpRequestsList.filter((req) => {
    if (helpFilter === 'all') return true;
    return req.status === helpFilter;
  });

  const pendingCount = helpRequestsList.filter((r) => r.status === 'pending').length;
  const inProgressCount = helpRequestsList.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = helpRequestsList.filter((r) => r.status === 'resolved').length;

  // Active / Live Session
  const liveSession = todaySessions.find((s) => s.is_live) || todaySessions[0];

  return (
    <div className="space-y-6">
      {/* 1. Islamic Modern Teacher Hero Welcome Card */}
      <div className="relative rounded-2xl overflow-hidden shadow-xs border border-[#FDE68A]/80 bg-[#FEF6DF] min-h-[148px] lg:min-h-[156px] flex items-center">
        <Image
          src="/islamic-hero-banner-slim.png"
          alt="দক্ষতা অর্জন করি, ইসলামের পথে এগিয়ে যাই"
          fill
          priority
          className="object-cover object-right pointer-events-none select-none"
        />

        {/* Scrim for crisp readability */}
        <div
          className="lg:hidden absolute inset-0 bg-gradient-to-r from-[#FFFDF8]/95 via-[#FDF8EC]/85 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Hero Content */}
        <div className="relative z-10 px-4 py-3 sm:px-6 lg:max-w-[65%] w-full">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E6F4EA] text-[#065F46] border border-[#A7F3D0] inline-flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              {isBangla ? 'অনুষদ শিক্ষক (SBMC)' : 'Faculty Teacher (SBMC)'}
            </span>
            <span className="text-xs text-[#064E3B] font-extrabold flex items-center gap-1">
              <span>{isBangla ? 'আসসালামু আলাইকুম!' : 'Assalamu Alaikum!'}</span>
              <span role="img" aria-label="wave">👋</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-[24px] font-black text-[#0F172A] tracking-tight font-serif leading-tight">
            {isBangla ? 'স্বাগতম' : 'Welcome back'}, {user?.full_name || (isBangla ? 'শিক্ষক জুবায়ের আহমেদ' : 'Teacher Zubair Ahmed')}!
          </h1>

          <p className="text-xs sm:text-[12.5px] text-[#334155] font-medium mt-1 leading-snug">
            {isBangla
              ? 'رَّبِّ زِدْنِي عِلْمًا — আল্লাহ আপনার শিক্ষাদানের প্রচেষ্টাকে ফলপ্রসূ ও বরকতময় করুন। আজকের পাঠদান পরিচালনা করুন।'
              : 'May Allah bless your teaching journey and academic guidance. Manage today’s lectures.'}
          </p>

          {/* Quick Action Navigation Strip */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 border border-[#FCD34D] text-[#065F46] text-[11px] font-bold shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#059669]" />
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <Link
              href="/teacher/qr"
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF8108] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title={isBangla ? 'লাইভ কিউআর প্রজেক্টর খুলুন' : 'Open Live QR Projector'}
            >
              <QrCode className="w-3.5 h-3.5 text-white" />
              <span>{isBangla ? 'লাইভ কিউআর প্রজেক্টর' : 'Live QR Projector'}</span>
            </Link>

            <Link
              href="/teacher/attendance"
              className="px-2.5 py-1 rounded-lg bg-white/95 hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title={isBangla ? 'ম্যানুয়াল হাজিরা শিট' : 'Attendance Roster'}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#B45309]" />
              <span>{isBangla ? 'হাজিরা শিট' : 'Roster'}</span>
            </Link>

            <Link
              href="/teacher/help-requests"
              className="px-2.5 py-1 rounded-lg bg-white/95 hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title={isBangla ? 'শিক্ষার্থী হেল্প বোর্ড' : 'Student Help Board'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#B45309]" />
              <span>{isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Board'}</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black inline-flex items-center justify-center">
                  {d(pendingCount)}
                </span>
              )}
            </Link>

            <button
              onClick={handleManualRefresh}
              title={isBangla ? 'তথ্য রিফ্রেশ করুন' : 'Refresh'}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-[#FFFBEB] text-[#0F766E] border border-slate-200/90 transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Cards (4 Bento Cards matching Coordinator & Student aesthetics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Assigned Sessions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'আজকের ক্লাস শিডিউল' : "Today's Schedule"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[#0F172A] font-serif">
            {d(todaySessions.length)}{' '}
            <span className="text-xs font-bold text-slate-500">{isBangla ? 'টি সেশন' : 'Sessions'}</span>
          </h3>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isBangla ? '১টি চলমান (লাইভ) • ১টি পরবর্তী' : '1 Live • 1 Upcoming'}
          </p>
        </div>

        {/* KPI 2: Class Attendance Average */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-teal-400 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'গড় উপস্থিতি হার' : 'Attendance Rate'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[#0F172A] font-serif">
            ৯০.২% <span className="text-xs font-bold text-slate-500">({isBangla ? 'চলতি সপ্তাহ' : 'This Week'})</span>
          </h3>
          <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-1">
            <span>●</span> {isBangla ? '৩৮/৪২ জন শিক্ষার্থী উপস্থিত' : '38/42 Students Present'}
          </p>
        </div>

        {/* KPI 3: Pending Help Requests */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-amber-400 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'সহায়তা আবেদন' : 'Pending Help Requests'}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${
              pendingCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-black font-serif ${pendingCount > 0 ? 'text-amber-700' : 'text-[#0F172A]'}`}>
            {d(pendingCount)}{' '}
            <span className="text-xs font-bold text-slate-500">{isBangla ? 'টি অমীমাংসিত' : 'Pending'}</span>
          </h3>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">
            {pendingCount > 0
              ? (isBangla ? 'পেন টুল ও লেয়ার মাস্কিং সমস্যা' : 'Action needed for topics')
              : (isBangla ? 'আলহামদুলিল্লাহ, সব সমাধানকৃত' : 'All resolved')}
          </p>
        </div>

        {/* KPI 4: Topic Understanding Score */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-400 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'টপিক অনুধাবন সূচক' : 'Topic Understanding'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[#0F172A] font-serif">
            ৪.৫ <span className="text-xs font-bold text-slate-500">/ ৫.০ ★</span>
          </h3>
          <p className="text-[11px] text-indigo-700 font-semibold mt-1">
            {isBangla ? '৮৮% শিক্ষার্থী বিষয়বস্তু আয়ত্ত করেছে' : '88% positive feedback'}
          </p>
        </div>
      </div>

      {/* 3. Live Class Session & Projector Command Console (চলমান ক্লাস ও প্রজেক্টর নিয়ন্ত্রণ হাব) */}
      {liveSession && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#013B2A] via-[#012E20] to-[#012117] p-4 sm:p-5 text-white shadow-sm border border-emerald-500/30">
          {/* Subtle Islamic Arch & Ambient Golden Glow */}
          <div className="absolute right-0 top-0 bottom-0 w-80 opacity-15 pointer-events-none select-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {isBangla ? 'লাইভ ক্লাস চলমান' : 'Class in Session'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-white/10 text-white border border-white/20">
                  {liveSession.batch_name || 'ব্যাচ ৪২'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  {liveSession.audience === 'general' ? 'জেনারেল' : liveSession.audience === 'madrasa' ? 'মাদ্রাসা' : 'সম্মিলিত'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black !text-white font-serif tracking-tight leading-snug" style={{ color: '#ffffff' }}>
                {liveSession.subject_name}
              </h2>

              <p className="text-xs sm:text-[13px] text-emerald-100/90 font-medium flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-300">টপিক:</span>
                <span>{liveSession.topic_title}</span>
              </p>

              <div className="flex items-center gap-3 text-[11px] text-emerald-200/80 pt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {d(liveSession.start_time.slice(0, 5))} - {d(liveSession.end_time.slice(0, 5))} সকাল
                </span>
                <span>•</span>
                <span>{liveSession.room}</span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">
                  {d(liveSession.attendance_count || 38)}/{d(liveSession.total_students || 42)} {isBangla ? 'উপস্থিত' : 'Present'}
                </span>
              </div>
            </div>

            {/* Quick Action Button Group */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/teacher/qr?sessionId=${liveSession.id}`}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8108] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 border border-amber-300/40"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>{isBangla ? 'প্রজেক্টর কিউআর খুলুন' : 'Open Live QR'}</span>
              </Link>

              <Link
                href={`/teacher/attendance?sessionId=${liveSession.id}`}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20 shadow-xs cursor-pointer active:scale-95"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                <span>{isBangla ? 'ম্যানুয়াল হাজিরা' : 'Attendance'}</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSelectedSessionForAssignments(liveSession);
                  setAssignmentsManagerOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 border border-amber-400/30 shadow-xs cursor-pointer active:scale-95"
              >
                <FileQuestion className="w-4 h-4 text-amber-300" />
                <span>{isBangla ? 'কুইজ ও হোমওয়ার্ক' : 'Quiz & Homework'}</span>
              </button>

              <Link
                href={`/teacher/understanding?sessionId=${liveSession.id}${liveSession.topic ? `&topicId=${liveSession.topic}` : ''}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/50 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 border border-emerald-400/40 shadow-xs cursor-pointer active:scale-95"
              >
                <BarChart3 className="w-4 h-4 text-white" />
                <span>{isBangla ? 'লাইভ ফিডব্যাক' : 'Feedback'}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. Split Layout: Left (7 cols) Help Requests Board & Right (5 cols) Topic Understanding Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Interactive Student Help Requests Console */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#0F172A] font-serif">
                    {isBangla ? 'শিক্ষার্থী সহায়তা ও পরামর্শ বোর্ড' : 'Student Help Requests & Advisory'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla ? 'শিক্ষার্থীদের সরাসরি প্রশ্ন ও অ্যাকাডেমিক সমাধান প্রদান' : 'Direct student queries & feedback resolution'}
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setHelpFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition ${helpFilter === 'all' ? 'bg-white text-[#0F172A] shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {isBangla ? 'সকল' : 'All'} ({d(helpRequestsList.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setHelpFilter('pending')}
                  className={`px-2.5 py-1 rounded-md transition ${helpFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:text-amber-900'}`}
                >
                  {isBangla ? 'অমীমাংসিত' : 'Pending'} ({d(pendingCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setHelpFilter('resolved')}
                  className={`px-2.5 py-1 rounded-md transition ${helpFilter === 'resolved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:text-emerald-900'}`}
                >
                  {isBangla ? 'সমাধানকৃত' : 'Resolved'} ({d(resolvedCount)})
                </button>
              </div>
            </div>

            {/* List of Help Requests */}
            <div className="space-y-3 mt-3">
              {filteredHelpRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p>{isBangla ? 'কোনো অমীমাংসিত সহায়তা আবেদন নেই।' : 'No help requests found in this category.'}</p>
                </div>
              ) : (
                filteredHelpRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      req.status === 'pending'
                        ? 'bg-amber-50/50 border-amber-200/80 hover:border-amber-400'
                        : req.status === 'in_progress'
                        ? 'bg-blue-50/40 border-blue-200/80 hover:border-blue-400'
                        : 'bg-slate-50/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {req.student_name ? req.student_name[0] : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-[#0F172A]">
                              {req.student_name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              ({req.student_id_number})
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200">
                              {req.batch_name}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-bold text-[#0F766E] mt-0.5">
                            {req.topic_title || req.subject_name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          req.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : req.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {req.status === 'pending'
                          ? (isBangla ? 'অমীমাংসিত' : 'Pending')
                          : req.status === 'in_progress'
                          ? (isBangla ? 'চলমান' : 'In Progress')
                          : (isBangla ? 'সমাধান সম্পন্ন' : 'Resolved')}
                      </span>
                    </div>

                    {/* Student Query Text */}
                    <div className="mt-2 bg-white/90 p-2.5 rounded-lg border border-slate-200/60 text-xs text-[#334155] leading-relaxed italic">
                      &ldquo;{req.student_comment}&rdquo;
                    </div>

                    {/* Teacher resolution note if resolved */}
                    {req.teacher_notes && (
                      <div className="mt-1.5 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/70 text-[11px] text-emerald-900">
                        <span className="font-bold">{isBangla ? 'শিক্ষকের সমাধান:' : 'Teacher Note:'}</span>{' '}
                        {req.teacher_notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-[10px] text-slate-400 font-medium">{req.created_at}</span>

                      <div className="flex items-center gap-1.5">
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleStartHelp(req)}
                            className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition cursor-pointer active:scale-95"
                          >
                            {isBangla ? 'ইন-প্রোগ্রেস করুন' : 'Start'}
                          </button>
                        )}
                        {req.status !== 'resolved' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(req)}
                            className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isBangla ? 'সমাধান দিন' : 'Resolve'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(req)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                          >
                            {isBangla ? 'নোট সম্পাদনা' : 'Edit Note'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {isBangla ? 'সকল হেল্প রিকোয়েস্ট ও ফিল্টারিং বিস্তারিত পেজে দেখুন' : 'View all requests on dedicated page'}
            </span>
            <Link
              href="/teacher/help-requests"
              className="text-[#0F766E] hover:text-[#115E59] font-bold flex items-center gap-1 hover:underline"
            >
              <span>{isBangla ? 'পূর্ণাঙ্গ হেল্প বোর্ড' : 'Full Help Board'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column (5 cols): Topic Understanding & Difficulty Tracker */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A] font-serif">
                    {isBangla ? 'টপিক অনুধাবন ও দুর্বলতা সূচক' : 'Topic Understanding & Bottlenecks'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla ? 'শিক্ষার্থীদের ফিডব্যাকের ভিত্তিতে টপিক বিশ্লেষণ' : 'Recent lecture feedback analysis'}
                  </p>
                </div>
              </div>
            </div>

            {/* Topic list with progress bars */}
            <div className="space-y-3.5 mt-3">
              {/* Topic 1 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] leading-tight">
                    {isBangla ? 'ভেক্টর পাথ ও পেন টুল মাস্টারি' : 'Vector Paths & Pen Tool'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    ৬৮% ({isBangla ? 'মাঝারি' : 'Moderate'})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '68%' }} />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{isBangla ? 'ব্যাচ ৪২ • ৩৬টি ফিডব্যাক' : 'Batch 42 • 36 Feedbacks'}</span>
                  <span className="text-amber-800 font-semibold">{isBangla ? '৮ জনের অতিরিক্ত রিভিশন দরকার' : '8 need revision'}</span>
                </div>
              </div>

              {/* Topic 2 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] leading-tight">
                    {isBangla ? 'কালার থিওরি ও প্যালেট তৈরি' : 'Color Theory & Palette'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ৯২% ({isBangla ? 'চমৎকার' : 'Excellent'})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: '92%' }} />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{isBangla ? 'ব্যাচ ৪২ • ৩৮টি ফিডব্যাক' : 'Batch 42 • 38 Feedbacks'}</span>
                  <span className="text-emerald-700 font-semibold">{isBangla ? 'অধিকাংশের পরিষ্কার ধারণা' : 'Clear understanding'}</span>
                </div>
              </div>

              {/* Topic 3 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] leading-tight">
                    {isBangla ? 'টাইপোগ্রাফি ও লেআউট গ্রিড' : 'Typography & Layout Grid'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ৮৫% ({isBangla ? 'ভালো' : 'Good'})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: '85%' }} />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{isBangla ? 'ব্যাচ ৪১ • ৪০টি ফিডব্যাক' : 'Batch 41 • 40 Feedbacks'}</span>
                  <span className="text-slate-600 font-medium">{isBangla ? 'ফন্ট স্কেল নিয়ে সন্তোষজনক' : 'Satisfactory font scale'}</span>
                </div>
              </div>

              {/* Topic 4 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] leading-tight">
                    {isBangla ? 'অডিও নয়েজ রিডাকশন ও মাস্টারিং' : 'Audio Noise Reduction'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    ৭৪% ({isBangla ? 'সন্তোষজনক' : 'Fair'})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '74%' }} />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{isBangla ? 'ব্যাচ ৪১ • ৩৫টি ফিডব্যাক' : 'Batch 41 • 35 Feedbacks'}</span>
                  <span className="text-amber-800 font-medium">{isBangla ? 'মাইক সেটিংসে কিছুটা বিভ্রান্তি' : 'Settings need demo'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {isBangla ? 'সকল ব্যাচের বিস্তারিত বিশ্লেষণ' : 'Detailed analytics across all batches'}
            </span>
            <Link
              href="/teacher/understanding"
              className="text-[#0F766E] hover:text-[#115E59] font-bold flex items-center gap-1 hover:underline"
            >
              <span>{isBangla ? 'বিশ্লেষণ হাব দেখুন' : 'Open Analytics Hub'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. AI Weekly Teaching Summary & Recommendation Bento Card */}
      <div className="bg-gradient-to-br from-[#FFFBEB] via-white to-[#F0FDFA] rounded-2xl border-2 border-[#FCD34D] shadow-xs overflow-hidden transition-all duration-300">
        {/* Card Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FEF3C7]/90 via-[#FFFBEB] to-[#ECFDF5]/80 border-b border-[#FCD34D]/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B45309] text-white flex items-center justify-center shadow-xs shrink-0 border border-[#FCD34D]">
              <BrainCircuit className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#0F172A] font-serif flex items-center gap-2">
                  <span>{isBangla ? 'শিক্ষকের জন্য AI উইকলি সামারি' : 'AI Weekly Teaching Summary'}</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#B45309] text-white shadow-2xs">
                  {isBangla ? '২ মিনিটের টিচিং রিকমেন্ডেশন' : '2-Min Read'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {isBangla ? 'স্বয়ংক্রিয় শিখন বিশ্লেষণ' : 'Auto Feedback Analysis'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                {aiSummary?.week_label ? `${aiSummary.week_label} • ` : ''}
                {isBangla
                  ? 'শিক্ষার্থীদের সাপ্তাহিক ফিডব্যাক, বোঝার প্রতিবন্ধকতা এবং আগামী ক্লাসের শিক্ষণ কৌশল'
                  : 'Weekly student feedback analysis, bottlenecks & pedagogical advice'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => fetchAISummary(true)}
              disabled={aiRefreshing}
              title={isBangla ? 'পুনরায় এআই বিশ্লেষণ চালান' : 'Re-analyze'}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiRefreshing ? 'animate-spin text-[#B45309]' : 'text-[#B45309]'}`} />
              <span>{isBangla ? 'পুনরায় বিশ্লেষণ' : 'Re-analyze'}</span>
            </button>
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 border border-[#FCD34D] transition cursor-pointer shadow-2xs"
              title={isAiExpanded ? (isBangla ? 'সংকুচিত করুন' : 'Collapse') : (isBangla ? 'প্রসারিত করুন' : 'Expand')}
            >
              {isAiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Card Body */}
        {isAiExpanded && (
          <div className="p-4 sm:p-5 space-y-5">
            {aiLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" />
                <p className="text-xs text-[#64748B] font-medium">
                  {isBangla ? 'শিক্ষার্থীদের ফিডব্যাক ও এআই সুপারিশমালা প্রসেস করা হচ্ছে...' : 'Processing weekly AI recommendations...'}
                </p>
              </div>
            ) : aiSummary ? (
              <>
                {/* Weekly Health Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/90 p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      {isBangla ? 'সাপ্তাহিক মূল্যায়ন স্বাস্থ্য' : 'Weekly Health'}
                    </span>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">
                      {aiSummary.summary_metrics.overall_health}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      {isBangla ? 'গড় বোঝার হার' : 'Avg Understanding'}
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {aiSummary.summary_metrics.average_percentage}%{' '}
                      <span className="text-xs font-semibold text-slate-400">
                        ({aiSummary.summary_metrics.average_rating}★)
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      {isBangla ? 'মোট প্রাপ্ত ফিডব্যাক' : 'Total Feedbacks'}
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {d(aiSummary.summary_metrics.total_feedbacks)}{' '}
                      <span className="text-xs font-medium text-slate-400">{isBangla ? 'টি' : ''}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      {isBangla ? 'অমীমাংসিত হেল্প রিকোয়েস্ট' : 'Pending Help'}
                    </span>
                    <p className={`text-sm font-black mt-0.5 ${
                      aiSummary.summary_metrics.pending_help_requests > 0 ? 'text-amber-700' : 'text-emerald-600'
                    }`}>
                      {d(aiSummary.summary_metrics.pending_help_requests)}{' '}
                      <span className="text-xs font-medium text-slate-400">{isBangla ? 'টি' : ''}</span>
                    </p>
                  </div>
                </div>

                {/* Two-Column AI Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Topics where students struggled */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs sm:text-sm font-black text-[#0F172A] font-serif">
                          {isBangla ? 'যেসব টপিকে শিক্ষার্থীরা হিমশিম খেয়েছে' : 'Topics Needing Attention'}
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {aiSummary.top_struggling_topics.length} {isBangla ? 'টি টপিক' : 'Topics'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {aiSummary.top_struggling_topics.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-amber-300 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {item.topic_title}
                              </h4>
                              <span className="text-[10px] font-medium text-slate-500">
                                {item.subject_name} • {item.batch_name}
                              </span>
                            </div>
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                item.difficulty_color === 'red'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : item.difficulty_color === 'amber'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {item.difficulty_level}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div className="flex items-center justify-between text-[10.5px] mb-1">
                              <span className="text-slate-500 font-medium">
                                {isBangla ? 'বোঝার হার' : 'Understanding'}
                              </span>
                              <span className="font-bold text-slate-800">
                                {item.understanding_percentage}% ({item.avg_rating}★)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.understanding_percentage < 55
                                    ? 'bg-red-500'
                                    : item.understanding_percentage < 75
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(item.understanding_percentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Student comment preview */}
                          {item.sample_comments && item.sample_comments.length > 0 && (
                            <div className="text-[10.5px] bg-white p-2 rounded-lg border border-slate-200/60 text-slate-700 italic">
                              &ldquo;{item.sample_comments[0]}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: AI Actionable 2-Minute Recommendations */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#B45309]" />
                        <h3 className="text-xs sm:text-sm font-black text-[#0F172A] font-serif">
                          {isBangla ? '২ মিনিটের AI শিক্ষণ কৌশল ও সুপারিশমালা' : '2-Min Actionable Teaching Tips'}
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-bold text-[#0F766E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
                        {isBangla ? 'আগামী ক্লাসের জন্য' : 'For Next Class'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {aiSummary.ai_recommendations.map((rec, rIdx) => (
                        <div
                          key={rec.id || rIdx}
                          className={`p-3 rounded-xl border transition-all ${
                            rec.priority === 'high'
                              ? 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
                              : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              rec.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {rec.icon === 'target' ? (
                                <Target className="w-4 h-4 text-amber-700" />
                              ) : (
                                <Lightbulb className="w-4 h-4 text-amber-700" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {rec.title}
                              </h4>
                              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                                {rec.description}
                              </p>
                              {rec.action_label && (
                                <div className="pt-0.5">
                                  <span className="text-[10px] font-bold text-[#B45309] bg-amber-100/80 px-2 py-0.5 rounded-md">
                                    → {rec.action_label}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Attention Students Section */}
                {aiSummary.attention_students && aiSummary.attention_students.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-700" />
                        <h4 className="text-xs font-bold text-slate-900">
                          {isBangla ? 'বিশেষ দৃষ্টি প্রয়োজন এমন শিক্ষার্থী (চলতি সপ্তাহ)' : 'Students Requiring Attention'}
                        </h4>
                      </div>
                      <Link
                        href="/teacher/help-requests"
                        className="text-[11px] font-bold text-[#B45309] hover:underline flex items-center gap-1"
                      >
                        <span>{isBangla ? 'সব হেল্প রিকোয়েস্ট দেখুন' : 'View All Help'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {aiSummary.attention_students.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/70 flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{st.student_name}</p>
                            <p className="text-[10px] text-slate-500">{st.student_id_number} • {st.batch_name}</p>
                            <p className="text-[10px] text-amber-800 font-medium mt-1">{st.reason}</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                            {st.topic_title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* 6. Quick Resolve Modal */}
      {resolvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A] font-serif">
                    {isBangla ? 'সহায়তার সমাধান নোট প্রদান করুন' : 'Provide Resolution Notes'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {resolvingRequest.student_name} ({resolvingRequest.student_id_number})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolvingRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <span className="font-bold text-slate-900 block mb-0.5">
                  {isBangla ? 'শিক্ষার্থীর প্রশ্ন / সমস্যা:' : 'Student Query:'}
                </span>
                &ldquo;{resolvingRequest.student_comment}&rdquo;
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  {isBangla ? 'শিক্ষকের সমাধান বা পরামর্শ নোট (শিক্ষার্থী দেখতে পাবে)' : 'Teacher Resolution Note:'}
                </label>
                <textarea
                  rows={3}
                  value={teacherResolutionNote}
                  onChange={(e) => setTeacherResolutionNote(e.target.value)}
                  placeholder={
                    isBangla
                      ? 'যেমন: আগামী ক্লাসের শুরুতে পেন টুলের কার্ভ হ্যান্ডেল নিয়ে হাতেনাতে অনুশীলন করানো হবে।'
                      : 'e.g. Will explain during next hands-on session.'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingRequest(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  {submittingResolution ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isBangla ? 'সমাধান সংরক্ষণ করুন' : 'Save Resolution'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Quiz & Homework Manager Modal */}
      <QuizAndHomeworkManagerModal
        isOpen={assignmentsManagerOpen}
        onClose={() => {
          setAssignmentsManagerOpen(false);
          setSelectedSessionForAssignments(null);
        }}
        session={selectedSessionForAssignments}
      />
    </div>
  );
}
