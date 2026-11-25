'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  BarChart2,
  PieChart,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ExternalLink,
  Clock,
  AlertCircle,
  Eye,
  Zap,
  UserPlus,
  Download,
  Settings,
  ChevronRight,
  ChevronDown,
  CreditCard,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const [stats, setStats] = useState({
    totalStudents: 67,
    totalBatches: 3,
    totalTeachers: 0,
    totalCourses: 9,
    totalSessions: 20,
  });
  const [repeatedAbsences, setRepeatedAbsences] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const [dashRes, sessionsRes, coursesRes, batchesRes] = await Promise.all([
          api.get('/api/v1/analytics/coordinator-dashboard/').catch(() => ({ data: {} })),
          api.get('/api/v1/class-sessions/').catch(() => ({ data: [] })),
          api.get('/api/v1/courses/').catch(() => ({ data: [] })),
          api.get('/api/v1/batches/').catch(() => ({ data: [] })),
        ]);

        const dashData = dashRes.data?.data || dashRes.data || {};
        const sessionsList = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : sessionsRes.data?.results || [];
        const coursesList = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data?.results || [];
        const batchesList = Array.isArray(batchesRes.data)
          ? batchesRes.data
          : batchesRes.data?.results || [];

        setStats({
          totalStudents: dashData.total_students || 67,
          totalBatches: dashData.total_active_batches || batchesList.length || 3,
          totalTeachers: dashData.total_teachers || 0,
          totalCourses: coursesList.length || 9,
          totalSessions: sessionsList.length || 20,
        });
        setRepeatedAbsences(dashData.repeated_absences_list || []);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  // Recent Reports dataset matching reference mockup
  const recentReports = [
    {
      name: isBangla ? 'দৈনিক উপস্থিতি রিপোর্ট' : 'Daily Attendance Report',
      type: isBangla ? 'উপস্থিতি' : 'Attendance',
      typeColor: 'bg-blue-50 text-blue-600 border-blue-200',
      date: isBangla ? '২৪ নভে, ২০২৬' : 'Nov 24, 2026',
      status: isBangla ? 'প্রস্তুত' : 'Ready',
      link: '/reports?tab=daily-attendance',
    },
    {
      name: isBangla ? 'শিক্ষার্থীর পারফরম্যান্স রিপোর্ট' : 'Student Performance Report',
      type: isBangla ? 'পারফরম্যান্স' : 'Performance',
      typeColor: 'bg-purple-50 text-purple-600 border-purple-200',
      date: isBangla ? '২৩ নভে, ২০২৬' : 'Nov 23, 2026',
      status: isBangla ? 'প্রস্তুত' : 'Ready',
      link: '/reports?tab=monthly-student-performance',
    },
    {
      name: isBangla ? 'ব্যাচভিত্তিক ফলাফল রিপোর্ট' : 'Batch-wise Report',
      type: isBangla ? 'ব্যাচ' : 'Batch',
      typeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      date: isBangla ? '২১ নভে, ২০২৬' : 'Nov 21, 2026',
      status: isBangla ? 'প্রস্তুত' : 'Ready',
      link: '/reports?tab=batch-wise-performance',
    },
    {
      name: isBangla ? 'ফি আদায় ও কালেকশন রিপোর্ট' : 'Fee Collection Report',
      type: isBangla ? 'ফি' : 'Fee',
      typeColor: 'bg-amber-50 text-amber-600 border-amber-200',
      date: isBangla ? '২১ নভে, ২০২৬' : 'Nov 21, 2026',
      status: isBangla ? 'প্রস্তুত' : 'Ready',
      link: '/reports',
    },
    {
      name: isBangla ? 'কোর্স প্রগ্রেস রিপোর্ট' : 'Course Progress Report',
      type: isBangla ? 'কোর্স' : 'Course',
      typeColor: 'bg-teal-50 text-teal-600 border-teal-200',
      date: isBangla ? '২০ নভে, ২০২৬' : 'Nov 20, 2026',
      status: isBangla ? 'প্রস্তুত' : 'Ready',
      link: '/reports?tab=weekly-progress',
    },
  ];

  // Upcoming classes matching reference mockup
  const upcomingClasses = [
    {
      title: isBangla ? 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস' : 'Graphic Design & Brand Assets',
      instructor: isBangla ? 'জুবায়ের আহমেদ' : 'Zubair Ahmed',
      dateBadge: isBangla ? 'নভে ২৫' : 'Nov 25',
      time: isBangla ? '২৫ নভে, ২০২৬ • ০৯:০০ - ১০:০০ সকাল' : 'Nov 25, 2026 • 09:00 - 10:00 AM',
      joinHref: '/admin/sessions',
    },
    {
      title: isBangla ? 'ইসলামিক বেসিকস (মাদরাসা)' : 'Islamic Basics (Madrasa)',
      instructor: isBangla ? 'কাওসার হোসেন' : 'Kawsar Hossain',
      dateBadge: isBangla ? 'নভে ২৫' : 'Nov 25',
      time: isBangla ? '২৫ নভে, ২০২৬ • ১০:৩০ - ১১:৩০ সকাল' : 'Nov 25, 2026 • 10:30 - 11:30 AM',
      joinHref: '/admin/sessions',
    },
    {
      title: isBangla ? 'ডিজিটাল ভিডিও এডিটিং ও রিলস' : 'Digital Video Editing & Reels',
      instructor: isBangla ? 'কাওসার হোসেন' : 'Kawsar Hossain',
      dateBadge: isBangla ? 'নভে ২৫' : 'Nov 25',
      time: isBangla ? '২৫ নভে, ২০২৬ • ০১:০০ - ০২:০০ দুপুর' : 'Nov 25, 2026 • 01:00 - 02:00 PM',
      joinHref: '/admin/sessions',
    },
  ];

  // Recent activity stream matching reference mockup
  const recentActivities = [
    {
      title: isBangla ? 'নতুন উপস্থিতি চিহ্নিত: ব্যাচ এ' : 'New attendance marked: Batch A',
      time: isBangla ? '২ মিনিট আগে' : '2 minutes ago',
      icon: FileText,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: isBangla ? 'শিক্ষার্থী নিবন্ধিত: আহমেদ আলী' : 'Student registered: Ahmed Ali',
      time: isBangla ? '১৫ মিনিট আগে' : '15 minutes ago',
      icon: UserCheck,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      title: isBangla ? 'ফি পরিশোধ গ্রহণ: রহিমা বেগম' : 'Fee payment received from Rahima Begum',
      time: isBangla ? '১ ঘণ্টা আগে' : '1 hour ago',
      icon: CreditCard,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: isBangla ? 'নতুন কোর্স যুক্ত: গ্রাফিক ডিজাইন' : 'New course added: Graphic Design',
      time: isBangla ? '২ ঘণ্টা আগে' : '2 hours ago',
      icon: BookOpen,
      iconBg: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. SLIM ISLAMIC MODERN HERO WELCOME CARD */}
      <div className="relative rounded-2xl overflow-hidden shadow-xs border border-[#FDE68A]/70 bg-[#FEF6DF] min-h-[138px] lg:min-h-[146px] flex items-center">
        <Image
          src="/islamic-hero-banner-slim.png"
          alt="দক্ষতা অর্জন করি, ইসলামের পথে এগিয়ে যাই"
          fill
          priority
          className="object-cover object-right pointer-events-none select-none"
        />

        <div
          className="lg:hidden absolute inset-0 bg-gradient-to-r from-[#FFFDF8]/92 via-[#FDF8EC]/80 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 px-4 py-2.5 sm:px-5 lg:max-w-[62%] w-full">
          <p className="text-xs sm:text-[13.5px] font-extrabold text-[#064E3B] tracking-tight flex items-center gap-1.5 leading-none mb-0.5">
            <span>{isBangla ? 'আসসালামু আলাইকুম!' : 'Assalamu Alaikum!'}</span>
            <span className="text-sm sm:text-base" role="img" aria-label="wave">
              👋
            </span>
          </p>

          <h1 className="text-lg sm:text-xl lg:text-[22px] font-black text-[#0F172A] tracking-tight font-serif leading-tight">
            {isBangla ? 'স্বাগতম' : 'Welcome back'}, {user?.full_name?.split(' ')[0] || (isBangla ? 'করিম' : 'Karim')}!
          </h1>

          <p className="text-[11px] text-[#334155] font-medium mt-0.5 leading-snug">
            {isBangla
              ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের আজকের সার্বিক কার্যক্রম ও একাডেমিক আপডেট।'
              : "Here's what's happening at As-Sunnah Skill Development Institute today."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E6F4EA]/95 border border-[#A7F3D0] text-[#065F46] text-[11px] font-semibold shadow-2xs">
              <Calendar className="w-3 h-3 text-[#059669]" />
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E6F4EA] border border-[#A7F3D0] text-[#065F46] text-[11px] font-bold shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-[#059669]" />
              <span>{isBangla ? 'কোর্স কোঅর্ডিনেটর' : 'Course Coordinator'}</span>
            </div>

            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Users className="w-3 h-3 text-[#0F766E]" />
              <span>{isBangla ? 'শিক্ষার্থী' : 'Students'}</span>
            </Link>

            <Link
              href="/admin/batches"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Layers className="w-3 h-3 text-[#059669]" />
              <span>{isBangla ? 'ব্যাচসমূহ' : 'Batches'}</span>
            </Link>

            <Link
              href="/reports"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <FileText className="w-3 h-3 text-[#D97706]" />
              <span>{isBangla ? 'রিপোর্ট হাব' : 'Reports'}</span>
            </Link>

            <a
              href="https://assdi-backend-egu4.onrender.com/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Swagger</span>
              <ExternalLink className="w-3 h-3 text-[#64748B]" />
            </a>
          </div>
        </div>
      </div>

      {/* REPEATED ABSENCES ALERT BANNER (If any) */}
      {repeatedAbsences.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs space-y-2 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-950 flex items-center gap-2">
                  <span>{isBangla ? 'টানা ৩+ দিন ক্লাসে অনুপস্থিতির জরুরি সতর্কবার্তা' : 'Urgent: 3+ Consecutive Absences Alert'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-200 text-rose-900 font-mono font-bold">
                    {repeatedAbsences.length} {isBangla ? 'জন' : 'students'}
                  </span>
                </h3>
              </div>
            </div>

            <Link
              href="/reports?tab=repeated-absences"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>{isBangla ? 'অনুপস্থিতি রিপোর্ট দেখুন' : 'View Report'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. ROW 2: 4 KPI CARDS WITH WAVE SPARKLINES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                ↑ 12%
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">
              {isBangla ? 'মোট শিক্ষার্থী' : 'Total Students'}
            </p>
            <h3 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5 font-sans">
              {d(stats.totalStudents)}
            </h3>
          </div>
          {/* Smooth Green Wave Sparkline */}
          <div className="w-full mt-2 -mb-1">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wave-green-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,19 C15,21 25,13 40,16 C55,19 70,9 85,14 C92,16 97,11 100,8 L100,24 L0,24 Z"
                fill="url(#wave-green-grad)"
              />
              <path
                d="M0,19 C15,21 25,13 40,16 C55,19 70,9 85,14 C92,16 97,11 100,8"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Batches */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                ↑ 0%
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">
              {isBangla ? 'মোট ব্যাচ' : 'Total Batches'}
            </p>
            <h3 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5 font-sans">
              {d(stats.totalBatches)}
            </h3>
          </div>
          {/* Smooth Blue Wave Sparkline */}
          <div className="w-full mt-2 -mb-1">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wave-blue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,20 C18,17 32,8 48,15 C62,21 78,11 92,16 C96,17 98,15 100,13 L100,24 L0,24 Z"
                fill="url(#wave-blue-grad)"
              />
              <path
                d="M0,20 C18,17 32,8 48,15 C62,21 78,11 92,16 C96,17 98,15 100,13"
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Active Courses */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-amber-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                ↑ 1%
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">
              {isBangla ? 'সক্রিয় কোর্স' : 'Active Courses'}
            </p>
            <h3 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5 font-sans">
              {d(stats.totalCourses)}
            </h3>
          </div>
          {/* Smooth Amber Wave Sparkline */}
          <div className="w-full mt-2 -mb-1">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wave-amber-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,18 C16,14 30,22 46,17 C62,12 76,20 88,14 C94,11 98,15 100,12 L100,24 L0,24 Z"
                fill="url(#wave-amber-grad)"
              />
              <path
                d="M0,18 C16,14 30,22 46,17 C62,12 76,20 88,14 C94,11 98,15 100,12"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-purple-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                ↑ 5%
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">
              {isBangla ? 'মোট সেশন' : 'Total Sessions'}
            </p>
            <h3 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5 font-sans">
              {d(stats.totalSessions)}
            </h3>
          </div>
          {/* Smooth Purple Wave Sparkline */}
          <div className="w-full mt-2 -mb-1">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wave-purple-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,19 C14,15 28,21 44,16 C60,11 74,18 86,13 C92,10 97,14 100,11 L100,24 L0,24 Z"
                fill="url(#wave-purple-grad)"
              />
              <path
                d="M0,19 C14,15 28,21 44,16 C60,11 74,18 86,13 C92,10 97,14 100,11"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. ROW 3: RECENT REPORTS TABLE (7 COLS) + QUICK ACTIONS (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Reports (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-extrabold text-[#0F172A] font-serif">
                  {isBangla ? 'সাম্প্রতিক রিপোর্টসমূহ' : 'Recent Reports'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition">
                <span>{isBangla ? 'এই মাসে' : 'This Month'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 pr-3">{isBangla ? 'রিপোর্টের নাম' : 'Report Name'}</th>
                    <th className="py-2.5 px-3">{isBangla ? 'ধরন' : 'Type'}</th>
                    <th className="py-2.5 px-3">{isBangla ? 'তৈরির তারিখ' : 'Generated On'}</th>
                    <th className="py-2.5 px-3">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="py-2.5 pl-3 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentReports.map((report, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pr-3 font-semibold text-[#0F172A] whitespace-nowrap">
                        {report.name}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${report.typeColor}`}
                        >
                          {report.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {report.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <Link
                          href={report.link}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
                          title={isBangla ? 'রিপোর্ট দেখুন' : 'View Report'}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions Card (5 cols) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#025033] via-[#013C24] to-[#012918] p-5 text-white shadow-sm flex flex-col justify-between">
          {/* Bottom-Right Vivid Orange Corner Curves Matching Mockup */}
          <svg
            className="pointer-events-none absolute -bottom-1 -right-1 w-28 h-24"
            viewBox="0 0 120 100"
            fill="none"
            aria-hidden="true"
          >
            <path d="M120 100H20C48 70 72 52 120 26V100Z" fill="#C2410C" fillOpacity="0.95" />
            <path d="M120 100H52C74 78 96 62 120 42V100Z" fill="#EA580C" />
          </svg>

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-[#FACC15] fill-[#FACC15] shrink-0 drop-shadow-xs" />
                <h2 className="text-[17px] font-extrabold tracking-tight !text-white font-serif truncate">
                  {isBangla ? 'দ্রুত কাজসমূহ' : 'Quick Actions'}
                </h2>
              </div>
              <p className="text-[11.5px] !text-emerald-100/90 mt-0.5 truncate">
                {isBangla ? 'সহজেই ইনস্টিটিউটের কার্যক্রম পরিচালনা করুন' : 'Manage your institute easily'}
              </p>
            </div>
            <Link
              href="/admin/batches"
              aria-label={isBangla ? 'সব অপশন দেখুন' : 'View all actions'}
              className="w-7 h-7 rounded-full bg-white hover:bg-emerald-50 text-[#064E3B] flex items-center justify-center shrink-0 transition cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* 6 White Action Tiles Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-2.5 mt-4 flex-1">
            <Link
              href="/admin/teachers"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <UserPlus className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'শিক্ষক যোগ' : 'Add Teacher'}
              </span>
            </Link>

            <Link
              href="/admin/batches"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <Users className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'ব্যাচ অ্যাসাইন' : 'Assign to Batch'}
              </span>
            </Link>

            <Link
              href="/reports"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <Download className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'রিপোর্ট এক্সপোর্ট' : 'Export Report'}
              </span>
            </Link>

            <Link
              href="/reports"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <BarChart3 className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'রিপোর্ট দেখুন' : 'View Reports'}
              </span>
            </Link>

            <Link
              href="/admin/courses"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <BookOpen className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'কোর্স পরিচালনা' : 'Manage Courses'}
              </span>
            </Link>

            <Link
              href="/admin/menu-control"
              className="bg-white hover:bg-[#F0FDF4] text-[#0F172A] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/60 group"
            >
              <Settings className="w-6 h-6 text-[#059669] group-hover:scale-110 transition-transform" />
              <span className="text-[11.5px] font-bold text-[#0F172A] leading-tight">
                {isBangla ? 'সেটিংস' : 'Settings'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. ROW 4: RECENT ACTIVITIES (4 COLS) + UPCOMING CLASSES (5 COLS) + COURSE PROGRESS (3 COLS) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Col 1: Recent Activities (4 cols) */}
        <div className="md:col-span-12 lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-[#0F172A] font-serif">
                  {isBangla ? 'সাম্প্রতিক কার্যক্রম' : 'Recent Activities'}
                </h3>
              </div>
              <Link
                href="/announcements"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline"
              >
                <span>{isBangla ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5 mt-3">
              {recentActivities.map((act, i) => {
                const Icon = act.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0F172A] leading-snug truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {act.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Col 2: Upcoming Classes (5 cols) */}
        <div className="md:col-span-12 lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-[#0F172A] font-serif">
                  {isBangla ? 'আসন্ন ক্লাসসমূহ' : 'Upcoming Classes'}
                </h3>
              </div>
              <Link
                href="/admin/sessions"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline"
              >
                <span>{isBangla ? 'সব দেখুন' : 'View All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 mt-3">
              {upcomingClasses.map((cls, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-center shrink-0 border border-emerald-100">
                      <span className="block text-[11px] font-bold leading-tight">
                        {cls.dateBadge}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#0F172A] truncate">
                        {cls.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {cls.instructor} • {cls.time}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={cls.joinHref}
                    className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition shrink-0 shadow-2xs cursor-pointer"
                  >
                    {isBangla ? 'যুক্ত হোন' : 'Join'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Course Progress Circular Donut (3 cols) */}
        <div className="md:col-span-12 lg:col-span-3 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <PieChart className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-extrabold text-[#0F172A] font-serif">
                {isBangla ? 'কোর্স অগ্রগতি' : 'Course Progress'}
              </h3>
            </div>

            {/* Circular Donut Visual */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#E2E8F0"
                    strokeWidth="9"
                    fill="none"
                  />
                  {/* Completed Segment (72.4%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#059669"
                    strokeWidth="9"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.724)}
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* In Progress Segment (18.2%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F59E0B"
                    strokeWidth="9"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.182)}
                    strokeLinecap="round"
                    fill="none"
                    className="opacity-70"
                    style={{ transformOrigin: '50% 50%', transform: 'rotate(260deg)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-[#0F172A] tracking-tight leading-none">
                    72.4%
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {isBangla ? 'মোট অগ্রগতি' : 'Overall Progress'}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-1.5 mt-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                    <span>{isBangla ? 'সম্পন্ন' : 'Completed'}</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">72.4%</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>{isBangla ? 'চলমান' : 'In Progress'}</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">18.2%</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span>{isBangla ? 'শুরু হয়নি' : 'Not Started'}</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">9.4%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ROW 5: SYSTEM STATISTICS (8 COLS) + BUILDING SKILLS PROMO BANNER (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: System Statistics (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-[#0F172A] font-serif">
                  {isBangla ? 'সিস্টেম পরিসংখ্যান' : 'System Statistics'}
                </h3>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition">
                <span>{isBangla ? 'এই মাসে' : 'This Month'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {/* Stat 1: Students */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-100 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xl font-black text-[#0F172A]">{d(stats.totalStudents)}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isBangla ? 'শিক্ষার্থী' : 'Students'}
                </p>
              </div>

              {/* Stat 2: Batches */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-100 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-xl font-black text-[#0F172A]">{d(stats.totalBatches)}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isBangla ? 'ব্যাচ' : 'Batches'}
                </p>
              </div>

              {/* Stat 3: Courses */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-100 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h4 className="text-xl font-black text-[#0F172A]">{d(stats.totalCourses)}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isBangla ? 'কোর্স' : 'Courses'}
                </p>
              </div>

              {/* Stat 4: Sessions */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-100 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-xl font-black text-[#0F172A]">{d(stats.totalSessions)}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isBangla ? 'সেশন' : 'Sessions'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Building Skills Promo Banner (4 cols) */}
        <div className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00382B] via-[#002B21] to-[#001D16] border border-[#064E3B]/40 p-5 text-white shadow-sm flex flex-col justify-between min-h-[140px] group">
          {/* Subtle Mosque Silhouette Overlay on Right */}
          <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-30 pointer-events-none select-none">
            <Image
              src="/islamic-banner-mosque.png"
              alt="Mosque Silhouette"
              fill
              className="object-cover object-right"
            />
          </div>

          <div className="relative z-10">
            <h3 className="text-lg font-black text-white font-serif tracking-tight">
              {isBangla ? 'দক্ষতা অর্জন' : 'Building Skills'}
            </h3>
            <p className="text-xs font-semibold text-[#FDE68A] mt-0.5">
              {isBangla ? 'উম্মাহর উন্নয়ন ও সেবায় নিয়োজিত' : 'Building a Better Ummah'}
            </p>
          </div>

          <div className="relative z-10 mt-4">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-xl shadow-xs transition group-hover:scale-105 active:scale-95"
            >
              <span>{isBangla ? 'রিপোর্ট হাব দেখুন' : 'View Reports'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
