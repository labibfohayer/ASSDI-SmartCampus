'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  TrendingDown,
  BrainCircuit,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function TeacherOverviewPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const [todaySessions, setTodaySessions] = useState<ClassSessionItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<HelpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // AI Weekly Teaching Summary State
  const [aiSummary, setAiSummary] = useState<TeacherAISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(true);

  const fetchAISummary = async (isManual = false) => {
    if (isManual) setAiRefreshing(true);
    else setAiLoading(true);

    try {
      const res = await api.get('/api/v1/reports/teacher-ai-weekly-summary/');
      if (res.data?.success && res.data?.data) {
        setAiSummary(res.data.data);
      } else if (res.data?.data) {
        setAiSummary(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load AI Weekly Teaching Summary:', err);
    } finally {
      setAiLoading(false);
      setAiRefreshing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Today's Sessions for Teacher
      const sessionsRes = await api.get('/api/v1/class-sessions/today/');
      if (Array.isArray(sessionsRes.data)) {
        setTodaySessions(sessionsRes.data);
      } else if (sessionsRes.data?.results) {
        setTodaySessions(sessionsRes.data.results);
      } else if (sessionsRes.data?.data) {
        setTodaySessions(sessionsRes.data.data);
      }

      // 2. Fetch Pending Help Requests
      const helpRes = await api.get('/api/v1/help-requests/?status=pending');
      if (Array.isArray(helpRes.data)) {
        setPendingRequests(helpRes.data);
      } else if (helpRes.data?.results) {
        setPendingRequests(helpRes.data.results);
      } else if (helpRes.data?.data) {
        setPendingRequests(helpRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
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
    toast.success(isBangla ? 'ড্যাশবোর্ড ও এআই সামারি রিফ্রেশ করা হয়েছে' : 'Dashboard & AI summary refreshed');
  };

  // Format today's date safely on client mount
  const [todayFormatted, setTodayFormatted] = useState('');
  useEffect(() => {
    setTodayFormatted(
      new Intl.DateTimeFormat(isBangla ? 'bn-BD' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Dhaka',
      }).format(new Date())
    );
  }, [isBangla]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Bar (Madrasat-us-Sunnah Warm Banner Architecture) */}
      <div className="bg-[#FFFBEB] rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] shadow-sm p-6 sm:p-7 text-[#0F172A] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#CCFBF1] rounded-full text-xs font-semibold text-[#0F766E] mb-2.5">
              <BookOpen className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{t('brand.course')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F172A]">
              {isBangla ? 'আস-সালামু আলাইকুম,' : 'Welcome,'}{' '}
              {user?.full_name || user?.login_id}
            </h1>
            <p className="text-[#64748B] text-sm mt-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>{todayFormatted} (ঢাকা সময়)</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2.5 bg-white hover:bg-[#F0FDFA] text-[#0F766E] rounded-xl text-xs font-semibold border border-[#CCFBF1] flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0F766E]' : 'text-[#0F766E]'}`} />
              <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            <Link
              href="/teacher/qr"
              className="px-4 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 border border-[#FCD34D]"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>{isBangla ? 'লাইভ কিউআর খুলুন' : 'Open Live QR'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#0D9488]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'আজকের ক্লাস' : "Today's Schedule"}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(todaySessions.length)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'টি সেশন' : 'Sessions'}</span>
          </h3>
          <p className="text-[11px] text-[#0F766E] font-semibold mt-1 flex items-center gap-1">
            <span>●</span> {isBangla ? 'রুটিন অনুযায়ী নির্ধারিত' : 'As per timetable'}
          </p>
        </div>

        {/* Pending Help Requests */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Pending Help'}
            </span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${
              pendingRequests.length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-[#F0FDFA] text-[#0369A1] border-[#CCFBF1]'
            }`}>
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-extrabold font-heading ${pendingRequests.length > 0 ? 'text-amber-700' : 'text-[#0F172A]'}`}>
            {d(pendingRequests.length)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'টি অমীমাংসিত' : 'Pending'}</span>
          </h3>
          <p className="text-[11px] text-[#475569] font-medium mt-1">
            {pendingRequests.length > 0 ? (isBangla ? 'দ্রুত সমাধান প্রয়োজন' : 'Action needed') : (isBangla ? 'সবকিছু আপ-টু-ডেট' : 'All resolved')}
          </p>
        </div>

        {/* Live QR Status */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#016C90]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'কিউআর রোটেশন' : 'QR Token Engine'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#016C90] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-[#0F172A] font-heading">
            {isBangla ? '৪৫ সেকেন্ডে অটো-রিফ্রেশ' : '45s Auto-Rotation'}
          </h3>
          <p className="text-[11px] text-[#016C90] font-semibold mt-1">
            {isBangla ? 'জাল হাজিরা প্রতিরোধী টোকেন' : 'Anti-Proxy Protected'}
          </p>
        </div>

        {/* 48h Correction Window */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#0D9488]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'কারেকশন উইন্ডো' : 'Correction Rule'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-[#0F172A] font-heading">
            {isBangla ? '৪৮ ঘণ্টা নির্ধারিত সীমা' : '48 Hours Limit'}
          </h3>
          <p className="text-[11px] text-[#0F766E] font-semibold mt-1">
            {isBangla ? 'ক্লাস শেষ হওয়ার পর থেকে' : 'Post-session deadline'}
          </p>
        </div>
      </div>

      {/* AI Weekly Teaching Summary & Recommendation Bento Card */}
      <div className="bg-gradient-to-br from-[#FFFBEB] via-white to-[#F0FDFA] rounded-2xl border-2 border-[#FCD34D] shadow-sm overflow-hidden transition-all duration-300">
        {/* Card Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FEF3C7]/80 via-[#FFFBEB] to-[#ECFDF5]/70 border-b border-[#FCD34D]/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#B45309] text-white flex items-center justify-center shadow-md shrink-0 border border-[#FCD34D]">
              <BrainCircuit className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#0F172A] font-heading flex items-center gap-2">
                  <span>{isBangla ? 'শিক্ষকের জন্য AI উইকলি সামারি' : 'AI Weekly Teaching Summary'}</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B45309] text-white shadow-xs">
                  {isBangla ? '২ মিনিটের টিচিং রিকমেন্ডেশন' : '2-Min Read'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {isBangla ? 'প্রতি বৃহস্পতিবার স্বয়ংক্রিয় বিশ্লেষণ' : 'Thursday Weekly Auto-Analysis'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
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
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiRefreshing ? 'animate-spin text-[#B45309]' : 'text-[#B45309]'}`} />
              <span>{isBangla ? 'পুনরায় বিশ্লেষণ' : 'Re-analyze'}</span>
            </button>
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 border border-[#FCD34D] transition cursor-pointer shadow-xs"
              title={isAiExpanded ? (isBangla ? 'সংকুচিত করুন' : 'Collapse') : (isBangla ? 'প্রসারিত করুন' : 'Expand')}
            >
              {isAiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Card Body */}
        {isAiExpanded && (
          <div className="p-5 sm:p-6 space-y-6">
            {aiLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" />
                <p className="text-xs text-[#64748B] font-medium">
                  {isBangla ? 'শিক্ষার্থীদের ফিডব্যাক ও এআই সুপারিশমালা প্রসেস করা হচ্ছে...' : 'Processing weekly AI teaching recommendations...'}
                </p>
              </div>
            ) : aiSummary ? (
              <>
                {/* 1. Quick Weekly Health Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
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

                {/* 2. Main Two-Column Core Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left Column: Topics where students struggled */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-black text-[#0F172A] font-heading">
                          {isBangla ? 'যেসব টপিকে শিক্ষার্থীরা হিমশিম খেয়েছে' : 'Topics Needing Attention'}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {aiSummary.top_struggling_topics.length} {isBangla ? 'টি টপিক' : 'Topics'}
                      </span>
                    </div>

                    {aiSummary.top_struggling_topics.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 font-medium">
                        {isBangla
                          ? 'আলহামদুলিল্লাহ, এই সপ্তাহে কোনো টপিকে জটিলতা বা অস্বাভাবিক কম রেটিং লক্ষ্য করা যায়নি।'
                          : 'No critical topic bottlenecks reported this week.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiSummary.top_struggling_topics.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-amber-300 transition-colors space-y-2"
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
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
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
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-slate-500 font-medium">
                                  {isBangla ? 'বোঝার হার' : 'Understanding'}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {item.understanding_percentage}% ({item.avg_rating}★)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
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

                            {/* Details footer */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                              <span>
                                {isBangla ? 'ফিডব্যাক সংখ্যা:' : 'Feedbacks:'} {d(item.feedbacks_count)}
                              </span>
                              {item.help_requests_count > 0 && (
                                <span className="text-amber-800 font-bold flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3 text-amber-600" />
                                  {d(item.help_requests_count)} {isBangla ? 'জন সরাসরি সাহায্য চেয়েছে' : 'requested help'}
                                </span>
                              )}
                            </div>

                            {/* Student comment preview if available */}
                            {item.sample_comments && item.sample_comments.length > 0 && (
                              <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-200/60 text-slate-700 italic">
                                &ldquo;{item.sample_comments[0]}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: AI Actionable 2-Minute Recommendations */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#B45309]" />
                        <h3 className="text-sm font-black text-[#0F172A] font-heading">
                          {isBangla ? '২ মিনিটের AI শিক্ষণ কৌশল ও সুপারিশমালা' : '2-Min Actionable Teaching Tips'}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-[#0F766E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
                        {isBangla ? 'আগামী ক্লাসের জন্য' : 'For Next Class'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {aiSummary.ai_recommendations.map((rec, rIdx) => (
                        <div
                          key={rec.id || rIdx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            rec.priority === 'high'
                              ? 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
                              : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              rec.priority === 'high'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200/80 text-slate-700'
                            }`}>
                              {rec.icon === 'target' ? (
                                <Target className="w-4 h-4 text-amber-700" />
                              ) : rec.icon === 'help-circle' ? (
                                <HelpCircle className="w-4 h-4 text-amber-700" />
                              ) : rec.icon === 'check-circle' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                                <div className="pt-1">
                                  <span className="text-[10px] font-bold text-[#B45309] bg-amber-100/70 px-2 py-0.5 rounded-md">
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

                {/* 3. Attention Students Section (if any) */}
                {aiSummary.attention_students && aiSummary.attention_students.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between mb-2.5">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {aiSummary.attention_students.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/70 flex items-start justify-between gap-2 text-xs"
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

      {/* Main Grid: Today's Classes & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0F766E]" />
              <h2 className="text-lg font-bold text-[#0F172A] font-heading">
                {isBangla ? 'আজকের ক্লাস শিডিউল' : "Today's Class Schedule"}
              </h2>
            </div>
            <span className="text-xs text-[#0F766E] font-semibold px-2.5 py-1 bg-[#F0FDFA] rounded-full border border-[#FCD34D]">
              {d(todaySessions.length)} {isBangla ? 'টি ক্লাস পাওয়া গেছে' : 'Sessions Found'}
            </span>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
              <p className="text-xs text-[#475569]">{t('common.loading')}</p>
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] text-center space-y-3">
              <div className="w-12 h-12 bg-[#F0FDFA] rounded-full flex items-center justify-center mx-auto text-[#0F766E]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] font-heading">
                {isBangla ? 'আজকে আপনার কোনো নির্ধারিত ক্লাস নেই' : 'No Scheduled Classes Today'}
              </h3>
              <p className="text-xs text-[#475569] max-w-sm mx-auto">
                {isBangla
                  ? 'আপনার নির্ধারিত অন্য দিনের সেশন এবং হাজিরা তালিকা দেখতে নিচে ক্লিক করুন।'
                  : 'Check your other sessions or upcoming timetable from the attendance sheet.'}
              </p>
              <div className="pt-2">
                <Link
                  href="/teacher/attendance"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] text-xs font-semibold rounded-lg transition"
                >
                  <span>{isBangla ? 'হাজিরা শীট খুলুন' : 'Open Attendance Sheet'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-5 rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#0F766E] hover:shadow-md transition-all duration-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-[#0F172A] font-heading">
                          {session.subject_name || `Subject #${session.subject}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.audience === 'general'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : session.audience === 'madrasa'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]'
                        }`}>
                          {session.audience === 'general' ? 'General' : session.audience === 'madrasa' ? 'Madrasa' : 'Combined (All)'}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1 font-medium">
                        {session.topic_title || (isBangla ? 'টপিক নির্ধারিত হয়নি' : 'No Topic Assigned')}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0369A1] bg-[#F0FDFA] border border-[#CCFBF1] px-3 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>
                          {d(session.start_time.slice(0, 5))} - {d(session.end_time.slice(0, 5))}
                        </span>
                      </div>
                      {session.room && (
                        <p className="text-[11px] text-[#475569] mt-0.5">
                          {session.room}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this session */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link
                      href={`/teacher/qr?sessionId=${session.id}`}
                      className="px-3.5 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 border border-[#FCD34D]"
                    >
                      <QrCode className="w-3.5 h-3.5 text-white" />
                      <span>{isBangla ? 'লাইভ কিউআর প্রজেক্টর' : 'Live QR Projector'}</span>
                    </Link>

                    <Link
                      href={`/teacher/attendance?sessionId=${session.id}`}
                      className="px-3.5 py-2 bg-white hover:bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>{isBangla ? 'ম্যানুয়াল হাজিরা ও কারেকশন' : 'Manual Attendance'}</span>
                    </Link>

                    <Link
                      href={`/teacher/understanding?sessionId=${session.id}${session.topic ? `&topicId=${session.topic}` : ''}`}
                      className="px-3.5 py-2 bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ml-auto cursor-pointer active:scale-95"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>{isBangla ? 'ফিডব্যাক ও বোঝাপড়া' : 'Feedback & Understanding'}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Pending Help Requests Quick Board */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-[#0F172A] font-heading">
                {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}
              </h2>
            </div>
            <Link
              href="/teacher/help-requests"
              className="text-xs text-[#0F766E] hover:text-[#115E59] font-semibold flex items-center gap-1"
            >
              <span>{isBangla ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 bg-[#FFFBEB] text-[#0F766E] rounded-full flex items-center justify-center mx-auto border border-[#FCD34D]">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#0F172A] font-heading">
                  {isBangla ? 'কোনো অমীমাংসিত হেল্প রিকোয়েস্ট নেই' : 'No Pending Help Requests'}
                </p>
                <p className="text-[11px] text-[#475569] max-w-xs mx-auto">
                  {isBangla
                    ? 'শিক্ষার্থীদের কোনো সমস্যা বা প্রশ্ন জমা হলে এখানে দেখা যাবে।'
                    : 'New questions or requests from students will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-1.5 hover:bg-amber-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {req.student_name || req.student_id_number || `Student #${req.student}`}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full">
                        {isBangla ? 'অমীমাংসিত' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-[#334155] line-clamp-2 italic">
                      "{req.student_comment}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#475569] pt-1">
                      <span>{req.topic_title || req.subject_name || 'SBMC'}</span>
                      <Link
                        href={`/teacher/help-requests?highlight=${req.id}`}
                        className="text-[#0F766E] font-bold hover:underline"
                      >
                        {isBangla ? 'সমাধান দিন' : 'Resolve'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
