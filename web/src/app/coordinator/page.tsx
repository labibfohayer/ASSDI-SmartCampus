'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  Layers,
  GraduationCap,
  Calendar,
  CheckSquare,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  FileText,
  BarChart3,
  BookOpen,
  Star,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardData {
  total_students: number;
  total_active_batches: number;
  total_teachers: number;
  todays_classes: number;
  overall_attendance_percentage: number;
  overall_learning_progress: {
    average_rating: number;
    average_percentage: number;
  };
  total_help_requests: number;
  pending_help_requests: number;
  batch_wise_performance: Array<{
    batch_id: number;
    batch_number: number;
    batch_name: string;
    student_count: number;
    attendance_percentage: number;
    learning_percentage: number;
    average_rating: number;
  }>;
  teacher_wise_performance: Array<{
    teacher_id: number;
    teacher_name: string;
    sessions_taken: number;
    attendance_percentage: number;
    average_rating: number;
    learning_percentage: number;
  }>;
  repeated_absence_count: number;
  repeated_absences: Array<{
    student_id: number;
    student_id_number: string;
    student_name: string;
    batch_name: string;
    consecutive_absences: number;
    total_absences: number;
  }>;
  students_requiring_attention_count: number;
  students_requiring_attention: Array<{
    student_id: number;
    student_id_number: string;
    student_name: string;
    batch_name: string;
    average_rating: number;
    consecutive_absences: number;
    total_absences: number;
    phone?: string;
  }>;
}

export default function CoordinatorDashboardPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();

  const safeFixed = (val: any, fallback = '0.0') =>
    typeof val === 'number' && !isNaN(val) ? val.toFixed(1) : fallback;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBatch) params.append('batch', selectedBatch);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const url = `/api/v1/analytics/coordinator-dashboard/${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      const res = await api.get(url);
      const resData = res.data?.data || res.data;
      setData(resData);
    } catch (err: any) {
      console.error('Failed to load coordinator dashboard:', err);
      toast.error(isBangla ? 'ড্যাশবোর্ড ডাটা লোড করা যায়নি' : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleResetFilter = () => {
    setSelectedBatch('');
    setDateFrom('');
    setDateTo('');
    fetchDashboardData();
  };

  // Recharts Bar Data for Batch Comparison
  const batchChartData = data?.batch_wise_performance?.map((b) => ({
    name: b.batch_name || `Batch ${b.batch_number}`,
    attendance: b.attendance_percentage,
    learning: b.learning_percentage,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Slim Islamic Modern Coordinator Hero Welcome Card */}
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
            {isBangla ? 'স্বাগতম' : 'Welcome back'}, {user?.full_name?.split(' ')[0] || (isBangla ? 'কোঅর্ডিনেটর' : 'Coordinator')}!
          </h1>

          <p className="text-[11px] text-[#334155] font-medium mt-0.5 leading-snug">
            {isBangla
              ? 'আল্লাহ আপনার তদারকি ও একাডেমিক সমন্বয় প্রচেষ্টায় বরকত দান করুন — কেন্দ্রীয় কোঅর্ডিনেশন সেন্টার।'
              : 'May Allah bless your academic coordination, attendance oversight, and progress monitoring.'}
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

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] text-[11px] font-bold shadow-2xs">
              <BarChart3 className="w-3 h-3 text-[#0284C7]" />
              <span>{isBangla ? 'একাডেমিক কোঅর্ডিনেটর' : 'Coordinator'}</span>
            </div>

            <Link
              href="/reports"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
            >
              <FileText className="w-3 h-3 text-[#0F766E]" />
              <span>{isBangla ? 'রিপোর্ট হাব' : 'Reports Hub'}</span>
            </Link>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData();
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[#0F172A] hover:text-[#0F766E] text-[11px] font-medium transition cursor-pointer shadow-2xs active:scale-95"
              title="রিফ্রেশ"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#0F766E]' : 'text-slate-500'}`} />
              <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#475569]">
          <Filter className="w-4 h-4 text-[#0F766E]" />
          <span>{isBangla ? 'ফিল্টার কন্ট্রোল:' : 'Filter Analytics:'}</span>
        </div>

        {/* Batch Dropdown */}
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-w-[190px]"
        >
          <option value="">{isBangla ? 'সকল সক্রিয় ব্যাচ' : 'All Active Batches'}</option>
          {data?.batch_wise_performance?.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.batch_name}
            </option>
          ))}
        </select>

        {/* Date From */}
        <div className="flex items-center gap-1.5 text-xs text-[#475569]">
          <span>{isBangla ? 'তারিখ হতে:' : 'From:'}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 text-xs text-[#475569]">
          <span>{isBangla ? 'পর্যন্ত:' : 'To:'}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        {/* Submit & Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            {isBangla ? 'ফিল্টার প্রয়োগ' : 'Apply Filter'}
          </button>
          {(selectedBatch || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#475569] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {isBangla ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>
      </form>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#B45309]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'সক্রিয় শিক্ষার্থী' : 'Enrolled Students'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(data?.total_students || 0)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'জন' : ''}</span>
          </h3>
          <p className="text-[11px] text-[#0369A1] font-semibold mt-1">
            ● {isBangla ? 'সকল ব্যাচ মিলিয়ে' : 'Across all batches'}
          </p>
        </div>

        {/* Overall Attendance */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#016C90]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'সামগ্রিক উপস্থিতি' : 'Attendance Rate'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#016C90] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(safeFixed(data?.overall_attendance_percentage))}%
          </h3>
          <p className="text-[11px] text-[#016C90] font-semibold mt-1">
            {Number(data?.overall_attendance_percentage || 0) >= 80 ? (isBangla ? 'সন্তোষজনক স্তর' : 'Satisfactory') : (isBangla ? 'উন্নয়ন প্রয়োজন' : 'Needs attention')}
          </p>
        </div>

        {/* Learning Progress */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning Progress'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-700 font-heading">
            {d(safeFixed(data?.overall_learning_progress?.average_percentage))}%
            <span className="text-xs font-normal text-[#475569] ml-1.5">
              ({d(safeFixed(data?.overall_learning_progress?.average_rating))} / ৫)
            </span>
          </h3>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">
            ● {isBangla ? 'শিক্ষার্থীর ফিডব্যাক গড়' : 'Avg student rating'}
          </p>
        </div>

        {/* At-Risk Alert */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-red-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'ঝুঁকিপূর্ণ শিক্ষার্থী' : 'At-Risk Alert'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-red-600 font-heading">
            {d(data?.students_requiring_attention_count || 0)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'জন' : ''}</span>
          </h3>
          <p className="text-[11px] text-red-600 font-semibold mt-1">
            ● {isBangla ? 'জরুরি ফলোআপ কাম্য' : 'Immediate intervention'}
          </p>
        </div>
      </div>

      {/* Second Row: Secondary Bento KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] text-[#475569] font-bold uppercase tracking-wider">{isBangla ? 'সক্রিয় ব্যাচ' : 'Active Batches'}</p>
          <h4 className="text-lg font-extrabold text-[#0F172A] font-heading mt-1">{d(data?.total_active_batches || 0)} টি</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] text-[#475569] font-bold uppercase tracking-wider">{isBangla ? 'শিক্ষক / ট্রেইনার' : 'Active Faculty'}</p>
          <h4 className="text-lg font-extrabold text-[#0F172A] font-heading mt-1">{d(data?.total_teachers || 0)} জন</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] text-[#475569] font-bold uppercase tracking-wider">{isBangla ? 'আজকের ক্লাস' : "Today's Classes"}</p>
          <h4 className="text-lg font-extrabold text-[#0F172A] font-heading mt-1">{d(data?.todays_classes || 0)} টি</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] text-[#475569] font-bold uppercase tracking-wider">{isBangla ? 'অমীমাংসিত হেল্প' : 'Pending Help'}</p>
          <h4 className="text-lg font-extrabold text-amber-700 font-heading mt-1">
            {d(data?.pending_help_requests || 0)} / {d(data?.total_help_requests || 0)}
          </h4>
        </div>
      </div>

      {/* Main Grid: Comparative Chart & At-Risk Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Batch Comparison Chart & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recharts Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] font-heading">
                  {isBangla ? 'ব্যাচভিত্তিক উপস্থিতি বনাম লার্নিং প্রগ্রেস' : 'Batch Attendance vs Learning Progress'}
                </h2>
                <p className="text-xs text-[#475569]">
                  {isBangla
                    ? 'প্রতিটি ব্যাচের উপস্থিতির হার (%) এবং গড় লার্নিং প্রগ্রেসের তুলনামূলক গ্রাফ'
                    : 'Comparative bar chart of attendance % vs learning progress %'}
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
                </div>
              ) : batchChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#475569]">
                  {isBangla ? 'কোনো ব্যাচ ডাটা পাওয়া যায়নি।' : 'No batch data available.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, '']}
                      contentStyle={{
                        borderRadius: '8px',
                        backgroundColor: '#1E293B',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="attendance"
                      name={isBangla ? 'উপস্থিতি %' : 'Attendance %'}
                      fill="#0F766E"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="learning"
                      name={isBangla ? 'লার্নিং প্রগ্রেস %' : 'Learning Progress %'}
                      fill="#0284C7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Batch Performance Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="text-sm font-extrabold text-[#0F172A] font-heading">
                {isBangla ? 'ব্যাচভিত্তিক পারফরম্যান্স সামারি' : 'Batch Performance Summary'}
              </h3>
              <Link
                href="/coordinator/batches"
                className="text-xs text-[#0F766E] hover:text-[#115E59] font-bold flex items-center gap-1"
              >
                <span>{isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                    <th className="py-3 px-4">{isBangla ? 'শিক্ষার্থী' : 'Students'}</th>
                    <th className="py-3 px-4">{isBangla ? 'উপস্থিতির হার' : 'Attendance %'}</th>
                    <th className="py-3 px-4">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning %'}</th>
                    <th className="py-3 px-4">{isBangla ? 'গড় রেটিং' : 'Rating'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {data?.batch_wise_performance?.map((b) => (
                    <tr key={b.batch_id} className="hover:bg-[#F0FDFA] transition">
                      <td className="py-3 px-4 font-bold text-[#0F172A] font-heading">{b.batch_name}</td>
                      <td className="py-3 px-4 text-[#475569]">{d(b.student_count)} জন</td>
                      <td className="py-3 px-4 font-bold text-[#0F766E]">
                        {d(safeFixed(b.attendance_percentage))}%
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-700">
                        {d(safeFixed(b.learning_percentage))}%
                      </td>
                      <td className="py-3 px-4 text-[#0F172A] font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#C1982E] fill-[#C1982E]" />
                          <span>{d(safeFixed(b.average_rating))}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right (1 col): At-Risk Alert Students Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-[#0F172A] font-heading">
                {isBangla ? 'মনোযোগ প্রয়োজন (অ্যাট-রিস্ক)' : 'Students Requiring Attention'}
              </h2>
            </div>
            <Link
              href="/coordinator/at-risk"
              className="text-xs text-red-700 hover:text-red-900 font-bold flex items-center gap-1"
            >
              <span>{isBangla ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs">
            {data?.students_requiring_attention?.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 bg-[#F0FDFA] text-[#0284C7] rounded-full flex items-center justify-center mx-auto border border-[#CCFBF1]">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#0F172A] font-heading">
                  {isBangla ? 'কোনো শিক্ষার্থী ঝুঁকিপূর্ণ নয়' : 'No Students Flagged At-Risk'}
                </p>
                <p className="text-[11px] text-[#475569] max-w-xs mx-auto">
                  {isBangla
                    ? 'টানা ৩ দিন অনুপস্থিত বা রেটিং ২.০ এর নিচে হওয়া শিক্ষার্থী এখানে প্রদর্শিত হবে।'
                    : 'Students with 3+ consecutive absences or rating <= 2.0 appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.students_requiring_attention?.slice(0, 5).map((st) => (
                  <div
                    key={st.student_id}
                    className="p-3 bg-red-50/40 border border-red-200/70 rounded-xl space-y-1.5 hover:bg-red-50/70 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {st.student_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#475569]">
                        {st.student_id_number}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#475569]">
                      <span>{st.batch_name}</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {st.consecutive_absences >= 3 && (
                          <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                            {d(st.consecutive_absences)} {isBangla ? 'দিন অনুপস্থিত' : 'days streak'}
                          </span>
                        )}
                        {st.average_rating && st.average_rating <= 2.0 && (
                          <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-[#C1982E] fill-[#C1982E]" />
                            <span>{d(safeFixed(st.average_rating))}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {st.phone && (
                      <p className="text-[11px] text-[#475569] font-mono flex items-center gap-1 pt-0.5">
                        <Phone className="w-3 h-3 text-[#94A3B8]" />
                        <span>{st.phone}</span>
                      </p>
                    )}
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
