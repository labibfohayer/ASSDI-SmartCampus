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
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-[#B45309]" />
            <span>{isBangla ? 'ব্যাচ ও শিক্ষক বিশ্লেষণ' : 'Batch & Faculty Analytics'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'সক্রিয় ব্যাচ ও শিক্ষক পারফরম্যান্স ড্যাশবোর্ড' : 'Batches & Faculty Performance'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-xl">
            {isBangla
              ? 'সক্রিয় ব্যাচসমূহের উপস্থিতি, লার্নিং আউটকাম এবং শিক্ষকদের পারফরম্যান্স রেটিং পর্যালোচনা করুন।'
              : 'Review batch progress metrics and faculty effectiveness ratings.'}
          </p>
        </div>
      </div>

      {/* Batches Cards Grid */}
      <div>
        <h2 className="text-base font-bold text-[#0F172A] font-heading mb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#B45309]" />
          <span>{isBangla ? 'সক্রিয় ব্যাচ পারফরম্যান্স কার্ড' : 'Active Batch Performance'}</span>
        </h2>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#475569]">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.batch_wise_performance?.map((b: any) => (
              <div
                key={b.batch_id}
                className="bg-white p-6 rounded-xl border border-[#E2E8F0] hover:border-[#B45309]/40 transition shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A] font-heading">{b.batch_name}</h3>
                    <p className="text-xs text-[#B45309] font-medium">SBMC</p>
                  </div>
                  <span className="px-2 py-0.5 bg-[#F0FDFA] text-[#0369A1] text-[10px] font-bold rounded-full border border-[#CCFBF1]">
                    {isBangla ? 'সক্রিয়' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
                    <p className="text-[#475569] font-medium">{isBangla ? 'মোট শিক্ষার্থী' : 'Enrolled'}</p>
                    <h4 className="text-base font-bold text-[#0F172A] font-heading mt-0.5">
                      {d(b.student_count)} {isBangla ? 'জন' : ''}
                    </h4>
                  </div>

                  <div className="bg-[#F0FDFA] border border-[#CCFBF1] p-3 rounded-lg">
                    <p className="text-[#0369A1] font-medium">{isBangla ? 'উপস্থিতির হার' : 'Attendance'}</p>
                    <h4 className="text-base font-bold text-[#0369A1] font-heading mt-0.5">
                      {d(safeFixed(b.attendance_percentage))}%
                    </h4>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-amber-700 font-medium">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning'}</p>
                    <h4 className="text-base font-bold text-amber-800 font-heading mt-0.5">
                      {d(safeFixed(b.learning_percentage))}%
                    </h4>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
                    <p className="text-[#475569] font-medium">{isBangla ? 'গড় রেটিং' : 'Rating'}</p>
                    <h4 className="text-base font-bold text-[#0F172A] font-heading mt-0.5 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#C1982E] text-[#C1982E] inline" />
                      <span>{d(safeFixed(b.average_rating))}</span>
                    </h4>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/reports?batch=${b.batch_id}`}
                    className="w-full py-2 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition border border-[#FCD34D]"
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
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="text-base font-bold text-[#0F172A] font-heading flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#B45309]" />
            <span>{isBangla ? 'শিক্ষক ও প্রশিক্ষক পারফরম্যান্স সামারি' : 'Faculty Effectiveness Summary'}</span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            {isBangla
              ? 'ক্লাস সংখ্যা, ক্লাসে শিক্ষার্থীর উপস্থিতির হার এবং শিক্ষার্থী ফিডব্যাকের গড় রেটিং।'
              : 'Number of sessions conducted, student attendance %, and satisfaction rating.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{isBangla ? 'শিক্ষকের নাম' : 'Faculty Name'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'ক্লাস সংখ্যা' : 'Sessions Conducted'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'গড় উপস্থিতি' : 'Class Attendance %'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'লার্নিং প্রগ্রেস' : 'Learning Progress %'}</th>
                <th className="py-3.5 px-4">{isBangla ? 'শিক্ষার্থী সন্তুষ্টি রেটিং' : 'Student Rating'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {data?.teacher_wise_performance?.map((tItem: any) => (
                <tr key={tItem.teacher_id} className="hover:bg-[#F0FDFA] transition">
                  <td className="py-3 px-4 font-bold text-[#0F172A] font-heading">{tItem.teacher_name}</td>
                  <td className="py-3 px-4 text-[#475569] font-mono">
                    {d(tItem.sessions_taken)} {isBangla ? 'টি' : ''}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#B45309]">
                    {d(safeFixed(tItem.attendance_percentage))}%
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-700">
                    {d(safeFixed(tItem.learning_percentage))}%
                  </td>
                  <td className="py-3 px-4 text-[#0F172A] font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#C1982E] fill-[#C1982E]" />
                      <span>{d(safeFixed(tItem.average_rating))} / ৫</span>
                    </span>
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
