'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  FileText,
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
  const isObserver = user?.role === 'observer';

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
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-[#12382C] via-[#1B4D3E] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t('brand.course')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isBangla ? 'কোঅর্ডিনেশন ও ম্যানেজমেন্ট অ্যানালিটিক্স' : 'Academic & Management Analytics'}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1">
              {isBangla
                ? 'রিয়েল-টাইম উপস্থিতি হার, লার্নিং প্রগ্রেস, ব্যাচভিত্তিক পারফরম্যান্স ও অ্যাট-রিস্ক অ্যালার্ট।'
                : 'Real-time metrics for student attendance, learning progress, batch comparisons, and student alerts.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData();
              }}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-md flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>

            <Link
              href="/reports"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{isBangla ? 'রিপোর্ট হাব ও এক্সপোর্ট' : 'SRS Reports Hub'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Filter className="w-4 h-4 text-emerald-700" />
          <span>{isBangla ? 'ফিল্টার কন্ট্রোল:' : 'Filter Analytics:'}</span>
        </div>

        {/* Batch Dropdown */}
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="">{isBangla ? 'সকল সক্রিয় ব্যাচ' : 'All Active Batches'}</option>
          {data?.batch_wise_performance?.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.batch_name}
            </option>
          ))}
        </select>

        {/* Date From */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span>{isBangla ? 'তারিখ হতে:' : 'From:'}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span>{isBangla ? 'পর্যন্ত:' : 'To:'}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Submit & Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#153E32] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            {isBangla ? 'ফিল্টার প্রয়োগ' : 'Apply Filter'}
          </button>
          {(selectedBatch || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {isBangla ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>
      </form>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isBangla ? 'সক্রিয় শিক্ষার্থী' : 'Enrolled Students'}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {d(data?.total_students || 0)} {isBangla ? 'জন' : ''}
            </h3>
          </div>
        </div>

        {/* Overall Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isBangla ? 'সামগ্রিক উপস্থিতি' : 'Overall Attendance'}</p>
            <h3 className="text-2xl font-bold text-blue-800 mt-0.5">
              {d(safeFixed(data?.overall_attendance_percentage))}%
            </h3>
          </div>
        </div>

        {/* Learning Progress */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isBangla ? 'সার্বিক লার্নিং প্রগ্রেস' : 'Learning Progress'}</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-0.5">
              {d(safeFixed(data?.overall_learning_progress?.average_percentage))}%
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({d(safeFixed(data?.overall_learning_progress?.average_rating))} / ৫)
              </span>
            </h3>
          </div>
        </div>

        {/* At-Risk Alert */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isBangla ? 'ঝুঁকিপূর্ণ শিক্ষার্থী' : 'Students Requiring Attention'}</p>
            <h3 className="text-2xl font-bold text-red-600 mt-0.5">
              {d(data?.students_requiring_attention_count || 0)} {isBangla ? 'জন' : ''}
            </h3>
          </div>
        </div>
      </div>

      {/* Second Row: Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium">{isBangla ? 'সক্রিয় ব্যাচ' : 'Active Batches'}</p>
          <h4 className="text-lg font-bold text-gray-800 mt-1">{d(data?.total_active_batches || 0)} টি</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium">{isBangla ? 'শিক্ষক / ট্রেইনার' : 'Active Faculty'}</p>
          <h4 className="text-lg font-bold text-gray-800 mt-1">{d(data?.total_teachers || 0)} জন</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium">{isBangla ? 'আজকের ক্লাস' : "Today's Classes"}</p>
          <h4 className="text-lg font-bold text-gray-800 mt-1">{d(data?.todays_classes || 0)} টি</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-[11px] text-gray-500 font-medium">{isBangla ? 'অমীমাংসিত হেল্প রিকোয়েস্ট' : 'Pending Help Requests'}</p>
          <h4 className="text-lg font-bold text-amber-600 mt-1">
            {d(data?.pending_help_requests || 0)} / {d(data?.total_help_requests || 0)}
          </h4>
        </div>
      </div>

      {/* Main Grid: Comparative Chart & At-Risk Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Batch Comparison Chart & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recharts Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {isBangla ? 'ব্যাচভিত্তিক উপস্থিতি বনাম লার্নিং প্রগ্রেস' : 'Batch Attendance vs Learning Progress'}
                </h2>
                <p className="text-xs text-gray-500">
                  {isBangla
                    ? 'প্রতিটি ব্যাচের উপস্থিতির হার (%) এবং গড় লার্নিং প্রগ্রেসের তুলনামূলক গ্রাফ'
                    : 'Comparative bar chart of attendance % vs learning progress %'}
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin" />
                </div>
              ) : batchChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  {isBangla ? 'কোনো ব্যাচ ডাটা পাওয়া যায়নি।' : 'No batch data available.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, '']}
                      contentStyle={{
                        borderRadius: '12px',
                        backgroundColor: '#1B4D3E',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="attendance"
                      name={isBangla ? 'উপস্থিতি %' : 'Attendance %'}
                      fill="#2D6A4F"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="learning"
                      name={isBangla ? 'লার্নিং প্রগ্রেস %' : 'Learning Progress %'}
                      fill="#C5A059"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Batch Performance Table */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {isBangla ? 'ব্যাচভিত্তিক পারফরম্যান্স সামারি' : 'Batch Performance Summary'}
              </h3>
              <Link
                href="/coordinator/batches"
                className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1"
              >
                <span>{isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                    <th className="py-3 px-4">{isBangla ? 'শিক্ষার্থী' : 'Students'}</th>
                    <th className="py-3 px-4">{isBangla ? 'উপস্থিতির হার' : 'Attendance %'}</th>
                    <th className="py-3 px-4">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning %'}</th>
                    <th className="py-3 px-4">{isBangla ? 'গড় রেটিং' : 'Rating'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.batch_wise_performance?.map((b) => (
                    <tr key={b.batch_id} className="hover:bg-emerald-50/30 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">{b.batch_name}</td>
                      <td className="py-3 px-4 text-gray-600">{d(b.student_count)} জন</td>
                      <td className="py-3 px-4 font-bold text-emerald-800">
                        {d(safeFixed(b.attendance_percentage))}%
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-700">
                        {d(safeFixed(b.learning_percentage))}%
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        ⭐ {d(safeFixed(b.average_rating))}
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
              <h2 className="text-base font-bold text-gray-900">
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

          <div className="bg-white rounded-2xl border border-red-100 p-4 space-y-3 shadow-xs">
            {isObserver ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center mx-auto">
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">
                  {isBangla ? 'পর্যবেক্ষক মোড: ব্যক্তিগত নাম গোপন' : 'Observer Mode: Names Redacted'}
                </h4>
                <p className="text-[11px] text-gray-500">
                  {isBangla
                    ? `বর্তমানে মোট ${d(data?.students_requiring_attention_count || 0)} জন শিক্ষার্থী ঝুঁকিপূর্ণ হিসেবে চিহ্নিত।`
                    : `Currently ${data?.students_requiring_attention_count || 0} students are flagged as at-risk.`}
                </p>
              </div>
            ) : data?.students_requiring_attention?.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-700">
                  {isBangla ? 'কোনো শিক্ষার্থী ঝুঁকিপূর্ণ নয়' : 'No Students Flagged At-Risk'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {isBangla
                    ? 'টানা ৩ দিন অনুপস্থিত বা রেটিং $\\le$ ২.০ হওয়া শিক্ষার্থী এখানে সতর্কবার্তা হিসেবে প্রদর্শিত হবে।'
                    : 'Students with 3+ consecutive absences or rating <= 2.0 appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.students_requiring_attention?.slice(0, 5).map((st) => (
                  <div
                    key={st.student_id}
                    className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">
                        {st.student_name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {st.student_id_number}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                      <span>{st.batch_name}</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {st.consecutive_absences >= 3 && (
                          <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                            {d(st.consecutive_absences)} {isBangla ? 'দিন অনুপস্থিত' : 'days streak'}
                          </span>
                        )}
                        {st.average_rating && st.average_rating <= 2.0 && (
                          <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                            ⭐ {d(safeFixed(st.average_rating))}
                          </span>
                        )}
                      </div>
                    </div>

                    {st.phone && (
                      <p className="text-[11px] text-gray-500 font-mono">
                        📞 {st.phone}
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
