'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
      title: isBangla ? 'কোঅর্ডিনেশন অ্যানালিটিক্স' : 'Academic Analytics',
      desc: isBangla
        ? 'উপস্থিতি ও লার্নিং প্রগ্রেসের সেন্ট্রাল কেপিআই এবং অ্যাট-রিস্ক অ্যালার্ট।'
        : 'View centralized attendance rates, learning outcomes, and red flags.',
      icon: BarChart3,
      href: '/coordinator',
      color: 'bg-amber-50 text-amber-800 border border-amber-200',
      badge: isBangla ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Live Analytics',
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
      {/* Top Banner */}
      <div className="bg-[#FFFBEB] border border-[#FCD34D] border-l-4 border-l-[#D97706] rounded-2xl p-6 sm:p-7 text-[#0F172A] shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B45309]" />
              <span>{t('brand.course')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F172A]">
              {isBangla ? 'সিস্টেম অ্যাডমিনিস্ট্রেশন সেন্টার' : 'System Administration Center'}
            </h1>
            <p className="text-[#78350F] text-xs sm:text-sm mt-1.5">
              {isBangla
                ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI) প্ল্যাটফর্মের সামগ্রিক ডেটা ও ইউজার নিয়ন্ত্রণ।'
                : 'Central administrative controls for students, faculty, batches, and academic governance.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="http://localhost:8001/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 bg-white hover:bg-[#F0FDFA] text-[#0F766E] rounded-xl text-xs font-semibold border border-[#CCFBF1] flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span>{isBangla ? 'ওপেনএপিআই ডক্স (Swagger)' : 'API Docs (Swagger)'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#0F766E]" />
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
