'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Users,
  GraduationCap,
  Star,
  CheckSquare,
  ArrowRight,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CoordinatorBatchesPage() {
  const { t, d, isBangla } = useLanguage();
  const safeFixed = (val: any, fallback = '0.0') =>
    typeof val === 'number' && !isNaN(val) ? val.toFixed(1) : fallback;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        const res = await api.get('/api/v1/analytics/coordinator-dashboard/');
        setData(res.data?.data || res.data);
      } catch (err) {
        console.error('Failed to load batch data:', err);
        toast.error(isBangla ? 'ব্যাচ ও শিক্ষক ডাটা লোড করা যায়নি' : 'Failed to load faculty data');
      } finally {
        setLoading(false);
      }
    };
    fetchBatchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0B2A21] p-6 sm:p-7 rounded-2xl border border-[#071F18] text-white shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#164E3D_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/15 border border-[#C5A059]/35 rounded-full text-xs font-semibold text-[#E5C378] mb-2.5">
            <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{isBangla ? 'ব্যাচ ও শিক্ষক বিশ্লেষণ' : 'Batch & Faculty Analytics'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {isBangla ? 'সক্রিয় ব্যাচ ও শিক্ষক পারফরম্যান্স ড্যাশবোর্ড' : 'Batches & Faculty Performance'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
            {isBangla
              ? 'সক্রিয় ব্যাচসমূহের উপস্থিতি, লার্নিং আউটকাম এবং শিক্ষকদের পারফরম্যান্স রেটিং পর্যালোচনা করুন।'
              : 'Review batch progress metrics and faculty effectiveness ratings.'}
          </p>
        </div>
      </div>

      {/* Batches Cards Grid */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-800" />
          <span>{isBangla ? 'সক্রিয় ব্যাচ পারফরম্যান্স কার্ড' : 'Active Batch Performance'}</span>
        </h2>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.batch_wise_performance?.map((b: any) => (
              <div
                key={b.batch_id}
                className="bg-white p-6 rounded-2xl border border-emerald-100 hover:border-emerald-300 transition shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{b.batch_name}</h3>
                    <p className="text-xs text-emerald-700 font-medium">SBMC</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                    {isBangla ? 'সক্রিয়' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-gray-500 font-medium">{isBangla ? 'মোট শিক্ষার্থী' : 'Enrolled'}</p>
                    <h4 className="text-base font-bold text-gray-900 mt-0.5">
                      {d(b.student_count)} {isBangla ? 'জন' : ''}
                    </h4>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <p className="text-emerald-700 font-medium">{isBangla ? 'উপস্থিতির হার' : 'Attendance'}</p>
                    <h4 className="text-base font-bold text-emerald-800 mt-0.5">
                      {d(safeFixed(b.attendance_percentage))}%
                    </h4>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl">
                    <p className="text-amber-700 font-medium">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning'}</p>
                    <h4 className="text-base font-bold text-amber-800 mt-0.5">
                      {d(safeFixed(b.learning_percentage))}%
                    </h4>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-xl">
                    <p className="text-purple-700 font-medium">{isBangla ? 'গড় রেটিং' : 'Rating'}</p>
                    <h4 className="text-base font-bold text-purple-800 mt-0.5 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline" />
                      <span>{d(safeFixed(b.average_rating))}</span>
                    </h4>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/reports?batch=${b.batch_id}`}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>{isBangla ? 'ব্যাচ রিপোর্ট ও এক্সপোর্ট' : 'View Batch Report'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teachers / Faculty Performance Table */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-800" />
            <span>{isBangla ? 'শিক্ষক ও প্রশিক্ষক পারফরম্যান্স সামারি' : 'Faculty Effectiveness Summary'}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isBangla
              ? 'ক্লাস সংখ্যা, ক্লাসে শিক্ষার্থীর উপস্থিতির হার এবং শিক্ষার্থী ফিডব্যাকের গড় রেটিং।'
              : 'Number of sessions conducted, student attendance %, and satisfaction rating.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{isBangla ? 'শিক্ষকের নাম' : 'Faculty Name'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'ক্লাস সংখ্যা' : 'Sessions Conducted'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'গড় উপস্থিতি' : 'Class Attendance %'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning Progress %'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'শিক্ষার্থী সন্তুষ্টি রেটিং' : 'Student Rating'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.teacher_wise_performance?.map((tItem: any) => (
                <tr key={tItem.teacher_id} className="hover:bg-emerald-50/30 transition">
                  <td className="py-3 px-4 font-bold text-gray-900">{tItem.teacher_name}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">
                    {d(tItem.sessions_taken)} {isBangla ? 'টি' : ''}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-800">
                    {d(safeFixed(tItem.attendance_percentage))}%
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-700">
                    {d(safeFixed(tItem.learning_percentage))}%
                  </td>
                  <td className="py-3 px-4 text-gray-900 font-semibold">
                    ⭐ {d(safeFixed(tItem.average_rating))} / ৫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
