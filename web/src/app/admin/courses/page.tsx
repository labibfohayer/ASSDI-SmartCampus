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
  Trash2,
  RefreshCw,
  GraduationCap,
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

  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [teacherToDelete, setTeacherToDelete] = useState<any | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState(false);

  const handleRemoveTeacherAssignment = async () => {
    if (!teacherToDelete) return;
    setDeletingTeacher(true);
    try {
      await api.delete(`/api/v1/teacher-assignments/${teacherToDelete.id}/`);
      toast.success(
        isBangla
          ? `${teacherToDelete.teacher_name}-কে উক্ত ব্যাচ ও বিষয় থেকে সফলভাবে রিমুভ করা হয়েছে।`
          : `Teacher ${teacherToDelete.teacher_name} unassigned successfully.`
      );
      setTeacherToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to remove teacher assignment:', err);
      toast.error(isBangla ? 'শিক্ষক অপসরণ ব্যর্থ হয়েছে।' : 'Failed to unassign teacher.');
    } finally {
      setDeletingTeacher(false);
    }
  };

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

  const filteredTeachers = teachers.filter((t) => {
    if (selectedBatchFilter === 'all') return true;
    return String(t.batch) === selectedBatchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'একাডেমিক কারিকুলাম কন্ট্রোল' : 'Curriculum Governance'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'কোর্স, ব্যাচ ও কারিকুলাম প্রশাসন' : 'Courses, Batches & Curriculum'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-xl">
            {isBangla
              ? 'ইনস্টিটিউটের কোর্স কারিকুলাম, সক্রিয় ব্যাচ এবং শিক্ষক নিয়োগের সেন্ট্রাল কনফিগারেশন।'
              : 'Configure institute courses, active academic batches, and teacher assignments.'}
          </p>
        </div>

        <button
          onClick={() => setShowBatchModal(true)}
          className="px-4 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer relative z-10 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-white" />
          <span>{isBangla ? 'নতুন ব্যাচ তৈরি করুন' : 'Create New Batch'}</span>
        </button>
      </div>

      {/* Courses Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0F766E]" />
          <span>{isBangla ? 'কোর্স কারিকুলাম ও বিবরণ' : 'Active Course Offerings'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-gradient-to-br from-[#F0FDFA] to-white border border-[#CCFBF1] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-[#0F766E] text-white text-[10px] font-bold rounded-full uppercase">
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#0F766E] font-bold">
                <span>{isBangla ? 'সক্রিয় বিষয় সংখ্যা:' : 'Total Subjects:'} {d(c.subjects_count || 8)} টি</span>
                <span>{isBangla ? 'ক্যাম্পাস:' : 'Campus:'} {c.campus_name || 'Kazi Bari'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batches Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0F766E]" />
              <span>{isBangla ? 'ব্যাচ তালিকা ও স্ট্যাটাস' : 'Academic Batches Directory'}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBangla
                ? 'কোর্সের চলমান ও ভবিষ্যৎ ব্যাচের সময়সূচি ও আসন সংখ্যা।'
                : 'Timeline, start/end dates, and student capacity for all batches.'}
            </p>
          </div>
          <span className="text-xs font-bold text-[#0369A1] px-3 py-1 bg-[#F0FDFA] rounded-full border border-[#CCFBF1]">
            {d(batches.length)} {isBangla ? 'টি ব্যাচ' : 'Batches'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
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
                <tr key={b.id} className="hover:bg-[#F0FDFA]/50 transition">
                  <td className="py-3.5 px-4 font-bold font-mono text-[#0F766E]">
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
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] text-[10px] font-bold">
                      {b.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Assignments & Faculty Governance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#0F766E]" />
              <span>{isBangla ? 'শিক্ষক নিয়োগ ও অনুষদ ব্যবস্থাপনা' : 'Teacher Assignments & Faculty Roster'}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBangla
                ? 'বিষয়ভিত্তিক শিক্ষক অ্যাসাইনমেন্ট পর্যালোচনা ও শিক্ষক রিমুভ / পরিবর্তনের নিয়ন্ত্রণ।'
                : 'Manage faculty assignments per batch and revoke or remove teachers.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="all" className="bg-white text-[#0F172A]">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id.toString()} className="bg-white text-[#0F172A]">
                  {b.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-[#0369A1] px-3 py-1 bg-[#F0FDFA] rounded-full border border-[#CCFBF1] shrink-0">
              {d(filteredTeachers.length)} {isBangla ? 'টি নিয়োগ' : 'Assignments'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{isBangla ? 'শিক্ষকের নাম' : 'Teacher Name'}</th>
                <th className="py-3 px-4">{isBangla ? 'লগইন আইডি' : 'Login ID'}</th>
                <th className="py-3 px-4">{isBangla ? 'বিষয়' : 'Subject'}</th>
                <th className="py-3 px-4">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                <th className="py-3 px-4">{isBangla ? 'ভূমিকা' : 'Role'}</th>
                <th className="py-3 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    {isBangla ? 'কোনো শিক্ষক নিয়োগ পাওয়া যায়নি।' : 'No teacher assignments found.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((ta) => (
                  <tr key={ta.id} className="hover:bg-[#F0FDFA]/50 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0284C7] font-extrabold flex items-center justify-center text-xs shrink-0">
                        {ta.teacher_name?.charAt(0) || 'T'}
                      </div>
                      <span>{ta.teacher_name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {ta.teacher_login_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F766E]">
                      {ta.subject_name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-800 font-medium">
                      {ta.batch_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] text-[10px] font-bold">
                        {ta.is_primary ? (isBangla ? 'প্রধান শিক্ষক' : 'Primary') : (isBangla ? 'সহকারী' : 'Associate')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setTeacherToDelete(ta)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                        title={isBangla ? 'শিক্ষক অ্যাসাইনমেন্ট অপসরণ / রিমুভ করুন' : 'Remove Teacher Assignment'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'রিমুভ' : 'Remove'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Assignment Deletion Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 border-t-4 border-t-rose-600 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  {isBangla ? 'শিক্ষক নিয়োগ অপসরণ নিশ্চিত করুন' : 'Confirm Teacher Removal'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {teacherToDelete.teacher_name} ({teacherToDelete.teacher_login_id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBangla
                ? `আপনি কি নিশ্চিত যে ${teacherToDelete.teacher_name}-কে "${teacherToDelete.batch_name}" ব্যাচের "${teacherToDelete.subject_name}" বিষয় থেকে অপসরণ / রিমুভ করতে চান?`
                : `Are you sure you want to remove ${teacherToDelete.teacher_name} from ${teacherToDelete.batch_name} for ${teacherToDelete.subject_name}?`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRemoveTeacherAssignment}
                disabled={deletingTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingTeacher ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                )}
                <span>
                  {deletingTeacher
                    ? isBangla
                      ? 'অপসরণ হচ্ছে...'
                      : 'Removing...'
                    : isBangla
                    ? 'হ্যাঁ, রিমুভ করুন'
                    : 'Confirm Remove'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#0F766E]" />
                <span>{isBangla ? 'নতুন ব্যাচ তৈরি করুন' : 'Create New Batch'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
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
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
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
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
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
