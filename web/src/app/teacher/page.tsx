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

export default function TeacherOverviewPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const [todaySessions, setTodaySessions] = useState<ClassSessionItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<HelpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    toast.success(isBangla ? 'ড্যাশবোর্ড রিফ্রেশ করা হয়েছে' : 'Dashboard refreshed');
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
      {/* Top Banner / Welcome Bar */}
      <div className="bg-[#0B2A21] border border-[#071F18] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative architectural grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#164E3D_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C5A059]/15 border border-[#C5A059]/35 rounded-full text-xs font-semibold text-[#E5C378] mb-2.5">
              <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{t('brand.course')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isBangla ? 'আস-সালামু আলাইকুম,' : 'Welcome,'}{' '}
              {user?.full_name || user?.login_id}
            </h1>
            <p className="text-emerald-100/80 text-sm mt-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C5A059]" />
              <span>{todayFormatted} (ঢাকা সময়)</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2.5 bg-[#061C16] hover:bg-[#07241C] text-emerald-100 rounded-xl text-xs font-semibold border border-emerald-900/80 flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#C5A059]' : ''}`} />
              <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            <Link
              href="/teacher/qr"
              className="px-4 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-[#0B2A21] font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4 text-[#0B2A21]" />
              <span>{isBangla ? 'লাইভ কিউআর খুলুন' : 'Open Live QR'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-[#0B2A21]/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'আজকের ক্লাস' : "Today's Schedule"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {d(todaySessions.length)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'টি সেশন' : 'Sessions'}</span>
          </h3>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <span>●</span> {isBangla ? 'রুটিন অনুযায়ী নির্ধারিত' : 'As per timetable'}
          </p>
        </div>

        {/* Pending Help Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Pending Help'}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${
              pendingRequests.length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-extrabold ${pendingRequests.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {d(pendingRequests.length)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'টি অমীমাংসিত' : 'Pending'}</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {pendingRequests.length > 0 ? (isBangla ? 'দ্রুত সমাধান প্রয়োজন' : 'Action needed') : (isBangla ? 'সবকিছু আপ-টু-ডেট' : 'All resolved')}
          </p>
        </div>

        {/* Live QR Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'কিউআর রোটেশন' : 'QR Token Engine'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {isBangla ? '৪৫ সেকেন্ডে অটো-রিফ্রেশ' : '45s Auto-Rotation'}
          </h3>
          <p className="text-[11px] text-blue-700 font-semibold mt-1">
            {isBangla ? 'জাল হাজিরা প্রতিরোধী টোকেন' : 'Anti-Proxy Protected'}
          </p>
        </div>

        {/* 48h Correction Window */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-purple-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'কারেকশন উইন্ডো' : 'Correction Rule'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {isBangla ? '৪৮ ঘণ্টা নির্ধারিত সীমা' : '48 Hours Limit'}
          </h3>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">
            {isBangla ? 'ক্লাস শেষ হওয়ার পর থেকে' : 'Post-session deadline'}
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Classes & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-800" />
              <h2 className="text-lg font-bold text-gray-900">
                {isBangla ? 'আজকের ক্লাস শিডিউল' : "Today's Class Schedule"}
              </h2>
            </div>
            <span className="text-xs text-emerald-800 font-semibold px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
              {d(todaySessions.length)} {isBangla ? 'টি ক্লাস পাওয়া গেছে' : 'Sessions Found'}
            </span>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
              <p className="text-xs text-gray-500">{t('common.loading')}</p>
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-800">
                {isBangla ? 'আজকে আপনার কোনো নির্ধারিত ক্লাস নেই' : 'No Scheduled Classes Today'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {isBangla
                  ? 'আপনার নির্ধারিত অন্য দিনের সেশন এবং হাজিরা তালিকা দেখতে নিচে ক্লিক করুন।'
                  : 'Check your other sessions or upcoming timetable from the attendance sheet.'}
              </p>
              <div className="pt-2">
                <Link
                  href="/teacher/attendance"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition"
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
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 border-l-4 border-l-[#0B2A21] hover:shadow-md transition-all duration-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {session.subject_name || `Subject #${session.subject}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.audience === 'general'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : session.audience === 'madrasa'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-[#0B2A21] border border-emerald-200'
                        }`}>
                          {session.audience === 'general' ? 'General' : session.audience === 'madrasa' ? 'Madrasa' : 'Combined (All)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {session.topic_title || (isBangla ? 'টপিক নির্ধারিত হয়নি' : 'No Topic Assigned')}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2A21] bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>
                          {d(session.start_time.slice(0, 5))} - {d(session.end_time.slice(0, 5))}
                        </span>
                      </div>
                      {session.room && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {session.room}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this session */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link
                      href={`/teacher/qr?sessionId=${session.id}`}
                      className="px-3.5 py-2 bg-[#0B2A21] hover:bg-[#164E3D] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{isBangla ? 'লাইভ কিউআর প্রজেক্টর' : 'Live QR Projector'}</span>
                    </Link>

                    <Link
                      href={`/teacher/attendance?sessionId=${session.id}`}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{isBangla ? 'ম্যানুয়াল হাজিরা ও কারেকশন' : 'Manual Attendance'}</span>
                    </Link>

                    <Link
                      href={`/teacher/understanding?sessionId=${session.id}${session.topic ? `&topicId=${session.topic}` : ''}`}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ml-auto cursor-pointer active:scale-95"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
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
              <h2 className="text-lg font-bold text-gray-900">
                {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}
              </h2>
            </div>
            <Link
              href="/teacher/help-requests"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
            >
              <span>{isBangla ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {isBangla ? 'কোনো অমীমাংসিত হেল্প রিকোয়েস্ট নেই' : 'No Pending Help Requests'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
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
                      <span className="text-xs font-bold text-slate-900">
                        {req.student_name || req.student_id_number || `Student #${req.student}`}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full">
                        {isBangla ? 'অমীমাংসিত' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 italic">
                      "{req.student_comment}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{req.topic_title || req.subject_name || 'SBMC'}</span>
                      <Link
                        href={`/teacher/help-requests?highlight=${req.id}`}
                        className="text-[#0B2A21] font-bold hover:underline"
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
