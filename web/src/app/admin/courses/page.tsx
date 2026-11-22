'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  BookOpen,
  PlusCircle,
  X,
  Users,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminCoursesPage() {
  const { t, d, isBangla } = useLanguage();

  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchForm, setBatchForm] = useState({
    name: '',
    batch_number: '',
    course_id: '',
    campus_id: '1',
    start_date: '',
    end_date: '',
    capacity: '40',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, batchesRes, teachersRes] = await Promise.all([
        api.get('/api/v1/courses/'),
        api.get('/api/v1/batches/'),
        api.get('/api/v1/teacher-assignments/').catch(() => ({ data: [] })),
      ]);

      const courseList = Array.isArray(coursesRes.data)
        ? coursesRes.data
        : coursesRes.data?.results || [];
      const batchList = Array.isArray(batchesRes.data)
        ? batchesRes.data
        : batchesRes.data?.results || [];
      const teacherList = Array.isArray(teachersRes.data)
        ? teachersRes.data
        : teachersRes.data?.results || [];

      setCourses(courseList);
      setBatches(batchList);
      setTeachers(teacherList);

      if (courseList.length > 0 && !batchForm.course_id) {
        setBatchForm((prev) => ({ ...prev, course_id: String(courseList[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load courses & batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: batchForm.name.trim(),
        batch_number: Number(batchForm.batch_number),
        course: Number(batchForm.course_id),
        campus: Number(batchForm.campus_id),
        start_date: batchForm.start_date,
        end_date: batchForm.end_date,
        capacity: Number(batchForm.capacity),
        status: 'active',
      };

      await api.post('/api/v1/batches/', payload);
      toast.success(isBangla ? 'নতুন ব্যাচ সফলভাবে খোলা হয়েছে!' : 'New batch created successfully!');
      setShowBatchModal(false);
      setBatchForm({
        name: '',
        batch_number: '',
        course_id: courses[0]?.id ? String(courses[0].id) : '',
        campus_id: '1',
        start_date: '',
        end_date: '',
        capacity: '40',
      });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to create batch';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-700" />
            <span>{isBangla ? 'কোর্স, ব্যাচ ও কারিকুলাম প্রশাসন' : 'Courses, Batches & Curriculum'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isBangla
              ? 'ইনস্টিটিউটের কোর্স কারিকুলাম, সক্রিয় ব্যাচ এবং শিক্ষক নিয়োগের সেন্ট্রাল কনফিগারেশন।'
              : 'Configure institute courses, active academic batches, and teacher assignments.'}
          </p>
        </div>

        <button
          onClick={() => setShowBatchModal(true)}
          className="px-4 py-2.5 bg-[#1B4D3E] hover:bg-[#153E32] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isBangla ? 'নতুন ব্যাচ তৈরি করুন' : 'Create New Batch'}</span>
        </button>
      </div>

      {/* Courses Overview */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-800" />
          <span>{isBangla ? 'কোর্স কারিকুলাম ও বিবরণ' : 'Active Course Offerings'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase">
                  {c.code || 'SBMC'}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {isBangla ? 'মেয়াদ:' : 'Duration:'} {d(c.duration_months || 3)} {isBangla ? 'মাস' : 'Months'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {c.description || (isBangla
                    ? 'ক্ষুদ্র ব্যবসা পরিচালনা, হিসাবরক্ষণ, অফিস ম্যানেজমেন্ট এবং মার্কেটিং বিষয়ক পূর্ণাঙ্গ স্কিল কোর্স।'
                    : 'Comprehensive entrepreneurship, office management, and small business operations.')}
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
                <span>{isBangla ? 'সক্রিয় বিষয় সংখ্যা:' : 'Total Subjects:'} {d(c.subjects_count || 8)} টি</span>
                <span>{isBangla ? 'ক্যাম্পাস:' : 'Campus:'} {c.campus_name || 'Kazi Bari'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batches Management */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-800" />
              <span>{isBangla ? 'ব্যাচ তালিকা ও স্ট্যাটাস' : 'Academic Batches Directory'}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBangla
                ? 'কোর্সের চলমান ও ভবিষ্যৎ ব্যাচের সময়সূচি ও আসন সংখ্যা।'
                : 'Timeline, start/end dates, and student capacity for all batches.'}
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
            {d(batches.length)} {isBangla ? 'টি ব্যাচ' : 'Batches'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{isBangla ? 'ব্যাচ নম্বর' : 'Batch No'}</th>
                <th className="py-3 px-4">{isBangla ? 'ব্যাচের নাম' : 'Batch Name'}</th>
                <th className="py-3 px-4">{isBangla ? 'শুরুর তারিখ' : 'Start Date'}</th>
                <th className="py-3 px-4">{isBangla ? 'সমাপ্তির তারিখ' : 'End Date'}</th>
                <th className="py-3 px-4">{isBangla ? 'আসন ক্ষমতা' : 'Capacity'}</th>
                <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-emerald-50/30 transition">
                  <td className="py-3.5 px-4 font-bold font-mono text-emerald-800">
                    #{b.batch_number}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    {b.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">
                    {d(b.start_date)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">
                    {d(b.end_date)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-700">
                    {d(b.capacity || 40)} {isBangla ? 'জন' : 'seats'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {b.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 border-t-4 border-t-[#1B4D3E] space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <span>{isBangla ? 'নতুন ব্যাচ তৈরি করুন' : 'Create New Batch'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'কোর্স নির্বাচন *' : 'Select Course *'}
                </label>
                <select
                  value={batchForm.course_id}
                  onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'ব্যাচ নম্বর *' : 'Batch Number *'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="44"
                    value={batchForm.batch_number}
                    onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'আসন সংখ্যা' : 'Capacity'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="40"
                    value={batchForm.capacity}
                    onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'ব্যাচের পূর্ণ নাম *' : 'Batch Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="SBMC Batch 44 (Morning)"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'শুরুর তারিখ *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={batchForm.start_date}
                    onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'সমাপ্তির তারিখ *' : 'End Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={batchForm.end_date}
                    onChange={(e) => setBatchForm({ ...batchForm, end_date: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#153E32] text-white font-bold rounded-xl shadow-xs transition"
                >
                  {submitting ? (isBangla ? 'তৈরি হচ্ছে...' : 'Creating...') : (isBangla ? 'ব্যাচ তৈরি সম্পন্ন করুন' : 'Confirm Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
