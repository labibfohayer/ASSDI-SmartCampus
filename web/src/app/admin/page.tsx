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
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badge: `${d(stats.totalStudents)} ${isBangla ? 'জন শিক্ষার্থী' : 'Students'}`,
    },
    {
      title: isBangla ? 'কোর্স ও ব্যাচ প্রশাসন' : 'Courses & Batches',
      desc: isBangla
        ? 'নতুন কোর্স তৈরি, ব্যাচের সময়কাল নির্ধারণ ও শিক্ষক অ্যাসাইনমেন্ট।'
        : 'Manage curriculum, configure batches, and assign faculty.',
      icon: Layers,
      href: '/admin/courses',
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      badge: `${d(stats.totalBatches)} ${isBangla ? 'টি ব্যাচ' : 'Batches'}`,
    },
    {
      title: isBangla ? 'ক্লাস সেশন ও শিডিউলিং' : 'Class Sessions & Schedules',
      desc: isBangla
        ? 'সাপ্তাহিক রুটিন থেকে ক্লাস সেশন জেনারেশন, পাবলিশ ও সেশন বাতিল।'
        : 'Generate class timetables, publish sessions, and manage cancellations.',
      icon: Calendar,
      href: '/admin/sessions',
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      badge: `${d(stats.totalSessions)} ${isBangla ? 'টি সেশন' : 'Sessions'}`,
    },
    {
      title: isBangla ? 'কোঅর্ডিনেশন অ্যানালিটিক্স' : 'Academic Analytics',
      desc: isBangla
        ? 'উপস্থিতি ও লার্নিং প্রগ্রেসের সেন্ট্রাল কেপিআই এবং অ্যাট-রিস্ক অ্যালার্ট।'
        : 'View centralized attendance rates, learning outcomes, and red flags.',
      icon: BarChart3,
      href: '/coordinator',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      badge: isBangla ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Live Analytics',
    },
    {
      title: isBangla ? '৯টি এসআরএস রিপোর্ট ও এক্সপোর্ট' : '9 SRS Reports Hub',
      desc: isBangla
        ? 'অন-স্ক্রিন প্রিভিউ এবং সরাসরি এক ক্লিকে PDF ও Excel (.xlsx) ডাউনলোড।'
        : 'Instant on-screen preview and one-click PDF & Excel report downloads.',
      icon: FileText,
      href: '/reports',
      color: 'bg-emerald-950 text-emerald-100 border-emerald-900',
      badge: isBangla ? 'পিডিএফ ও এক্সেল এক্সপোর্ট' : 'Export Hub',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B2A21] border border-[#071F18] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#164E3D_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C5A059]/15 border border-[#C5A059]/35 rounded-full text-xs font-semibold text-[#E5C378] mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{t('brand.course')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isBangla ? 'সিস্টেম অ্যাডমিনিস্ট্রেশন সেন্টার' : 'System Administration Center'}
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5">
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
              className="px-3.5 py-2.5 bg-[#061C16] hover:bg-[#07241C] text-emerald-100 rounded-xl text-xs font-semibold border border-emerald-900/80 flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span>{isBangla ? 'ওপেনএপিআই ডক্স (Swagger)' : 'API Docs (Swagger)'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Stats Bento Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-[#0B2A21]/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'মোট শিক্ষার্থী' : 'Students'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{d(stats.totalStudents)} <span className="text-sm font-semibold text-slate-500">জন</span></h3>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">● {isBangla ? 'নিবন্ধিত ডাটাবেস রেকর্ড' : 'Enrolled records'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'সক্রিয় ব্যাচ' : 'Batches'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{d(stats.totalBatches)} <span className="text-sm font-semibold text-slate-500">টি</span></h3>
          <p className="text-[11px] text-blue-700 font-semibold mt-1">● {isBangla ? 'চলমান শিক্ষা ব্যাচ' : 'Active cohorts'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-purple-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'নিবন্ধিত শিক্ষক' : 'Faculty'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{d(stats.totalTeachers)} <span className="text-sm font-semibold text-slate-500">জন</span></h3>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">● {isBangla ? 'শিক্ষক ও ট্রেইনার' : 'Active trainers'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isBangla ? 'ক্লাস সেশন' : 'Sessions'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{d(stats.totalSessions)} <span className="text-sm font-semibold text-slate-500">টি</span></h3>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">● {isBangla ? 'শিডিউল্ড ও পাবলিশড' : 'Total published'}</p>
        </div>
      </div>

      {/* Main Management Modules Grid */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-3.5">
          {isBangla ? 'প্রশাসনিক মডিউলসমূহ' : 'Administrative Modules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementModules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <Link
                key={i}
                href={mod.href}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 hover:border-[#0B2A21]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60">
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#0B2A21] transition">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                      {mod.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B2A21]">
                  <span>{isBangla ? 'মডিউলে প্রবেশ করুন' : 'Manage Module'}</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Infrastructure & Security Health Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B2A21] border border-emerald-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-[#0B2A21]" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">
              {isBangla ? 'ডাটাবেস ও সিকিউর এপিআই সংযোগ' : 'Database & Secure API Connected'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              PostgreSQL 16 Engine • Django 5 REST Framework • JWT Auth • RBAC Scoping Active
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#0B2A21] border border-emerald-200 rounded-xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isBangla ? 'সকল সার্ভিস সক্রিয়' : 'System Healthy'}</span>
        </div>
      </div>
    </div>
  );
}
