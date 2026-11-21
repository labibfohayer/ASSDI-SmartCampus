'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  UserX,
  Phone,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CoordinatorAtRiskPage() {
  const { user } = useAuth();
  const { t, d, isBangla } = useLanguage();
  const isObserver = user?.role === 'observer';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'absence' | 'academic'>('all');

  useEffect(() => {
    const fetchAtRiskData = async () => {
      try {
        const res = await api.get('/api/v1/analytics/coordinator-dashboard/');
        setData(res.data?.data || res.data);
      } catch (err) {
        console.error('Failed to load at-risk list:', err);
        toast.error(isBangla ? 'অ্যাট-রিস্ক ডাটা লোড করা যায়নি' : 'Failed to load alert data');
      } finally {
        setLoading(false);
      }
    };
    fetchAtRiskData();
  }, []);

  const studentsList: any[] = data?.students_requiring_attention || [];

  const filteredStudents = studentsList.filter((st) => {
    const matchesSearch =
      st.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.student_id_number?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'absence') {
      return st.consecutive_absences >= 3 || st.total_absences >= 5;
    }
    if (filterType === 'academic') {
      return st.average_rating && st.average_rating <= 2.0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-red-100 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span>{isBangla ? 'ঝুঁকিপূর্ণ শিক্ষার্থী ও পুনরাবৃত্ত অনুপস্থিতি অ্যালার্ট' : 'At-Risk & Repeated Absence Alerts'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isBangla
              ? 'টানা ৩ দিন বা মোট ৫ দিন অনুপস্থিত এবং গড় বোঝাপড়ার রেটিং ২.০ বা তার নিচে থাকা শিক্ষার্থীদের প্রাথমিক হস্তক্ষেপ তালিকা।'
              : 'Early warning list for students with 3+ consecutive absences, 5+ total absences, or rating <= 2.0.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-red-100 text-red-800 text-xs font-bold rounded-xl border border-red-200">
            {isBangla ? 'চিহ্নিত শিক্ষার্থী:' : 'Flagged Students:'} {d(data?.students_requiring_attention_count || 0)} {isBangla ? 'জন' : ''}
          </span>
        </div>
      </div>

      {/* Observer Mode Notice */}
      {isObserver && (
        <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl text-center space-y-2">
          <Eye className="w-10 h-10 text-purple-600 mx-auto" />
          <h3 className="text-base font-bold text-purple-950">
            {isBangla ? 'পর্যবেক্ষক মোড সক্রিয় (ব্যক্তিগত তথ্য সংরক্ষিত)' : 'Observer Mode Active (Data Protected)'}
          </h3>
          <p className="text-xs text-purple-800 max-w-md mx-auto leading-relaxed">
            {isBangla
              ? `নীতিমালা অনুযায়ী পর্যবেক্ষকদের কাছে শিক্ষার্থীদের ব্যক্তিগত নাম, ফোন নম্বর ও রোল গোপন রাখা হয়েছে। বর্তমানে মোট ${d(data?.students_requiring_attention_count || 0)} জন শিক্ষার্থী ঝুঁকিপূর্ণ হিসেবে চিহ্নিত।`
              : `Per institutional privacy rules, personal contact data and names are hidden for observer accounts. Total ${data?.students_requiring_attention_count || 0} students are flagged.`}
          </p>
        </div>
      )}

      {/* Main Table for Non-Observers */}
      {!isObserver && (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
          {/* Search & Filter Tabs */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isBangla ? 'শিক্ষার্থীর নাম বা আইডি দিয়ে খুঁজুন...' : 'Search by student name or ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
                }`}
              >
                {isBangla ? 'সকল অ্যালার্ট' : 'All Alerts'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('absence')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'absence' ? 'bg-red-600 text-white shadow-xs' : 'text-red-700'
                }`}
              >
                {isBangla ? 'অনুপস্থিতি সমস্যা' : 'Absence Streaks'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('academic')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'academic' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700'
                }`}
              >
                {isBangla ? 'কম বোঝাপড়া (রেটিং ≤ ২)' : 'Low Understanding'}
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">{t('common.loading')}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-gray-800">
                {isBangla ? 'এই ফিল্টারে কোনো ঝুঁকিপূর্ণ শিক্ষার্থী পাওয়া যায়নি।' : 'No flagged students found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isBangla ? 'রোল / আইডি' : 'Student ID'}</th>
                    <th className="py-3 px-4">{isBangla ? 'শিক্ষার্থীর নাম' : 'Student Name'}</th>
                    <th className="py-3 px-4">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                    <th className="py-3 px-4">{isBangla ? 'টানা অনুপস্থিতি' : 'Consecutive Absences'}</th>
                    <th className="py-3 px-4">{isBangla ? 'মোট অনুপস্থিতি' : 'Total Absences'}</th>
                    <th className="py-3 px-4">{isBangla ? 'গড় লার্নিং রেটিং' : 'Average Rating'}</th>
                    <th className="py-3 px-4">{isBangla ? 'যোগাযোগ নম্বর' : 'Phone'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((st) => (
                    <tr key={st.student_id} className="hover:bg-red-50/30 transition">
                      <td className="py-3 px-4 font-bold font-mono text-gray-800">
                        {st.student_id_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {st.student_name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {st.batch_name}
                      </td>
                      <td className="py-3 px-4">
                        {st.consecutive_absences >= 3 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                            ⚠️ {d(st.consecutive_absences)} {isBangla ? 'দিন' : 'days'}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono">{d(st.consecutive_absences)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {st.total_absences >= 5 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                            ⚠️ {d(st.total_absences)} {isBangla ? 'দিন' : 'days'}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono">{d(st.total_absences)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {st.average_rating && st.average_rating <= 2.0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            ⭐ {d(st.average_rating.toFixed(1))} / ৫
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {st.average_rating ? `⭐ ${d(st.average_rating.toFixed(1))}` : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {st.phone ? (
                          <a
                            href={`tel:${st.phone}`}
                            className="inline-flex items-center gap-1 text-emerald-800 font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{st.phone}</span>
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
