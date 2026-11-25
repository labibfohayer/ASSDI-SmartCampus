'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  BookOpen,
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Phone,
  Mail,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeacherAssignment {
  id: number;
  batch_id: number;
  batch_name: string;
  subject_id: number;
  subject_name: string;
  is_primary?: boolean;
}

interface TeacherItem {
  id: number;
  login_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  is_active: boolean;
  created_at: string;
  assignments_count: number;
  assignments: TeacherAssignment[];
}

interface BatchOption {
  id: number;
  name: string;
  course_name?: string;
}

interface SubjectOption {
  id: number;
  name: string;
  code?: string;
  course?: number;
}

export default function AdminTeachersPage() {
  const { isBangla, d } = useLanguage();

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add Teacher Modal
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Assign Subject & Batch Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [assignForm, setAssignForm] = useState({
    teacher_id: '',
    batch_id: '',
    subject_id: '',
    is_primary: true,
  });

  // Deactivate / Expel / Remove Teacher Modal
  const [teacherToDeactivate, setTeacherToDeactivate] = useState<TeacherItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const fetchTeachersAndMetadata = async () => {
    setLoading(true);
    try {
      const [teachersRes, batchesRes, subjectsRes] = await Promise.all([
        api.get('/api/v1/teachers/').catch(() => ({ data: [] })),
        api.get('/api/v1/batches/').catch(() => ({ data: [] })),
        api.get('/api/v1/subjects/').catch(() => ({ data: [] })),
      ]);

      const teachersList = Array.isArray(teachersRes.data)
        ? teachersRes.data
        : teachersRes.data?.results || [];
      const batchesList = Array.isArray(batchesRes.data)
        ? batchesRes.data
        : batchesRes.data?.results || [];
      const subjectsList = Array.isArray(subjectsRes.data)
        ? subjectsRes.data
        : subjectsRes.data?.results || [];

      setTeachers(teachersList);
      setBatches(batchesList);
      setSubjects(subjectsList);
    } catch (err) {
      console.error('Failed to load teachers:', err);
      toast.error(isBangla ? 'শিক্ষকদের তালিকা লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load teacher directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachersAndMetadata();
  }, []);

  // Handle Add New Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.full_name.trim() || !teacherForm.login_id.trim()) {
      toast.error(isBangla ? 'শিক্ষকের নাম ও লগইন আইডি পূরণ করুন।' : 'Full Name and Login ID are required.');
      return;
    }

    setAddingTeacher(true);
    try {
      const payload: any = {
        full_name: teacherForm.full_name.trim(),
        login_id: teacherForm.login_id.trim(),
        email: teacherForm.email.trim() || null,
        phone: teacherForm.phone.trim(),
        password: teacherForm.password || 'TeacherPass2026!',
      };

      if (teacherForm.initial_batch_id) {
        payload.initial_batch_id = parseInt(teacherForm.initial_batch_id);
      }
      if (teacherForm.initial_subject_id) {
        payload.initial_subject_id = parseInt(teacherForm.initial_subject_id);
      }
      payload.is_primary = teacherForm.is_primary;

      await api.post('/api/v1/teachers/', payload);
      toast.success(isBangla ? 'নতুন শিক্ষক সফলভাবে যুক্ত করা হয়েছে!' : 'Teacher added successfully!');
      setShowAddModal(false);
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
      fetchTeachersAndMetadata();
    } catch (err: any) {
      const msg =
        err.response?.data?.login_id?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        (isBangla ? 'শিক্ষক যোগ করা সম্ভব হয়নি।' : 'Failed to add teacher.');
      toast.error(msg);
    } finally {
      setAddingTeacher(false);
    }
  };

  // Handle Assign Teacher to Subject and Batch
  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacher_id || !assignForm.batch_id || !assignForm.subject_id) {
      toast.error(isBangla ? 'শিক্ষক, ব্যাচ ও বিষয় নির্বাচন করুন।' : 'Teacher, Batch and Subject are required.');
      return;
    }

    setAssigningSubject(true);
    try {
      await api.post('/api/v1/teacher-assignments/', {
        teacher_user: parseInt(assignForm.teacher_id),
        batch: parseInt(assignForm.batch_id),
        subject: parseInt(assignForm.subject_id),
        is_primary: assignForm.is_primary,
      });

      toast.success(isBangla ? 'শিক্ষককে বিষয়ে সফলভাবে বরাদ্দ করা হয়েছে!' : 'Teacher assigned to subject successfully!');
      setShowAssignModal(false);
      setAssignForm({
        teacher_id: '',
        batch_id: '',
        subject_id: '',
        is_primary: true,
      });
      fetchTeachersAndMetadata();
    } catch (err: any) {
      const msg = err.response?.data?.detail || (isBangla ? 'বরাদ্দ সম্পন্ন করা যায়নি।' : 'Failed to assign teacher.');
      toast.error(msg);
    } finally {
      setAssigningSubject(false);
    }
  };

  // Handle Deactivate / Expel / Remove Teacher
  const handleDeactivateTeacher = async () => {
    if (!teacherToDeactivate) return;
    setDeactivating(true);
    try {
      await api.delete(`/api/v1/teachers/${teacherToDeactivate.id}/`);
      toast.success(
        isBangla
          ? `${teacherToDeactivate.full_name}-কে সফলভাবে অব্যাহতি/স্থগিত করা হয়েছে!`
          : `Teacher ${teacherToDeactivate.full_name} deactivated successfully!`
      );
      setTeacherToDeactivate(null);
      setDeactivateReason('');
      fetchTeachersAndMetadata();
    } catch (err: any) {
      toast.error(isBangla ? 'শিক্ষককে অব্যাহতি দেওয়া সম্ভব হয়নি।' : 'Failed to deactivate teacher.');
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Reactivate Teacher
  const handleReactivateTeacher = async (teacher: TeacherItem) => {
    try {
      await api.patch(`/api/v1/teachers/${teacher.id}/`, { is_active: true });
      toast.success(isBangla ? 'শিক্ষক অ্যাকাউন্ট পুনর্বহাল করা হয়েছে।' : 'Teacher account reactivated.');
      fetchTeachersAndMetadata();
    } catch (err: any) {
      toast.error(isBangla ? 'পুনর্বহাল করা সম্ভব হয়নি।' : 'Failed to reactivate teacher.');
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.login_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone?.includes(searchQuery) ||
      t.assignments?.some((a) => a.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active' && !t.is_active) return false;
    if (statusFilter === 'inactive' && t.is_active) return false;

    return true;
  });

  const activeCount = teachers.filter((t) => t.is_active).length;
  const totalAssignments = teachers.reduce((acc, t) => acc + (t.assignments?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2 shadow-xs">
            <Users className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'শিক্ষক ও ট্রেইনার প্রশাসন' : 'Faculty & Trainer Administration'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-serif text-[#0F172A]">
            {isBangla ? 'শিক্ষক পোর্টাল: নিয়োগ, বিষয় বরাদ্দ ও অব্যাহতি' : 'Teachers Portal: Faculty, Subjects & Allocation'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-2xl">
            {isBangla
              ? 'ইনস্টিটিউটের নতুন শিক্ষক যোগ করা, নির্দিষ্ট বিষয়ে অন্তর্ভুক্তি, ব্যাচ দায়িত্ব বরাদ্দ ও শিক্ষক অব্যাহতি পরিচালনা করুন।'
              : 'Add new teachers, assign subjects and batches, configure primary trainers, and manage faculty status.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAssignForm({
                teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
                batch_id: batches[0]?.id ? String(batches[0].id) : '',
                subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
                is_primary: true,
              });
              setShowAssignModal(true);
            }}
            className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-[#065F46] border border-[#A7F3D0] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-[#059669]" />
            <span>{isBangla ? 'বিষয় ও ব্যাচ বরাদ্দ' : 'Assign Subject & Batch'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>{isBangla ? 'নতুন শিক্ষক যোগ করুন' : 'Add New Teacher'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {isBangla ? 'মোট নিবন্ধিত শিক্ষক' : 'Total Faculty'}
            </p>
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5">
              {d(teachers.length)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'জন' : ''}</span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {isBangla ? 'সক্রিয় শিক্ষাদানরত' : 'Active Trainers'}
            </p>
            <h3 className="text-2xl font-black text-[#059669] mt-0.5">
              {d(activeCount)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'জন' : ''}</span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {isBangla ? 'মোট বিষয় ও ব্যাচ বরাদ্দ' : 'Total Course Assignments'}
            </p>
            <h3 className="text-2xl font-black text-[#0F766E] mt-0.5">
              {d(totalAssignments)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'টি' : ''}</span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBangla ? 'শিক্ষকের নাম, লগইন আইডি বা বিষয় খুঁজুন...' : 'Search teacher, login ID, subject...'}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669] bg-slate-50 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'all' ? 'bg-white text-[#0F172A] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'সকল' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'সক্রিয়' : 'Active'}
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'inactive' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'স্থগিত / অব্যাহতি' : 'Inactive'}
            </button>
          </div>

          <button
            onClick={fetchTeachersAndMetadata}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition"
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Teachers Table / Roster */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">{isBangla ? 'শিক্ষকদের তথ্য লোড হচ্ছে...' : 'Loading teachers...'}</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">
              {isBangla ? 'কোনো শিক্ষক পাওয়া যায়নি' : 'No teachers found'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {isBangla ? 'নতুন শিক্ষক যুক্ত করতে উপরের বোতামে চাপুন।' : 'Click the button above to add a new teacher.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'শিক্ষকের নাম ও আইডি' : 'Teacher & Login ID'}</th>
                  <th className="py-3 px-4">{isBangla ? 'যোগাযোগ' : 'Contact'}</th>
                  <th className="py-3 px-4">{isBangla ? 'নির্ধারিত বিষয় ও ব্যাচ' : 'Assigned Subjects & Batches'}</th>
                  <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                    {/* Teacher Identity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 font-black flex items-center justify-center text-sm border border-emerald-200 shrink-0">
                          {teacher.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{teacher.full_name}</p>
                          <p className="text-[11px] font-mono text-slate-500 font-semibold">{teacher.login_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{teacher.phone || (isBangla ? 'ফোন নম্বর নেই' : 'No phone')}</span>
                        </p>
                        {teacher.email && (
                          <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{teacher.email}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Assigned Subjects & Batches */}
                    <td className="py-3.5 px-4">
                      {teacher.assignments && teacher.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {teacher.assignments.map((asg, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-medium"
                            >
                              <BookOpen className="w-3 h-3 text-teal-600" />
                              <span className="font-bold">{asg.subject_name}</span>
                              <span className="text-teal-600">({asg.batch_name})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          {isBangla ? 'কোনো বিষয় বরাদ্দ নেই' : 'No assigned subjects'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {teacher.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{isBangla ? 'সক্রিয়' : 'Active'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>{isBangla ? 'স্থগিত / অব্যাহতি' : 'Inactive'}</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Assign Subject button */}
                        <button
                          onClick={() => {
                            setAssignForm({
                              teacher_id: String(teacher.id),
                              batch_id: batches[0]?.id ? String(batches[0].id) : '',
                              subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
                              is_primary: true,
                            });
                            setShowAssignModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition cursor-pointer"
                          title={isBangla ? 'বিষয় ও ব্যাচ বরাদ্দ করুন' : 'Assign Subject'}
                        >
                          {isBangla ? '+ বিষয়' : '+ Subject'}
                        </button>

                        {/* Deactivate or Reactivate */}
                        {teacher.is_active ? (
                          <button
                            onClick={() => {
                              setTeacherToDeactivate(teacher);
                              setDeactivateReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title={isBangla ? 'শিক্ষককে অব্যাহতি/বহিষ্কার করুন' : 'Deactivate Teacher'}
                          >
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            <span>{isBangla ? 'অব্যাহতি' : 'Remove'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateTeacher(teacher)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                          >
                            {isBangla ? 'পুনর্বহাল' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. ADD TEACHER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#0F172A] font-serif">
                  {isBangla ? 'নতুন শিক্ষক নিবন্ধন ও বিষয় অন্তর্ভুক্তি' : 'Add New Teacher'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'শিক্ষকের পুরো নাম *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.full_name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })}
                    placeholder={isBangla ? 'উদাঃ কাওসার হোসেন' : 'e.g. Kawsar Hossain'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'লগইন আইডি *' : 'Login ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.login_id}
                    onChange={(e) => setTeacherForm({ ...teacherForm, login_id: e.target.value })}
                    placeholder="e.g. TCH-2026-005"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'ফোন নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder="teacher@assdi.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                <span className="font-bold text-slate-800 block text-[11.5px]">
                  {isBangla ? 'প্রাথমিক বিষয় ও ব্যাচ বরাদ্দ (ঐচ্ছিক)' : 'Initial Subject & Batch Allocation (Optional)'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {isBangla ? 'ব্যাচ' : 'Batch'}
                    </label>
                    <select
                      value={teacherForm.initial_batch_id}
                      onChange={(e) => setTeacherForm({ ...teacherForm, initial_batch_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">{isBangla ? '-- ব্যাচ নির্বাচন করুন --' : '-- Select Batch --'}</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {isBangla ? 'বিষয়' : 'Subject'}
                    </label>
                    <select
                      value={teacherForm.initial_subject_id}
                      onChange={(e) => setTeacherForm({ ...teacherForm, initial_subject_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">{isBangla ? '-- বিষয় নির্বাচন করুন --' : '-- Select Subject --'}</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'পাসওয়ার্ড (ডিফল্ট)' : 'Initial Password'}
                </label>
                <input
                  type="text"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669] font-mono text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addingTeacher}
                  className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold transition disabled:opacity-50"
                >
                  {addingTeacher ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'শিক্ষক সংরক্ষণ করুন' : 'Save Teacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ASSIGN SUBJECT & BATCH MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#0F172A] font-serif">
                  {isBangla ? 'শিক্ষককে বিষয় ও ব্যাচে বরাদ্দ করুন' : 'Assign Subject & Batch'}
                </h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'শিক্ষক নির্বাচন করুন *' : 'Select Teacher *'}
                </label>
                <select
                  required
                  value={assignForm.teacher_id}
                  onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">{isBangla ? '-- শিক্ষক বেছে নিন --' : '-- Choose Teacher --'}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.login_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'ব্যাচ নির্বাচন করুন *' : 'Select Batch *'}
                </label>
                <select
                  required
                  value={assignForm.batch_id}
                  onChange={(e) => setAssignForm({ ...assignForm, batch_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">{isBangla ? '-- ব্যাচ বেছে নিন --' : '-- Choose Batch --'}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'বিষয় নির্বাচন করুন *' : 'Select Subject *'}
                </label>
                <select
                  required
                  value={assignForm.subject_id}
                  onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">{isBangla ? '-- বিষয় বেছে নিন --' : '-- Choose Subject --'}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={assignForm.is_primary}
                  onChange={(e) => setAssignForm({ ...assignForm, is_primary: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="is_primary" className="font-semibold text-slate-700">
                  {isBangla ? 'প্রধান প্রশিক্ষক (Primary Trainer) হিসেবে গণ্য হবে' : 'Primary Trainer for this subject'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={assigningSubject}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition disabled:opacity-50"
                >
                  {assigningSubject ? (isBangla ? 'বরাদ্দ হচ্ছে...' : 'Assigning...') : (isBangla ? 'বরাদ্দ সম্পন্ন করুন' : 'Confirm Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DEACTIVATE / EXPEL / REMOVE TEACHER MODAL */}
      {teacherToDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-rose-950 font-serif">
                  {isBangla ? 'শিক্ষক অব্যাহতি / স্থগিতকরণ' : 'Deactivate Teacher'}
                </h3>
                <p className="text-xs text-rose-700">
                  {teacherToDeactivate.full_name} ({teacherToDeactivate.login_id})
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-900 leading-relaxed">
              {isBangla
                ? 'এই শিক্ষককে অব্যাহতি দিলে তিনি অ্যাকাউন্টে লগইন করতে পারবেন না এবং ক্লাস বা অ্যাটেনডেন্স নিতে পারবেন না। পরবর্তীতে প্রয়োজন হলে পুনরায় সক্রিয় করা যাবে।'
                : 'Deactivating this teacher will block login and class session operations. You can reactivate anytime.'}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'অব্যাহতির কারণ (ঐচ্ছিক)' : 'Reason (Optional)'}
              </label>
              <textarea
                rows={2}
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder={isBangla ? 'যেমন: চুক্তি সমাপ্ত, ব্যক্তিগত কারণ বা শৃঙ্খলাভঙ্গ' : 'e.g. Contract completed, personal reason'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeacherToDeactivate(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deactivating}
                onClick={handleDeactivateTeacher}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deactivating ? (isBangla ? 'স্থগিত হচ্ছে...' : 'Deactivating...') : (isBangla ? 'অব্যাহতি নিশ্চিত করুন' : 'Confirm Deactivation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
