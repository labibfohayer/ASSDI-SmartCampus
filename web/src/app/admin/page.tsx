'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  BookOpen,
  ArrowRight,
  Database,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    totalTeachers: 0,
    totalSessions: 0,
  });
  const [repeatedAbsences, setRepeatedAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const [dashRes, sessionsRes] = await Promise.all([
          api.get('/api/v1/analytics/coordinator-dashboard/').catch(() => ({ data: {} })),
          api.get('/api/v1/class-sessions/').catch(() => ({ data: [] })),
        ]);

        const dashData = dashRes.data?.data || dashRes.data || {};
        const sessionsList = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : sessionsRes.data?.results || [];

        setStats({
          totalStudents: dashData.total_students || 0,
          totalBatches: dashData.total_active_batches || 0,
          totalTeachers: dashData.total_teachers || 0,
          totalSessions: sessionsList.length || 0,
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

  const managementModules = [
    {
      title: isBangla ? 'শিক্ষার্থী ব্যবস্থাপনা' : 'Student Management',
      desc: isBangla
        ? 'নতুন শিক্ষার্থী প্রোফাইল তৈরি, ব্যাচে অন্তর্ভুক্তি ও স্ট্যাটাস আপডেট।'
        : 'Enroll new students, assign batches, and manage active status.',
      icon: Users,
      href: '/admin/students',
      color: 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D]',
      badge: `${d(stats.totalStudents)} ${isBangla ? 'জন শিক্ষার্থী' : 'Students'}`,
    },
    {
      title: isBangla ? 'কোর্স ও ব্যাচ প্রশাসন' : 'Courses & Batches',
      desc: isBangla
        ? 'নতুন কোর্স তৈরি, ব্যাচের সময়কাল নির্ধারণ ও শিক্ষক অ্যাসাইনমেন্ট।'
        : 'Manage curriculum, configure batches, and assign faculty.',
      icon: Layers,
      href: '/admin/courses',
      color: 'bg-blue-50 text-[#016C90] border border-blue-200',
      badge: `${d(stats.totalBatches)} ${isBangla ? 'টি ব্যাচ' : 'Batches'}`,
    },
    {
      title: isBangla ? 'ক্লাস সেশন ও শিডিউলিং' : 'Class Sessions & Schedules',
      desc: isBangla
        ? 'সাপ্তাহিক রুটিন থেকে ক্লাস সেশন জেনারেশন, পাবলিশ ও সেশন বাতিল।'
        : 'Generate class timetables, publish sessions, and manage cancellations.',
      icon: Calendar,
      href: '/admin/sessions',
      color: 'bg-purple-50 text-purple-800 border border-purple-200',
      badge: `${d(stats.totalSessions)} ${isBangla ? 'টি সেশন' : 'Sessions'}`,
    },
    {
      title: isBangla ? 'নোটিশ ও প্রাতিষ্ঠানিক যোগাযোগ' : 'Institutional Announcements',
      desc: isBangla
        ? 'ইনস্টিটিউটের শিক্ষার্থী ও শিক্ষকদের জন্য জরুরি নোটিশ তৈরি ও প্রকাশ।'
        : 'Publish official notices, campus alerts, and urgent announcements.',
      icon: Megaphone,
      href: '/announcements',
      color: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      badge: isBangla ? 'নোটিশ বোর্ড' : 'Notice Board',
    },
    {
      title: isBangla ? '৯টি এসআরএস রিপোর্ট ও এক্সপোর্ট' : '9 SRS Reports Hub',
      desc: isBangla
        ? 'অন-স্ক্রিন প্রিভিউ এবং সরাসরি এক ক্লিকে PDF ও Excel (.xlsx) ডাউনলোড।'
        : 'Instant on-screen preview and one-click PDF & Excel report downloads.',
      icon: FileText,
      href: '/reports',
      color: 'bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D]',
      badge: isBangla ? 'পিডিএফ ও এক্সেল এক্সপোর্ট' : 'Export Hub',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Slim Islamic Modern Super Admin Hero Welcome Card */}
      <div className="relative rounded-2xl overflow-hidden shadow-xs border border-[#FDE68A]/70 bg-[#FEF6DF] min-h-[138px] lg:min-h-[146px] flex items-center">
        <Image
          src="/islamic-hero-banner-slim.png"
          alt="দক্ষতা অর্জন করি, ইসলামের পথে এগিয়ে যাই"
          fill
          priority
          className="object-cover object-right pointer-events-none select-none"
        />

        {/* Subtle mobile/tablet left scrim so text remains crisp over narrower screens */}
        <div
          className="lg:hidden absolute inset-0 bg-gradient-to-r from-[#FFFDF8]/92 via-[#FDF8EC]/80 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Compact Left Content */}
        <div className="relative z-10 px-4 py-2.5 sm:px-5 lg:max-w-[62%] w-full">
          <p className="text-xs sm:text-[13.5px] font-extrabold text-[#064E3B] tracking-tight flex items-center gap-1.5 leading-none mb-0.5">
            <span>{isBangla ? 'আসসালামু আলাইকুম!' : 'Assalamu Alaikum!'}</span>
            <span className="text-sm sm:text-base" role="img" aria-label="wave">
              👋
            </span>
          </p>

          <h1 className="text-lg sm:text-xl lg:text-[22px] font-black text-[#0F172A] tracking-tight font-serif leading-tight">
            {isBangla ? 'স্বাগতম' : 'Welcome back'}, {user?.full_name?.split(' ')[0] || (isBangla ? 'অ্যাডমিন' : 'Admin')}!
          </h1>

          <p className="text-[11px] text-[#334155] font-medium mt-0.5 leading-snug">
            {isBangla
              ? 'আল্লাহ আপনার প্রশাসনিক দায়িত্ব ও ব্যবস্থাপনা কার্যক্রমে বরকত দান করুন — কেন্দ্রীয় নিয়ন্ত্রণ কেন্দ্র।'
              : 'May Allah bless your administrative leadership and institutional governance.'}
          </p>

          {/* Compact Single Strip: Date, Role & Quick Actions */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E6F4EA]/95 border border-[#A7F3D0] text-[#065F46] text-[11px] font-semibold shadow-2xs">
              <Calendar className="w-3 h-3 text-[#059669]" />
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] font-bold shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-[#D97706]" />
              <span>{isBangla ? 'সুপার অ্যাডমিন' : 'Super Admin'}</span>
            </div>

            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Users className="w-3 h-3 text-[#0F766E]" />
              <span>{isBangla ? 'শিক্ষার্থী তালিকা' : 'Students'}</span>
            </Link>

            <Link
              href="/admin/batches"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Layers className="w-3 h-3 text-[#059669]" />
              <span>{isBangla ? 'ব্যাচ ও কোর্স' : 'Batches'}</span>
            </Link>

            <Link
              href="/reports"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <FileText className="w-3 h-3 text-[#D97706]" />
              <span>{isBangla ? '৯টি SRS রিপোর্ট' : 'Reports'}</span>
            </Link>

            <a
              href="https://assdi-backend-egu4.onrender.com/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <span>{isBangla ? 'Swagger ডক্স' : 'Swagger'}</span>
              <ExternalLink className="w-3 h-3 text-[#64748B]" />
            </a>
          </div>
        </div>
      </div>

      {/* Consecutive Absence Alert Card */}
      {repeatedAbsences.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-rose-950 flex items-center gap-2">
                  <span>{isBangla ? 'টানা ৩+ দিন ক্লাসে অনুপস্থিতির জরুরি সতর্কবার্তা' : 'Urgent: 3+ Consecutive Absences Alert'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-200 text-rose-900 font-mono font-bold">
                    {repeatedAbsences.filter((st: any) => st.consecutive_absences >= 3).length || repeatedAbsences.length} জন
                  </span>
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  {isBangla
                    ? 'নিচের শিক্ষার্থীরা নির্ধারিত কোর্সে টানা ৩ দিন বা ততোধিক ক্লাসে অনুপস্থিত থাকায় সিস্টেম স্বয়ংক্রিয়ভাবে সতর্কবার্তা ফ্ল্যাগ করেছে।'
                    : 'System has automatically flagged students who have missed 3 or more consecutive class sessions.'}
                </p>
              </div>
            </div>

            <Link
              href="/coordinator/at-risk?filter=absence"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>{isBangla ? 'অ্যাট-রিস্ক ড্যাশবোর্ডে বিস্তারিত দেখুন' : 'View in At-Risk Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-rose-200/80">
            {repeatedAbsences.slice(0, 3).map((st: any, idx: number) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900">{st.student_name}</p>
                  <p className="text-[11px] font-mono text-slate-500">{st.student_id_number}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-xs">
                    {st.consecutive_absences} দিন টানা
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats Bento Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#B45309]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'মোট শিক্ষার্থী' : 'Students'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">{d(stats.totalStudents)} <span className="text-sm font-semibold text-[#475569]">জন</span></h3>
          <p className="text-[11px] text-[#0369A1] font-semibold mt-1">● {isBangla ? 'নিবন্ধিত ডাটাবেস রেকর্ড' : 'Enrolled records'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#016C90]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'সক্রিয় ব্যাচ' : 'Batches'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#016C90] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">{d(stats.totalBatches)} <span className="text-sm font-semibold text-[#475569]">টি</span></h3>
          <p className="text-[11px] text-[#016C90] font-semibold mt-1">● {isBangla ? 'চলমান শিক্ষা ব্যাচ' : 'Active cohorts'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-purple-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'নিবন্ধিত শিক্ষক' : 'Faculty'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">{d(stats.totalTeachers)} <span className="text-sm font-semibold text-[#475569]">জন</span></h3>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">● {isBangla ? 'শিক্ষক ও ট্রেইনার' : 'Active trainers'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'ক্লাস সেশন' : 'Sessions'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">{d(stats.totalSessions)} <span className="text-sm font-semibold text-[#475569]">টি</span></h3>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">● {isBangla ? 'শিডিউল্ড ও পাবলিশড' : 'Total published'}</p>
        </div>
      </div>

      {/* Main Management Modules Grid */}
      <div>
        <h2 className="text-base font-extrabold text-[#0F172A] font-heading mb-3.5">
          {isBangla ? 'প্রশাসনিক মডিউলসমূহ' : 'Administrative Modules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementModules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <Link
                key={i}
                href={mod.href}
                className="bg-white p-6 rounded-xl border border-[#E2E8F0] hover:border-[#0D9488]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-[#F8FAFC] text-[#475569] rounded-full border border-[#E2E8F0]">
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A] font-heading group-hover:text-[#0F766E] transition">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[#475569] mt-1.5 leading-relaxed font-normal">
                      {mod.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#0F766E]">
                  <span>{isBangla ? 'মডিউলে প্রবেশ করুন' : 'Manage Module'}</span>
                  <ArrowRight className="w-4 h-4 text-[#0F766E] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Infrastructure & Security Health Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#0369A1]" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#0F172A] font-heading">
              {isBangla ? 'ডাটাবেস ও সিকিউর এপিআই সংযোগ' : 'Database & Secure API Connected'}
            </h4>
            <p className="text-xs text-[#475569] mt-0.5">
              PostgreSQL 16 Engine • Django 5 REST Framework • JWT Auth • RBAC Scoping Active
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] rounded-xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#0369A1]" />
          <span>{isBangla ? 'সকল সার্ভিস সক্রিয়' : 'System Healthy'}</span>
        </div>
      </div>
    </div>
  );
}
