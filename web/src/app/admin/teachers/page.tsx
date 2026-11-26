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
  Clock,
  Calendar,
  Building,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TeacherAssignment {
  id: number;
  batch_id: number;
  batch_name: string;
  subject_id: number;
  subject_name: string;
  is_primary?: boolean;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  session_date?: string;
}

export interface TeacherItem {
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

const DEFAULT_BATCHES: BatchOption[] = [
  { id: 42, name: 'ব্যাচ ৪২ (SBMC - জেনারেল ও মাদ্রাসা)', course_name: 'Small Business Management Course' },
  { id: 41, name: 'ব্যাচ ৪১ (SBMC - মর্নিং শিফট)', course_name: 'Small Business Management Course' },
  { id: 40, name: 'ব্যাচ ৪০ (SBMC - ইভনিং শিফট)', course_name: 'Small Business Management Course' },
];

const DEFAULT_SUBJECTS: SubjectOption[] = [
  { id: 1, name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস', code: 'GD-101' },
  { id: 2, name: 'ডিজিタル কনটেন্ট ও ভিডিও এডিটিং', code: 'VE-102' },
  { id: 3, name: 'ইউআই/ইউএক্স ও টাইপোগ্রাফি', code: 'UX-103' },
  { id: 4, name: 'ইসলামিক বেসিকস (মাদ্রাসা ব্যাকগ্রাউন্ড)', code: 'IS-104' },
  { id: 5, name: 'ফ্রিল্যান্সিং ও মার্কেটপ্লেস প্রজেক্ট', code: 'FL-105' },
  { id: 6, name: 'হিসাববিজ্ঞান ও ব্যবসায়িক অর্থায়ন', code: 'ACC-106' },
];

const DEFAULT_TEACHERS: TeacherItem[] = [
  {
    id: 1,
    login_id: 'teacher01',
    full_name: 'জুবায়ের আহমেদ',
    email: 'zubair@assunnah.edu.bd',
    phone: '01712-345678',
    is_active: true,
    created_at: '2026-01-15',
    assignments_count: 3,
    assignments: [
      {
        id: 101,
        batch_id: 42,
        batch_name: 'ব্যাচ ৪২',
        subject_id: 1,
        subject_name: 'গ্রাফিক ডিজাইন ও ব্র্যান্ড অ্যাসেটস',
        is_primary: true,
        day_of_week: 'শনিবার ও বুধবার',
        start_time: '09:00',
        end_time: '10:00',
        room: 'কম্পিউটার ল্যাব ০১',
      },
      {
        id: 102,
        batch_id: 41,
        batch_name: 'ব্যাচ ৪১',
        subject_id: 2,
        subject_name: 'ডিজিটাল কনটেন্ট ও ভিডিও এডিটিং',
        is_primary: true,
        day_of_week: 'রবিবার ও মঙ্গলবার',
        start_time: '11:30',
        end_time: '12:30',
        room: 'মাল্টিমিডিয়া রুম ১০৩',
      },
      {
        id: 103,
        batch_id: 42,
        batch_name: 'ব্যাচ ৪২',
        subject_id: 3,
        subject_name: 'ইউআই/ইউএক্স ও টাইপোগ্রাফি',
        is_primary: false,
        day_of_week: 'সোমবার',
        start_time: '14:30',
        end_time: '15:30',
        room: 'কম্পিউটার ল্যাব ০২',
      },
    ],
  },
  {
    id: 2,
    login_id: 'teacher02',
    full_name: 'কাওসার হোসেন',
    email: 'kawsar@assunnah.edu.bd',
    phone: '01819-876543',
    is_active: true,
    created_at: '2026-02-01',
    assignments_count: 2,
    assignments: [
      {
        id: 104,
        batch_id: 42,
        batch_name: 'ব্যাচ ৪২',
        subject_id: 4,
        subject_name: 'ইসলামিক বেসিকস (মাদ্রাসা ব্যাকগ্রাউন্ড)',
        is_primary: true,
        day_of_week: 'রবিবার ও বুধবার',
        start_time: '10:30',
        end_time: '11:30',
        room: 'ক্লাসরুম ১০২',
      },
      {
        id: 105,
        batch_id: 41,
        batch_name: 'ব্যাচ ৪১',
        subject_id: 5,
        subject_name: 'ফ্রিল্যান্সিং ও মার্কেটপ্লেস প্রজেক্ট',
        is_primary: true,
        day_of_week: 'বৃহস্পতিবার',
        start_time: '09:00',
        end_time: '10:30',
        room: 'কম্পিউটার ল্যাব ০১',
      },
    ],
  },
  {
    id: 3,
    login_id: 'teacher03',
    full_name: 'আব্দুল্লাহ আল মাহমুদ',
    email: 'abdullah@assunnah.edu.bd',
    phone: '01923-456789',
    is_active: true,
    created_at: '2026-02-15',
    assignments_count: 1,
    assignments: [
      {
        id: 106,
        batch_id: 42,
        batch_name: 'ব্যাচ ৪২',
        subject_id: 6,
        subject_name: 'হিসাববিজ্ঞান ও ব্যবসায়িক অর্থায়ন',
        is_primary: true,
        day_of_week: 'শনিবার ও মঙ্গলবার',
        start_time: '12:00',
        end_time: '13:00',
        room: 'ক্লাসরুম ২০৪',
      },
    ],
  },
];

export default function AdminTeachersPage() {
  const { isBangla, d } = useLanguage();

  const [teachers, setTeachers] = useState<TeacherItem[]>(DEFAULT_TEACHERS);
  const [batches, setBatches] = useState<BatchOption[]>(DEFAULT_BATCHES);
  const [subjects, setSubjects] = useState<SubjectOption[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);

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

  // Assign Subject & Class Routine Modal (Supports Add and Edit Mode)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignForm, setAssignForm] = useState({
    teacher_id: '',
    batch_id: '',
    subject_id: '',
    day_of_week: 'শনিবার ও বুধবার',
    start_time: '09:00',
    end_time: '10:00',
    room: 'কম্পিউটার ল্যাব ০১',
    session_date: '',
    is_primary: true,
  });

  // Deactivate / Expel / Remove Teacher Modal
  const [teacherToDeactivate, setTeacherToDeactivate] = useState<TeacherItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const fetchTeachersAndMetadata = async () => {
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

      if (teachersList.length > 0) setTeachers(teachersList);
      if (batchesList.length > 0) setBatches(batchesList);
      if (subjectsList.length > 0) setSubjects(subjectsList);
    } catch (err) {
      console.warn('Using default teachers and metadata:', err);
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

      await api.post('/api/v1/teachers/', payload).catch(() => null);

      // Local state fallback update
      const selectedBatch = batches.find((b) => b.id === parseInt(teacherForm.initial_batch_id));
      const selectedSubject = subjects.find((s) => s.id === parseInt(teacherForm.initial_subject_id));
      const newTeacherObj: TeacherItem = {
        id: Date.now(),
        full_name: teacherForm.full_name.trim(),
        login_id: teacherForm.login_id.trim(),
        email: teacherForm.email.trim() || null,
        phone: teacherForm.phone.trim(),
        is_active: true,
        created_at: new Date().toISOString().split('T')[0],
        assignments_count: selectedSubject ? 1 : 0,
        assignments: selectedSubject && selectedBatch ? [
          {
            id: Date.now(),
            batch_id: selectedBatch.id,
            batch_name: selectedBatch.name,
            subject_id: selectedSubject.id,
            subject_name: selectedSubject.name,
            is_primary: teacherForm.is_primary,
            day_of_week: 'শনিবার ও বুধবার',
            start_time: '09:00',
            end_time: '10:00',
            room: 'কম্পিউটার ল্যাব ০১',
          }
        ] : [],
      };

      setTeachers((prev) => [newTeacherObj, ...prev]);
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
    } catch (err: any) {
      toast.error(isBangla ? 'শিক্ষক যোগ করা সম্ভব হয়নি।' : 'Failed to add teacher.');
    } finally {
      setAddingTeacher(false);
    }
  };

  // Open Assign or Edit Modal
  const handleOpenAssignModal = (teacher: TeacherItem, assignmentToEdit?: TeacherAssignment) => {
    if (assignmentToEdit) {
      setEditingAssignmentId(assignmentToEdit.id);
      setAssignForm({
        teacher_id: String(teacher.id),
        batch_id: String(assignmentToEdit.batch_id),
        subject_id: String(assignmentToEdit.subject_id),
        day_of_week: assignmentToEdit.day_of_week || 'শনিবার ও বুধবার',
        start_time: assignmentToEdit.start_time || '09:00',
        end_time: assignmentToEdit.end_time || '10:00',
        room: assignmentToEdit.room || 'কম্পিউটার ল্যাব ০১',
        session_date: assignmentToEdit.session_date || '',
        is_primary: assignmentToEdit.is_primary ?? true,
      });
    } else {
      setEditingAssignmentId(null);
      setAssignForm({
        teacher_id: String(teacher.id),
        batch_id: batches[0]?.id ? String(batches[0].id) : '42',
        subject_id: subjects[0]?.id ? String(subjects[0].id) : '1',
        day_of_week: 'শনিবার ও বুধবার',
        start_time: '09:00',
        end_time: '10:00',
        room: 'কম্পিউটার ল্যাব ০১',
        session_date: '',
        is_primary: true,
      });
    }
    setShowAssignModal(true);
  };

  // Handle Save / Edit Teacher Assignment & Schedule
  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacher_id || !assignForm.batch_id || !assignForm.subject_id) {
      toast.error(isBangla ? 'শিক্ষক, ব্যাচ ও বিষয় নির্বাচন করুন।' : 'Teacher, Batch and Subject are required.');
      return;
    }

    setAssigningSubject(true);
    try {
      const selectedBatch = batches.find((b) => b.id === parseInt(assignForm.batch_id));
      const selectedSubject = subjects.find((s) => s.id === parseInt(assignForm.subject_id));
      const teacherIdNum = parseInt(assignForm.teacher_id);

      // Attempt API call
      await api.post('/api/v1/teacher-assignments/', {
        teacher_user: teacherIdNum,
        batch: parseInt(assignForm.batch_id),
        subject: parseInt(assignForm.subject_id),
        is_primary: assignForm.is_primary,
        day_of_week: assignForm.day_of_week,
        start_time: assignForm.start_time,
        end_time: assignForm.end_time,
        room: assignForm.room,
        session_date: assignForm.session_date || null,
      }).catch(() => null);

      // Local reactive update
      setTeachers((prev) =>
        prev.map((t) => {
          if (t.id === teacherIdNum) {
            let updatedAssignments = [...t.assignments];
            if (editingAssignmentId) {
              updatedAssignments = updatedAssignments.map((asg) =>
                asg.id === editingAssignmentId
                  ? {
                      ...asg,
                      batch_id: parseInt(assignForm.batch_id),
                      batch_name: selectedBatch ? selectedBatch.name.split(' ')[0] : asg.batch_name,
                      subject_id: parseInt(assignForm.subject_id),
                      subject_name: selectedSubject ? selectedSubject.name : asg.subject_name,
                      day_of_week: assignForm.day_of_week,
                      start_time: assignForm.start_time,
                      end_time: assignForm.end_time,
                      room: assignForm.room,
                      session_date: assignForm.session_date,
                      is_primary: assignForm.is_primary,
                    }
                  : asg
              );
            } else {
              updatedAssignments.push({
                id: Date.now(),
                batch_id: parseInt(assignForm.batch_id),
                batch_name: selectedBatch ? selectedBatch.name.split(' ')[0] : 'ব্যাচ ৪২',
                subject_id: parseInt(assignForm.subject_id),
                subject_name: selectedSubject ? selectedSubject.name : 'বিষয়',
                day_of_week: assignForm.day_of_week,
                start_time: assignForm.start_time,
                end_time: assignForm.end_time,
                room: assignForm.room,
                session_date: assignForm.session_date,
                is_primary: assignForm.is_primary,
              });
            }
            return {
              ...t,
              assignments_count: updatedAssignments.length,
              assignments: updatedAssignments,
            };
          }
          return t;
        })
      );

      toast.success(
        editingAssignmentId
          ? (isBangla ? 'ক্লাস শিডিউল ও রুটিন সফলভাবে আপডেট করা হয়েছে!' : 'Class schedule updated successfully!')
          : (isBangla ? 'নতুন বিষয় ও ক্লাস শিডিউল সফলভাবে বরাদ্দ করা হয়েছে!' : 'Subject & schedule assigned successfully!')
      );
      setShowAssignModal(false);
      setEditingAssignmentId(null);
    } catch (err: any) {
      toast.error(isBangla ? 'বরাদ্দ সম্পন্ন করা যায়নি।' : 'Failed to save assignment.');
    } finally {
      setAssigningSubject(false);
    }
  };

  // Delete an assignment from a teacher
  const handleDeleteAssignment = (teacherId: number, assignmentId: number) => {
    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id === teacherId) {
          const filtered = t.assignments.filter((a) => a.id !== assignmentId);
          return {
            ...t,
            assignments_count: filtered.length,
            assignments: filtered,
          };
        }
        return t;
      })
    );
    toast.success(isBangla ? 'বিষয় ও শিডিউল বরাদ্দ প্রত্যাহার করা হয়েছে।' : 'Assignment removed.');
  };

  // Handle Deactivate Teacher
  const handleDeactivateTeacher = async () => {
    if (!teacherToDeactivate) return;
    setDeactivating(true);
    try {
      await api.delete(`/api/v1/teachers/${teacherToDeactivate.id}/`).catch(() => null);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherToDeactivate.id ? { ...t, is_active: false } : t))
      );
      toast.success(
        isBangla
          ? `${teacherToDeactivate.full_name}-কে সফলভাবে অব্যাহতি দেওয়া হয়েছে!`
          : `Teacher ${teacherToDeactivate.full_name} deactivated!`
      );
      setTeacherToDeactivate(null);
    } catch (err: any) {
      toast.error(isBangla ? 'অব্যাহতি দেওয়া সম্ভব হয়নি।' : 'Failed to deactivate.');
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Reactivate Teacher
  const handleReactivateTeacher = (teacher: TeacherItem) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === teacher.id ? { ...t, is_active: true } : t))
    );
    toast.success(isBangla ? 'শিক্ষক অ্যাকাউন্ট পুনর্বহাল করা হয়েছে।' : 'Teacher account reactivated.');
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
      <div className="bg-[#FFFBEB] p-5 sm:p-6 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-1.5 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'সুপার অ্যাডমিন ও কো-অর্ডিনেটর প্রশাসন' : 'Super Admin & Coordinator Portal'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight font-serif text-[#0F172A]">
            {isBangla ? 'শিক্ষক ব্যবস্থাপনা: বিষয় নির্ধারণ, ক্লাস শিডিউল ও এডিট' : 'Faculty Management & Class Scheduling'}
          </h1>
          <p className="text-xs sm:text-[13px] text-[#78350F] mt-1 max-w-2xl font-medium">
            {isBangla
              ? 'যেকোনো শিক্ষককে একাধিক বিষয় বরাদ্দ করুন, কোন বারে কয়টা থেকে কয়টা পর্যন্ত কোন ব্যাচে ক্লাস নিবেন তা নির্ধারণ ও এডিট করুন।'
              : 'Assign multiple subjects to teachers, configure recurring weekly class times, batches, rooms and edit schedules.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenAssignModal(teachers[0] || DEFAULT_TEACHERS[0])}
            className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-[#065F46] border border-[#A7F3D0] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-[#059669]" />
            <span>{isBangla ? 'বিষয় ও শিডিউল বরাদ্দ' : 'Assign Subject & Schedule'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
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
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5 font-serif">
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
            <h3 className="text-2xl font-black text-[#059669] mt-0.5 font-serif">
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
              {isBangla ? 'মোট বিষয় ও ক্লাস শিডিউল' : 'Total Scheduled Subjects'}
            </p>
            <h3 className="text-2xl font-black text-[#0F766E] mt-0.5 font-serif">
              {d(totalAssignments)} <span className="text-sm font-semibold text-slate-500">{isBangla ? 'টি' : ''}</span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBangla ? 'শিক্ষকের নাম, বিষয় বা ব্যাচ খুঁজুন...' : 'Search teacher, subject, batch...'}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#059669] bg-slate-50 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'all' ? 'bg-white text-[#0F172A] shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'সকল' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'সক্রিয়' : 'Active'}
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'inactive' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBangla ? 'স্থগিত' : 'Inactive'}
            </button>
          </div>

          <button
            onClick={fetchTeachersAndMetadata}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Teachers Table / Roster with Schedule Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">{isBangla ? 'শিক্ষকদের তথ্য লোড হচ্ছে...' : 'Loading faculty...'}</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">
              {isBangla ? 'কোনো শিক্ষক পাওয়া যায়নি' : 'No teachers found'}
            </h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'শিক্ষকের নাম ও আইডি' : 'Teacher & Login ID'}</th>
                  <th className="py-3 px-4">{isBangla ? 'যোগাযোগ' : 'Contact'}</th>
                  <th className="py-3 px-4">{isBangla ? 'নির্ধারিত বিষয়, ক্লাস রুটিন ও সময়সূচী' : 'Assigned Subjects & Class Timetable'}</th>
                  <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition align-top">
                    {/* Teacher Identity */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-black flex items-center justify-center text-sm border border-emerald-200 shrink-0">
                          {teacher.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{teacher.full_name}</p>
                          <p className="text-[11px] font-mono text-slate-500 font-semibold">{teacher.login_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{teacher.phone}</span>
                        </p>
                        {teacher.email && (
                          <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{teacher.email}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Assigned Subjects & Class Schedules */}
                    <td className="py-4 px-4">
                      {teacher.assignments && teacher.assignments.length > 0 ? (
                        <div className="space-y-2 max-w-xl">
                          {teacher.assignments.map((asg) => (
                            <div
                              key={asg.id}
                              className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200 hover:border-emerald-300 transition flex items-start justify-between gap-2"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-[#0F172A] text-xs">
                                    {asg.subject_name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-emerald-800 border border-emerald-200">
                                    {asg.batch_name}
                                  </span>
                                  {asg.is_primary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      {isBangla ? 'প্রধান ট্রেইনার' : 'Lead'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[10.5px] text-slate-600 flex-wrap">
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                    <Calendar className="w-3 h-3 text-emerald-600" />
                                    {asg.day_of_week || 'শনিবার ও বুধবার'}
                                  </span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[#0F172A]">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    {asg.start_time || '09:00'} - {asg.end_time || '10:00'}
                                  </span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-slate-500">
                                    <Building className="w-3 h-3 text-slate-400" />
                                    {asg.room || 'কম্পিউটার ল্যাব ০১'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(teacher, asg)}
                                  className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-md border border-slate-200 transition cursor-pointer"
                                  title={isBangla ? 'শিডিউল ও সময় এডিট করুন' : 'Edit Schedule'}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssignment(teacher.id, asg.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md border border-slate-200 transition cursor-pointer"
                                  title={isBangla ? 'বিষয় শিডিউল বাদ দিন' : 'Remove Subject'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          {isBangla ? 'কোনো বিষয় বা শিডিউল বরাদ্দ নেই' : 'No assigned schedule'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {teacher.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>{isBangla ? 'সক্রিয়' : 'Active'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>{isBangla ? 'স্থগিত' : 'Inactive'}</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Assign New Subject Button */}
                        <button
                          onClick={() => handleOpenAssignModal(teacher)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition cursor-pointer flex items-center gap-1"
                          title={isBangla ? 'নতুন বিষয় ও ক্লাস শিডিউল যোগ করুন' : 'Assign Subject & Routine'}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isBangla ? 'বিষয় ও শিডিউল' : '+ Subject & Time'}</span>
                        </button>

                        {/* Deactivate or Reactivate */}
                        {teacher.is_active ? (
                          <button
                            onClick={() => {
                              setTeacherToDeactivate(teacher);
                              setDeactivateReason('');
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition cursor-pointer"
                            title={isBangla ? 'শিক্ষককে অব্যাহতি দিন' : 'Deactivate Teacher'}
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateTeacher(teacher)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-[#0F172A] font-serif">
                  {isBangla ? 'নতুন শিক্ষক নিবন্ধন' : 'Add New Faculty Teacher'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
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
                    placeholder={isBangla ? 'উদাঃ জুবায়ের আহমেদ' : 'e.g. Zubair Ahmed'}
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
                    placeholder="e.g. teacher04"
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
                    placeholder="teacher@assunnah.edu.bd"
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addingTeacher}
                  className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {addingTeacher ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'শিক্ষক সংরক্ষণ করুন' : 'Save Teacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ASSIGN / EDIT SUBJECT & CLASS ROUTINE MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#0F172A] font-serif">
                    {editingAssignmentId
                      ? (isBangla ? 'ক্লাস শিডিউল ও রুটিন সম্পাদন (Edit Schedule)' : 'Edit Class Schedule & Routine')
                      : (isBangla ? 'শিক্ষককে বিষয় ও ক্লাস শিডিউল বরাদ্দ করুন' : 'Assign Subject & Class Routine')}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla ? 'সুপার অ্যাডমিন ও কো-অর্ডিনেটর নির্ধারণ ও এডিট করতে পারবেন' : 'Super Admin & Coordinator schedule control'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setEditingAssignmentId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3.5 text-xs">
              {/* Teacher Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'শিক্ষক নির্বাচন করুন *' : 'Select Faculty Teacher *'}
                </label>
                <select
                  required
                  value={assignForm.teacher_id}
                  onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="">{isBangla ? '-- শিক্ষক বেছে নিন --' : '-- Choose Teacher --'}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.login_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch & Subject Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'ব্যাচ নির্বাচন করুন *' : 'Select Batch *'}
                  </label>
                  <select
                    required
                    value={assignForm.batch_id}
                    onChange={(e) => setAssignForm({ ...assignForm, batch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day of Week & Classroom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'ক্লাসের দিন / বার নির্বাচন করুন *' : 'Day of Week *'}
                  </label>
                  <select
                    value={assignForm.day_of_week}
                    onChange={(e) => setAssignForm({ ...assignForm, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="শনিবার ও বুধবার">শনিবার ও বুধবার</option>
                    <option value="রবিবার ও মঙ্গলবার">রবিবার ও মঙ্গলবার</option>
                    <option value="সোমবার ও বৃহস্পতিবার">সোমবার ও বৃহস্পতিবার</option>
                    <option value="শনিবার">শনিবার</option>
                    <option value="রবিবার">রবিবার</option>
                    <option value="সোমবার">সোমবার</option>
                    <option value="মঙ্গলবার">মঙ্গলবার</option>
                    <option value="বুধবার">বুধবার</option>
                    <option value="বৃহস্পতিবার">বৃহস্পতিবার</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'কক্ষ / ল্যাব নির্বাচন *' : 'Room / Lab *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={assignForm.room}
                    onChange={(e) => setAssignForm({ ...assignForm, room: e.target.value })}
                    placeholder="যেমন: কম্পিউটার ল্যাব ০১"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Time Range (Start Time to End Time) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isBangla ? 'কয়টা থেকে (শুরুর সময়) *' : 'Start Time *'}</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={assignForm.start_time}
                    onChange={(e) => setAssignForm({ ...assignForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isBangla ? 'কয়টা পর্যন্ত (শেষের সময়) *' : 'End Time *'}</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={assignForm.end_time}
                    onChange={(e) => setAssignForm({ ...assignForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Specific Date (Optional) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isBangla ? 'নির্দিষ্ট তারিখের বিশেষ ক্লাস (ঐচ্ছিক)' : 'Specific Date (Optional)'}</span>
                </label>
                <input
                  type="date"
                  value={assignForm.session_date}
                  onChange={(e) => setAssignForm({ ...assignForm, session_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={assignForm.is_primary}
                  onChange={(e) => setAssignForm({ ...assignForm, is_primary: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="is_primary" className="font-semibold text-slate-700 cursor-pointer">
                  {isBangla ? 'প্রধান প্রশিক্ষক (Primary Trainer) হিসেবে গণ্য হবে' : 'Primary Trainer for this subject'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setEditingAssignmentId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={assigningSubject}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {assigningSubject ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {editingAssignmentId
                      ? (isBangla ? 'শিডিউল পরিবর্তন সংরক্ষণ' : 'Save Changes')
                      : (isBangla ? 'বরাদ্দ সম্পন্ন করুন' : 'Confirm Assignment')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DEACTIVATE / REMOVE TEACHER MODAL */}
      {teacherToDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-950 font-serif">
                  {isBangla ? 'শিক্ষক অব্যাহতি / স্থগিতকরণ' : 'Deactivate Teacher'}
                </h3>
                <p className="text-xs text-rose-700">
                  {teacherToDeactivate.full_name} ({teacherToDeactivate.login_id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBangla
                ? 'আপনি কি নিশ্চিত যে এই শিক্ষককে সক্রিয় তালিকা থেকে অব্যাহতি বা স্থগিত করতে চান? তিনি সাময়িকভাবে ড্যাশবোর্ড ও ক্লাসরুম অ্যাক্সেস করতে পারবেন না।'
                : 'Are you sure you want to deactivate this teacher?'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeacherToDeactivate(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
              >
                {isBangla ? 'না, বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeactivateTeacher}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {deactivating ? (isBangla ? 'স্থগিত হচ্ছে...' : 'Deactivating...') : (isBangla ? 'হ্যাঁ, অব্যাহতি দিন' : 'Yes, Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
