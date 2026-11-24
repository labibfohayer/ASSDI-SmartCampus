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
  UserPlus,
  UserMinus,
  ShieldAlert,
  Phone,
  Mail,
  BookMarked,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminCoursesPage() {
  const { t, d, isBangla } = useLanguage();

  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyTab, setFacultyTab] = useState<'roster' | 'assignments'>('roster');
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

  // Add teacher modal state
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    full_name: '',
    login_id: '',
    email: '',
    phone: '',
    password: 'TeacherPass2026!',
    initial_batch_id: '',
    initial_subject_id: '',
    is_primary: true,
  });

  // Assign teacher to batch modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [assignForm, setAssignForm] = useState({
    teacher_user: '',
    batch: '',
    subject: '',
    is_primary: true,
  });

  // Teacher deactivation modal state
  const [teacherToDeactivate, setTeacherToDeactivate] = useState<any | null>(null);
  const [deactivatingTeacher, setDeactivatingTeacher] = useState(false);

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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingTeacher(true);
    try {
      const payload: any = {
        full_name: teacherForm.full_name.trim(),
        login_id: teacherForm.login_id.trim(),
        password: teacherForm.password || 'TeacherPass2026!',
      };
      if (teacherForm.email.trim()) payload.email = teacherForm.email.trim();
      if (teacherForm.phone.trim()) payload.phone = teacherForm.phone.trim();
      if (teacherForm.initial_batch_id) payload.initial_batch_id = Number(teacherForm.initial_batch_id);
      if (teacherForm.initial_subject_id) payload.initial_subject_id = Number(teacherForm.initial_subject_id);
      payload.is_primary = teacherForm.is_primary;

      await api.post('/api/v1/teachers/', payload);
      toast.success(
        isBangla
          ? 'নতুন শিক্ষক সফলভাবে সিস্টেমে যুক্ত হয়েছেন!'
          : 'New faculty teacher added successfully!'
      );
      setShowAddTeacherModal(false);
      setTeacherForm({
        full_name: '',
        login_id: '',
        email: '',
        phone: '',
        password: 'TeacherPass2026!',
        initial_batch_id: '',
        initial_subject_id: '',
        is_primary: true,
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to create teacher:', err);
      const errData = err.response?.data;
      const msg =
        errData?.login_id?.[0] ||
        errData?.email?.[0] ||
        errData?.detail ||
        (isBangla ? 'শিক্ষক যোগ করতে সমস্যা হয়েছে।' : 'Failed to add teacher.');
      toast.error(msg);
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacher_user || !assignForm.batch || !assignForm.subject) {
      toast.error(isBangla ? 'অনুগ্রহ করে শিক্ষক, ব্যাচ ও বিষয় নির্বাচন করুন।' : 'Please select teacher, batch and subject.');
      return;
    }
    setAssigningTeacher(true);
    try {
      await api.post('/api/v1/teacher-assignments/', {
        teacher_user: assignForm.teacher_user,
        batch: Number(assignForm.batch),
        subject: Number(assignForm.subject),
        is_primary: assignForm.is_primary,
      });
      toast.success(
        isBangla
          ? 'শিক্ষক সফলভাবে ব্যাচ ও বিষয়ে নিয়োগপ্রাপ্ত হয়েছেন!'
          : 'Teacher assigned to batch successfully!'
      );
      setShowAssignModal(false);
      setAssignForm({
        teacher_user: '',
        batch: '',
        subject: '',
        is_primary: true,
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to assign teacher:', err);
      const errData = err.response?.data;
      const msg =
        errData?.non_field_errors?.[0] ||
        errData?.detail ||
        (isBangla ? 'শিক্ষক নিয়োগ করতে সমস্যা হয়েছে।' : 'Failed to assign teacher.');
      toast.error(msg);
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleDeactivateTeacher = async () => {
    if (!teacherToDeactivate) return;
    setDeactivatingTeacher(true);
    try {
      await api.delete(`/api/v1/teachers/${teacherToDeactivate.id}/`);
      toast.success(
        isBangla
          ? `${teacherToDeactivate.full_name}-কে শিক্ষক তালিকা থেকে সফলভাবে নিষ্ক্রিয় / অপসরণ করা হয়েছে।`
          : `Teacher ${teacherToDeactivate.full_name} deactivated successfully.`
      );
      setTeacherToDeactivate(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to deactivate teacher:', err);
      toast.error(isBangla ? 'শিক্ষক অপসরণ ব্যর্থ হয়েছে।' : 'Failed to deactivate teacher.');
    } finally {
      setDeactivatingTeacher(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, batchesRes, teachersRes, facultyRes, subjectsRes] = await Promise.all([
        api.get('/api/v1/courses/'),
        api.get('/api/v1/batches/'),
        api.get('/api/v1/teacher-assignments/').catch(() => ({ data: [] })),
        api.get('/api/v1/teachers/').catch(() => ({ data: [] })),
        api.get('/api/v1/subjects/').catch(() => ({ data: [] })),
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
      const facultyList = Array.isArray(facultyRes.data)
        ? facultyRes.data
        : facultyRes.data?.results || [];
      const subjectList = Array.isArray(subjectsRes.data)
        ? subjectsRes.data
        : subjectsRes.data?.results || [];

      setCourses(courseList);
      setBatches(batchList);
      setTeachers(teacherList);
      setFaculty(facultyList);
      setSubjects(subjectList);

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
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 font-heading">
              <GraduationCap className="w-5 h-5 text-[#0F766E]" />
              <span>{isBangla ? 'অনুষদ ও শিক্ষক ব্যবস্থাপনা' : 'Faculty Governance & Teacher Assignments'}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBangla
                ? 'ইনস্টিটিউটের নতুন শিক্ষক নিবন্ধন, ব্যাচে পাঠদান নিয়োগ এবং ফ্যাকাল্টি পরিচালনা।'
                : 'Register faculty teachers, assign to batch subjects, and manage roster.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="px-3.5 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-[#FCD34D]" />
              <span>{isBangla ? 'নতুন শিক্ষক যোগ করুন' : 'Add New Teacher'}</span>
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-[#D97706]" />
              <span>{isBangla ? 'ব্যাচে নিয়োগ দিন' : 'Assign to Batch'}</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher & Batch Filter */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFacultyTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                facultyTab === 'roster'
                  ? 'bg-white text-[#0F766E] shadow-2xs border border-[#CCFBF1]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isBangla ? 'অনুষদ সদস্য তালিকা' : 'Faculty Roster'}</span>
              <span className="ml-1.5 px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px]">
                {d(faculty.length)}
              </span>
            </button>
            <button
              onClick={() => setFacultyTab('assignments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                facultyTab === 'assignments'
                  ? 'bg-white text-[#0F766E] shadow-2xs border border-[#CCFBF1]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isBangla ? 'ব্যাচভিত্তিক নিয়োগ' : 'Batch Assignments'}</span>
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {d(filteredTeachers.length)}
              </span>
            </button>
          </div>

          {facultyTab === 'assignments' && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-slate-500">{isBangla ? 'ব্যাচ ফিল্টার:' : 'Filter Batch:'}</span>
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
            </div>
          )}
        </div>

        {/* Tab 1: Faculty Members Roster */}
        {facultyTab === 'roster' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'শিক্ষকের নাম' : 'Teacher Name'}</th>
                  <th className="py-3 px-4">{isBangla ? 'লগইন আইডি' : 'Login ID'}</th>
                  <th className="py-3 px-4">{isBangla ? 'যোগাযোগ' : 'Contact'}</th>
                  <th className="py-3 px-4">{isBangla ? 'বর্তমান নিয়োগ' : 'Active Assignments'}</th>
                  <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {faculty.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                      {isBangla ? 'কোনো শিক্ষক নিবন্ধিত পাওয়া যায়নি।' : 'No faculty members registered.'}
                    </td>
                  </tr>
                ) : (
                  faculty.map((f) => (
                    <tr key={f.id} className="hover:bg-[#F0FDFA]/50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-xs shrink-0 border border-teal-300">
                          {f.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-heading text-[#0F172A]">{f.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-normal">
                            {isBangla ? 'অনুষদ সদস্য' : 'Faculty Teacher'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-700 font-semibold">
                        {f.login_id}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          {f.phone && <span className="font-mono text-[11px]">{f.phone}</span>}
                          {f.email && <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{f.email}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {f.assignments && f.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {f.assignments.map((asg: any) => (
                              <span
                                key={asg.id}
                                className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] text-[10px] font-bold"
                              >
                                {asg.subject_name} ({asg.batch_name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {isBangla ? 'কোনো নিয়োগ নেই' : 'No assignments'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {f.is_active ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                            {isBangla ? 'সক্রিয়' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                            {isBangla ? 'নিষ্ক্রিয়' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAssignForm((prev) => ({ ...prev, teacher_user: f.id }));
                              setShowAssignModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-[#0F766E] hover:text-white text-[#0F766E] border border-teal-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                            title={isBangla ? 'এই শিক্ষককে নতুন ব্যাচে নিয়োগ দিন' : 'Assign to batch'}
                          >
                            <BookMarked className="w-3.5 h-3.5" />
                            <span>{isBangla ? 'নিয়োগ দিন' : 'Assign'}</span>
                          </button>
                          <button
                            onClick={() => setTeacherToDeactivate(f)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                            title={isBangla ? 'শিক্ষক অ্যাকাউন্ট অপসরণ / নিষ্ক্রিয় করুন' : 'Deactivate Teacher'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isBangla ? 'রিমুভ' : 'Remove'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Batch Assignments */}
        {facultyTab === 'assignments' && (
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
        )}
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

      {/* Add New Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#0F766E] space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] font-heading">
                    {isBangla ? 'নতুন শিক্ষক নিবন্ধন ও নিয়োগ' : 'Register New Faculty Teacher'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla ? 'শিক্ষক প্রোফাইল তৈরি ও ক্লাসরুম অ্যাকাউন্টে অন্তর্ভুক্তি' : 'Create faculty credentials and optional batch assignment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'শিক্ষকের পূর্ণ নাম *' : 'Teacher Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBangla ? 'যেমন: মোহাম্মদ মাসুদ রানা' : 'e.g. Mohammad Masud Rana'}
                  value={teacherForm.full_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoId = teacherForm.login_id
                      ? teacherForm.login_id
                      : `tch_${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
                    setTeacherForm({ ...teacherForm, full_name: name });
                  }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'লগইন আইডি / ব্যবহারকারী নাম *' : 'Login ID / Username *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="tch_masud01"
                    value={teacherForm.login_id}
                    onChange={(e) => setTeacherForm({ ...teacherForm, login_id: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'পাসওয়ার্ড *' : 'Initial Password *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Phone Number (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="01700000000"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'ইমেইল ঠিকানা (ঐচ্ছিক)' : 'Email Address (Optional)'}
                  </label>
                  <input
                    type="email"
                    placeholder="teacher@assdi.local"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Initial Assignment Section */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <span className="font-bold text-[#B45309] block text-[11px]">
                  {isBangla ? 'প্রাথমিক ব্যাচ ও বিষয় অ্যাসাইনমেন্ট (ঐচ্ছিক)' : 'Initial Batch & Subject Assignment (Optional)'}
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 text-[10px] mb-1">
                      {isBangla ? 'ব্যাচ নির্বাচন' : 'Assign to Batch'}
                    </label>
                    <select
                      value={teacherForm.initial_batch_id}
                      onChange={(e) => setTeacherForm({ ...teacherForm, initial_batch_id: e.target.value })}
                      className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[#0F172A] text-xs focus:outline-none"
                    >
                      <option value="">{isBangla ? 'পরবর্তীতে নির্ধারণ' : 'Assign Later'}</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-[10px] mb-1">
                      {isBangla ? 'বিষয় নির্বাচন' : 'Assign Subject'}
                    </label>
                    <select
                      value={teacherForm.initial_subject_id}
                      onChange={(e) => setTeacherForm({ ...teacherForm, initial_subject_id: e.target.value })}
                      className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[#0F172A] text-xs focus:outline-none"
                    >
                      <option value="">{isBangla ? 'বিষয় নির্বাচন করুন' : 'Select Subject'}</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={teacherForm.is_primary}
                    onChange={(e) => setTeacherForm({ ...teacherForm, is_primary: e.target.checked })}
                    className="accent-[#0F766E] rounded"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">
                    {isBangla ? 'প্রধান প্রশিক্ষক (Primary Faculty)' : 'Primary Faculty Lead'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addingTeacher}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {addingTeacher
                    ? isBangla
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBangla
                    ? 'শিক্ষক যুক্ত করুন'
                    : 'Confirm Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher to Batch Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B45309] border border-amber-200 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-[#D97706]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] font-heading">
                    {isBangla ? 'ব্যাচে শিক্ষক নিয়োগ' : 'Assign Faculty to Batch'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla ? 'নির্দিষ্ট ব্যাচে বিষয়ভিত্তিক শিক্ষক নির্ধারণ করুন' : 'Assign subject faculty for classroom sessions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'শিক্ষক নির্বাচন *' : 'Select Faculty Teacher *'}
                </label>
                <select
                  required
                  value={assignForm.teacher_user}
                  onChange={(e) => setAssignForm({ ...assignForm, teacher_user: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">{isBangla ? 'শিক্ষক বাছাই করুন...' : 'Select Teacher...'}</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.login_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'ব্যাচ নির্বাচন *' : 'Select Batch *'}
                </label>
                <select
                  required
                  value={assignForm.batch}
                  onChange={(e) => setAssignForm({ ...assignForm, batch: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">{isBangla ? 'ব্যাচ বাছাই করুন...' : 'Select Batch...'}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'বিষয় নির্বাচন *' : 'Select Subject *'}
                </label>
                <select
                  required
                  value={assignForm.subject}
                  onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">{isBangla ? 'বিষয় বাছাই করুন...' : 'Select Subject...'}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={assignForm.is_primary}
                  onChange={(e) => setAssignForm({ ...assignForm, is_primary: e.target.checked })}
                  className="accent-[#0F766E] rounded"
                />
                <span className="text-[11px] font-semibold text-slate-700">
                  {isBangla ? 'প্রধান প্রশিক্ষক (Primary Faculty)' : 'Designate as Primary Faculty'}
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={assigningTeacher}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {assigningTeacher
                    ? isBangla
                      ? 'নিয়োগ হচ্ছে...'
                      : 'Assigning...'
                    : isBangla
                    ? 'নিয়োগ চূড়ান্ত করুন'
                    : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Account Deactivation Modal */}
      {teacherToDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 border-t-4 border-t-rose-600 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  {isBangla ? 'শিক্ষক অপসরণ / নিষ্ক্রিয়করণ' : 'Deactivate Teacher Account'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {teacherToDeactivate.full_name} ({teacherToDeactivate.login_id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBangla
                ? `আপনি কি নিশ্চিত যে ${teacherToDeactivate.full_name}-কে অনুষদ তালিকা থেকে অপসরণ করতে চান? এর ফলে শিক্ষকের অ্যাকাউন্টে লগইন বন্ধ হবে এবং সকল ব্যাচ অ্যাসাইনমেন্ট বাতিল হবে।`
                : `Are you sure you want to deactivate ${teacherToDeactivate.full_name}? Their login will be blocked and all course assignments revoked.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeacherToDeactivate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeactivateTeacher}
                disabled={deactivatingTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deactivatingTeacher ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                )}
                <span>
                  {deactivatingTeacher
                    ? isBangla
                      ? 'অপসরণ হচ্ছে...'
                      : 'Deactivating...'
                    : isBangla
                    ? 'হ্যাঁ, শিক্ষক অপসরণ করুন'
                    : 'Confirm Deactivation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
