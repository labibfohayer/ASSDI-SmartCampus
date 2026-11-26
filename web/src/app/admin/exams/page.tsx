'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  FileText,
  ChevronRight,
  BookOpen,
  X,
  Check,
  Edit3,
  Layers,
  Sparkles,
  BarChart2,
  Send,
  Eye,
  Info,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExaminationItem {
  id: number;
  batch: number;
  batch_name: string;
  level: number;
  subject: number;
  subject_name: string;
  name: string;
  exam_type: 'midterm' | 'final' | 'practical' | 'viva';
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  total_marks: number;
  pass_marks: number;
  syllabus: string;
  created_by_name: string;
  results_count: number;
  results_status_summary?: {
    status?: string;
    label?: string;
    count?: number;
    total?: number;
    draft?: number;
    approved_for_publication?: number;
    published?: number;
  };
}

interface StudentResultEntry {
  id?: number;
  student_id: number;
  student_code: string;
  student_name: string;
  marks_obtained: string | number;
  grade?: string;
  is_passed?: boolean;
  examiner_feedback?: string;
  status?: string;
  version?: number;
}

interface BatchOption {
  id: number;
  name: string;
  code: string;
}

interface SubjectOption {
  id: number;
  name: string;
}

export default function AdminExamsPage() {
  const { isBangla } = useLanguage();

  const [exams, setExams] = useState<ExaminationItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Exam Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [examForm, setExamForm] = useState({
    batch: '',
    level: '1',
    subject: '',
    name: '',
    exam_type: 'midterm',
    exam_date: '',
    start_time: '10:00',
    end_time: '12:00',
    room: 'কম্পিউটার ল্যাব ০১',
    total_marks: 100,
    pass_marks: 50,
    syllabus: '',
  });

  // Marks Entry Modal
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [activeExam, setActiveExam] = useState<ExaminationItem | null>(null);
  const [studentEntries, setStudentEntries] = useState<StudentResultEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Double Approval Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalStep, setApprovalStep] = useState<1 | 2>(1);
  const [approvalStats, setApprovalStats] = useState<any>(null);
  const [isReviewingStep1, setIsReviewingStep1] = useState(false);
  const [isConfirmingStep2, setIsConfirmingStep2] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, batchesRes, subjectsRes] = await Promise.all([
        api.get('/api/v1/examinations/'),
        api.get('/api/v1/batches/'),
        api.get('/api/v1/subjects/'),
      ]);

      const examData = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || [];
      const batchData = Array.isArray(batchesRes.data) ? batchesRes.data : batchesRes.data?.results || [];
      const subjectData = Array.isArray(subjectsRes.data) ? subjectsRes.data : subjectsRes.data?.results || [];

      setExams(examData);
      setBatches(batchData);
      setSubjects(subjectData);
    } catch (err: any) {
      console.error('Error fetching exams:', err);
      setError(isBangla ? 'পরীক্ষার তথ্য লোড করতে সমস্যা হয়েছে।' : 'Failed to load examinations.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.batch || !examForm.subject || !examForm.name || !examForm.exam_date) {
      alert(isBangla ? 'অনুগ্রহ করে সকল আবশ্যক তথ্য পূরণ করুন।' : 'Please fill all required fields.');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        batch: parseInt(examForm.batch, 10),
        level: parseInt(examForm.level, 10),
        subject: parseInt(examForm.subject, 10),
        name: examForm.name.trim(),
        exam_type: examForm.exam_type,
        exam_date: examForm.exam_date,
        start_time: examForm.start_time,
        end_time: examForm.end_time,
        room: examForm.room.trim(),
        total_marks: examForm.total_marks,
        pass_marks: examForm.pass_marks,
        syllabus: examForm.syllabus.trim(),
      };

      await api.post('/api/v1/examinations/', payload);
      alert(isBangla ? 'নতুন পরীক্ষা সফলভাবে তৈরি হয়েছে!' : 'Examination created successfully!');
      setShowCreateModal(false);
      setExamForm({
        batch: '',
        level: '1',
        subject: '',
        name: '',
        exam_type: 'midterm',
        exam_date: '',
        start_time: '10:00',
        end_time: '12:00',
        room: 'কম্পিউটার ল্যাব ০১',
        total_marks: 100,
        pass_marks: 50,
        syllabus: '',
      });
      fetchInitialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.name?.[0] || 'পরীক্ষা তৈরিতে ত্রুটি হয়েছে।');
    } finally {
      setIsCreating(false);
    }
  };

  const openMarksEntryModal = async (exam: ExaminationItem) => {
    setActiveExam(exam);
    setShowMarksModal(true);
    setLoadingEntries(true);
    try {
      // 1. Fetch current results for this exam
      const resultsRes = await api.get(`/api/v1/examinations/${exam.id}/results/`);
      const existingResults: any[] = Array.isArray(resultsRes.data) ? resultsRes.data : [];

      // 2. Fetch all students in this batch
      const studentsRes = await api.get(`/api/v1/students/?batch_id=${exam.batch}`);
      const studentsList: any[] = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : studentsRes.data?.results || [];

      // Merge students with their existing marks
      const entries: StudentResultEntry[] = studentsList.map((st) => {
        const found = existingResults.find((r) => r.student === st.id || r.student_id === st.student_id);
        return {
          id: found?.id,
          student_id: st.id,
          student_code: st.student_id || `STD-${st.id}`,
          student_name: st.full_name || st.user?.full_name || 'শিক্ষার্থী',
          marks_obtained: found ? found.marks_obtained : '',
          grade: found?.grade || '',
          is_passed: found?.is_passed,
          examiner_feedback: found?.examiner_feedback || '',
          status: found?.status || 'draft',
          version: found?.version || 1,
        };
      });

      setStudentEntries(entries);
    } catch (err) {
      console.error('Error loading students for marks entry:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleMarksChange = (idx: number, val: string) => {
    const updated = [...studentEntries];
    updated[idx].marks_obtained = val;

    const num = parseFloat(val);
    if (!isNaN(num) && activeExam) {
      const pct = (num / activeExam.total_marks) * 100;
      if (pct >= 80) {
        updated[idx].grade = 'A+';
        updated[idx].is_passed = true;
      } else if (pct >= 70) {
        updated[idx].grade = 'A';
        updated[idx].is_passed = true;
      } else if (pct >= 60) {
        updated[idx].grade = 'B';
        updated[idx].is_passed = true;
      } else if (pct >= 50) {
        updated[idx].grade = 'C';
        updated[idx].is_passed = true;
      } else {
        updated[idx].grade = 'F';
        updated[idx].is_passed = false;
      }
    } else {
      updated[idx].grade = '';
      updated[idx].is_passed = undefined;
    }
    setStudentEntries(updated);
  };

  const handleFeedbackChange = (idx: number, val: string) => {
    const updated = [...studentEntries];
    updated[idx].examiner_feedback = val;
    setStudentEntries(updated);
  };

  const handleSaveMarks = async () => {
    if (!activeExam) return;
    setSavingMarks(true);
    try {
      const marksPayload = studentEntries
        .filter((e) => e.marks_obtained !== '' && e.marks_obtained !== null)
        .map((e) => ({
          student_id: e.student_id,
          marks_obtained: parseFloat(e.marks_obtained as string),
          examiner_feedback: e.examiner_feedback || '',
        }));

      if (marksPayload.length === 0) {
        alert(isBangla ? 'অন্তত একজন শিক্ষার্থীর নম্বর এন্ট্রি করুন।' : 'Please enter marks for at least one student.');
        setSavingMarks(false);
        return;
      }

      const res = await api.post(`/api/v1/examinations/${activeExam.id}/bulk-entry/`, {
        marks: marksPayload,
      });

      alert(res.data.message || (isBangla ? 'নম্বর সফলভাবে সংরক্ষিত হয়েছে (খসড়া)!' : 'Marks saved as draft!'));
      setShowMarksModal(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || (isBangla ? 'নম্বর সংরক্ষণে ত্রুটি হয়েছে।' : 'Failed to save marks.'));
    } finally {
      setSavingMarks(false);
    }
  };

  const openApprovalFlow = (exam: ExaminationItem) => {
    setActiveExam(exam);
    setApprovalStep(1);
    setApprovalStats(null);
    setConfirmCheckbox(false);
    setShowApprovalModal(true);
  };

  const handleStep1Review = async () => {
    if (!activeExam) return;
    setIsReviewingStep1(true);
    try {
      const res = await api.post(`/api/v1/examinations/${activeExam.id}/step1-review/`);
      setApprovalStats(res.data);
      setApprovalStep(2);
      fetchInitialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || (isBangla ? 'ধাপ ১ অনুমোদন ব্যর্থ হয়েছে।' : 'Step 1 review failed.'));
    } finally {
      setIsReviewingStep1(false);
    }
  };

  const handleStep2ConfirmPublish = async () => {
    if (!activeExam) return;
    if (!confirmCheckbox) {
      alert(isBangla ? 'অনুগ্রহ করে চূড়ান্ত প্রকাশনা নিশ্চিতকরণ বাক্সে টিক দিন।' : 'Please check confirmation.');
      return;
    }
    setIsConfirmingStep2(true);
    try {
      const res = await api.post(`/api/v1/examinations/${activeExam.id}/confirm-publish/`, {
        confirm_publication: true,
      });
      alert(res.data.message || (isBangla ? 'ফলাফল সফলভাবে প্রকাশিত হয়েছে!' : 'Results published!'));
      setShowApprovalModal(false);
      fetchInitialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || (isBangla ? 'ধাপ ২ প্রকাশনা ব্যর্থ হয়েছে।' : 'Step 2 publish failed.'));
    } finally {
      setIsConfirmingStep2(false);
    }
  };

  // Filtered examinations
  const filteredExams = exams.filter((ex) => {
    if (selectedBatch !== 'all' && ex.batch.toString() !== selectedBatch) return false;
    if (selectedLevel !== 'all' && ex.level.toString() !== selectedLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchSub = ex.subject_name.toLowerCase().includes(q);
      const matchBatch = ex.batch_name.toLowerCase().includes(q);
      if (!matchName && !matchSub && !matchBatch) return false;
    }
    return true;
  });

  const totalExams = exams.length;
  const publishedCount = exams.filter((e) => e.results_status_summary?.status === 'published').length;
  const underReviewCount = exams.filter((e) => e.results_status_summary?.status === 'approved_for_publication').length;
  const draftCount = exams.filter((e) => e.results_status_summary?.status === 'draft' || e.results_status_summary?.status === 'no_results' || e.results_count === 0).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#FCD34D] text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <Award className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'এসবিএমসি মূল্যায়ন ও ফলাফল নিয়ন্ত্রণ' : 'SBMC Examination & Results Control'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'পরীক্ষা ও ফলাফল ব্যবস্থাপনা' : 'Examinations & Result Management'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-2xl leading-relaxed">
            {isBangla
              ? 'মাস্টার প্রম্পট সেকশন ১২ অনুযায়ী এসবিএমসি লেভেল ১ ও ২ এর পরীক্ষা শিডিউলিং, নম্বর এন্ট্রি ও বাধ্যতামূলক দ্বিমুখী অনুমোদন কর্মপ্রবাহ।'
              : 'Section 12: Examination scheduling, marks grading, and mandatory two-step approval publication for SBMC Level 1 & 2.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{isBangla ? 'নতুন পরীক্ষা শিডিউল' : 'Schedule New Exam'}</span>
          </button>
          <button
            onClick={fetchInitialData}
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
            className="p-2.5 rounded-xl bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] transition-colors cursor-pointer active:scale-95 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'সর্বমোট পরীক্ষা' : 'Total Exams'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalExams}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[#0369A1] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'চূড়ান্ত প্রকাশিত' : 'Published Results'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0369A1]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0369A1]">{publishedCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'ধাপ ১ অনুমোদিত' : 'Step 1 Approved'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-800">{underReviewCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'খসড়া বা এন্ট্রি বাকি' : 'Draft / Pending'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-800">{draftCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isBangla
                ? 'পরীক্ষার নাম, বিষয় বা ব্যাচ দিয়ে খুঁজুন...'
                : 'Search exams by title, subject or batch...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">{isBangla ? 'সব লেভেল (Level 1 & 2)' : 'All SBMC Levels'}</option>
            <option value="1">{isBangla ? 'লেভেল ১ (ফাউন্ডেশন)' : 'Level 1 (Foundation)'}</option>
            <option value="2">{isBangla ? 'লেভেল ২ (উদ্যোক্তা)' : 'Level 2 (Advanced)'}</option>
          </select>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id.toString()}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Examinations Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p>{isBangla ? 'পরীক্ষার তালিকা লোড হচ্ছে...' : 'Loading examinations...'}</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Award className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-700">
              {isBangla ? 'কোনো পরীক্ষা পাওয়া যায়নি' : 'No examinations found'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isBangla ? 'উপরে বোতাম চেপে নতুন পরীক্ষা শিডিউল করুন।' : 'Click the button above to schedule an exam.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200/80 text-gray-600 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">{isBangla ? 'পরীক্ষার নাম ও ধরন' : 'Exam & Type'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'ব্যাচ ও লেভেল' : 'Batch & Level'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'তারিখ ও কক্ষ' : 'Date & Room'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'পূর্ণমান ও পাস নম্বর' : 'Marks'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'অনুমোদন অবস্থা' : 'Approval Status'}</th>
                  <th className="py-3.5 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExams.map((ex) => {
                  const summary = ex.results_status_summary || { status: 'no_results' };
                  const isPublished = summary.status === 'published';
                  const isStep1Approved = summary.status === 'approved_for_publication';
                  const isDraft = !isPublished && !isStep1Approved;

                  return (
                    <tr key={ex.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{ex.name}</div>
                        <div className="text-xs text-[#0F766E] font-semibold mt-0.5">
                          {ex.subject_name} •{' '}
                          <span className="capitalize text-slate-500">
                            {ex.exam_type === 'midterm'
                              ? isBangla ? 'মিডটার্ম' : 'Midterm'
                              : ex.exam_type === 'final'
                              ? isBangla ? 'ফাইনাল' : 'Final'
                              : ex.exam_type === 'practical'
                              ? isBangla ? 'ব্যবহারিক' : 'Practical'
                              : isBangla ? 'মৌখিক (ভাইভা)' : 'Viva'}
                          </span>
                        </div>
                      </td>

                      {/* Batch & Level */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{ex.batch_name}</div>
                        <div className="text-xs font-bold text-amber-700 mt-0.5">
                          {ex.level === 1 ? 'SBMC Level 1 (ফাউন্ডেশন)' : 'SBMC Level 2 (উদ্যোক্তা)'}
                        </div>
                      </td>

                      {/* Date & Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ex.exam_date}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#0F766E]" />
                          <span>{ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)} ({ex.room})</span>
                        </div>
                      </td>

                      {/* Marks */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-gray-900">
                          {isBangla ? 'পূর্ণমান:' : 'Total:'} <strong>{ex.total_marks}</strong>
                        </div>
                        <div className="text-xs text-slate-500">
                          {isBangla ? 'পাস নম্বর:' : 'Pass:'} <strong>{ex.pass_marks}</strong>
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        {isPublished && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1]">
                              <CheckCircle2 className="w-3 h-3 text-[#0369A1]" />
                              {isBangla ? 'চূড়ান্ত প্রকাশিত' : 'Published'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {summary.published} {isBangla ? 'জন শিক্ষার্থী' : 'students'}
                            </span>
                          </div>
                        )}
                        {isStep1Approved && !isPublished && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <ShieldCheck className="w-3 h-3 text-amber-700" />
                              {isBangla ? 'ধাপ ১ অনুমোদিত' : 'Step 1 Approved'}
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              {isBangla ? 'ধাপ ২ প্রকাশনা বাকি' : 'Awaiting Step 2'}
                            </span>
                          </div>
                        )}
                        {isDraft && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {ex.results_count > 0 ? (isBangla ? 'খসড়া এন্ট্রি' : 'Draft Entry') : (isBangla ? 'এন্ট্রি বাকি' : 'Pending Entry')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {ex.results_count} {isBangla ? 'জন এন্ট্রি করা' : 'entered'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openMarksEntryModal(ex)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-[#0F766E] border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3 h-3 text-[#0F766E]" />
                            {isBangla ? 'নম্বর এন্ট্রি' : 'Marks Entry'}
                          </button>

                          <button
                            onClick={() => openApprovalFlow(ex)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-95"
                          >
                            <ShieldCheck className="w-3 h-3 text-white" />
                            {isStep1Approved
                              ? (isBangla ? 'ধাপ ২ প্রকাশ' : 'Step 2 Publish')
                              : (isBangla ? 'দ্বিমুখী অনুমোদন' : 'Approval')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule New Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#0F766E] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'নতুন পরীক্ষা শিডিউল তৈরি' : 'Schedule New SBMC Examination'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla ? 'এসবিএমসি লেভেল ১ ও ২ এর জন্য পরীক্ষা নির্ধারণ করুন' : 'Schedule exam for SBMC Level 1 or 2'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'পরীক্ষার নাম / শিরোনাম (বাধ্যতামূলক):' : 'Exam Title:'}
                </label>
                <input
                  type="text"
                  required
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder={isBangla ? 'উদা: SBMC লেভেল ১ মিডটার্ম মূল্যায়ন ২০২৬' : 'E.g., SBMC Level 1 Midterm Exam'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'এসবিএমসি কোর্স লেভেল:' : 'SBMC Level:'}
                  </label>
                  <select
                    value={examForm.level}
                    onChange={(e) => setExamForm({ ...examForm, level: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="1">{isBangla ? 'লেভেল ১ (ফাউন্ডেশন)' : 'Level 1 (Foundation)'}</option>
                    <option value="2">{isBangla ? 'লেভেল ২ (উদ্যোক্তা)' : 'Level 2 (Advanced)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'ব্যাচ:' : 'Batch:'}
                  </label>
                  <select
                    required
                    value={examForm.batch}
                    onChange={(e) => setExamForm({ ...examForm, batch: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="">{isBangla ? 'ব্যাচ নির্বাচন করুন' : 'Select Batch'}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিষয় (Subject):' : 'Subject:'}
                  </label>
                  <select
                    required
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="">{isBangla ? 'বিষয় নির্বাচন করুন' : 'Select Subject'}</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id.toString()}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পরীক্ষার ধরন:' : 'Exam Type:'}
                  </label>
                  <select
                    value={examForm.exam_type}
                    onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="midterm">{isBangla ? 'মিডটার্ম মূল্যায়ন' : 'Midterm'}</option>
                    <option value="final">{isBangla ? 'ফাইনাল সমন্বিত পরীক্ষা' : 'Final Exam'}</option>
                    <option value="practical">{isBangla ? 'ব্যবহারিক ল্যাব পরীক্ষা' : 'Practical Lab'}</option>
                    <option value="viva">{isBangla ? 'মৌখিক / ভাইভা' : 'Oral / Viva'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'তারিখ:' : 'Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.exam_date}
                    onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শুরু:' : 'Start:'}
                  </label>
                  <input
                    type="time"
                    required
                    value={examForm.start_time}
                    onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শেষ:' : 'End:'}
                  </label>
                  <input
                    type="time"
                    required
                    value={examForm.end_time}
                    onChange={(e) => setExamForm({ ...examForm, end_time: e.target.value })}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'কক্ষ / ল্যাব:' : 'Room / Lab:'}
                  </label>
                  <input
                    type="text"
                    value={examForm.room}
                    onChange={(e) => setExamForm({ ...examForm, room: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পূর্ণমান:' : 'Total Marks:'}
                  </label>
                  <input
                    type="number"
                    value={examForm.total_marks}
                    onChange={(e) => setExamForm({ ...examForm, total_marks: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পাস নম্বর:' : 'Pass Marks:'}
                  </label>
                  <input
                    type="number"
                    value={examForm.pass_marks}
                    onChange={(e) => setExamForm({ ...examForm, pass_marks: parseInt(e.target.value, 10) || 50 })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'সিলেবাস ও পাঠ্যসূচি রূপরেখা:' : 'Syllabus & Topics:'}
                </label>
                <textarea
                  rows={2}
                  value={examForm.syllabus}
                  onChange={(e) => setExamForm({ ...examForm, syllabus: e.target.value })}
                  placeholder={isBangla ? 'সিলেবাস বা অন্তর্ভুক্ত টপিকসমূহ লিখুন...' : 'Topics covered...'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      {isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      {isBangla ? 'পরীক্ষা সংরক্ষণ করুন' : 'Save Examination'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marks Entry Spreadsheet Modal */}
      {showMarksModal && activeExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#0F766E] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{activeExam.name}</h3>
                  <p className="text-xs text-slate-500">
                    {activeExam.batch_name} • {activeExam.subject_name} • পূর্ণমান: {activeExam.total_marks} | পাস নম্বর: {activeExam.pass_marks}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMarksModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {loadingEntries ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
                  <p className="text-xs">{isBangla ? 'শিক্ষার্থীদের তালিকা লোড হচ্ছে...' : 'Loading students...'}</p>
                </div>
              ) : studentEntries.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm font-semibold">{isBangla ? 'এই ব্যাচে কোনো শিক্ষার্থী পাওয়া যায়নি।' : 'No students found.'}</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">{isBangla ? 'আইডি ও শিক্ষার্থীর নাম' : 'Student ID & Name'}</th>
                        <th className="py-2.5 px-3 w-28">{isBangla ? 'প্রাপ্ত নম্বর' : 'Marks'}</th>
                        <th className="py-2.5 px-3 w-20">{isBangla ? 'গ্রেড' : 'Grade'}</th>
                        <th className="py-2.5 px-3 w-24">{isBangla ? 'ফলাফল' : 'Result'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষকের মন্তব্য / ফিডব্যাক' : 'Feedback'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentEntries.map((st, idx) => (
                        <tr key={st.student_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{st.student_name}</div>
                            <div className="text-[11px] text-[#0F766E] font-medium">{st.student_code}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max={activeExam.total_marks}
                              step="0.5"
                              value={st.marks_obtained}
                              onChange={(e) => handleMarksChange(idx, e.target.value)}
                              placeholder={`/ ${activeExam.total_marks}`}
                              className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {st.grade ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  st.grade === 'A+' || st.grade === 'A'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : st.grade === 'F'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                {st.grade}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {st.is_passed === true && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isBangla ? 'পাস' : 'Pass'}
                              </span>
                            )}
                            {st.is_passed === false && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {isBangla ? 'ফেল' : 'Fail'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={st.examiner_feedback}
                              onChange={(e) => handleFeedbackChange(idx, e.target.value)}
                              placeholder={isBangla ? 'মন্তব্য লিখুন (ঐচ্ছিক)...' : 'Feedback...'}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-500">
                {isBangla
                  ? '* সংরক্ষিত নম্বর খসড়া হিসেবে থাকবে। প্রকাশ করতে দ্বিমুখী অনুমোদন সম্পন্ন করতে হবে।'
                  : '* Marks will be saved as draft until 2-step approval is completed.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarksModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveMarks}
                  disabled={savingMarks}
                  className="px-5 py-2.5 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {savingMarks ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      {isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      {isBangla ? 'নম্বর সংরক্ষণ করুন (খসড়া)' : 'Save Marks as Draft'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Double Approval Modal (Section 12.3) */}
      {showApprovalModal && activeExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C2410C] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] border border-orange-200 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6 text-[#C2410C]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'ফলাফল দ্বিমুখী অনুমোদন ও প্রকাশ কর্মপ্রবাহ' : 'Two-Step Result Publication Workflow'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeExam.name} • {activeExam.batch_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Wizard */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  approvalStep === 1
                    ? 'bg-orange-50/80 border-[#C2410C] text-[#C2410C] shadow-xs'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    approvalStep === 1 ? 'bg-[#C2410C] text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {approvalStep === 2 ? <Check className="w-4 h-4" /> : '১'}
                </div>
                <div>
                  <div className="text-xs font-bold">{isBangla ? 'ধাপ ১: ফলাফল রিভিউ' : 'Step 1: Review & Audit'}</div>
                  <div className="text-[10px] opacity-80">
                    {approvalStep === 2 ? (isBangla ? 'অনুমোদিত' : 'Approved') : (isBangla ? 'চলমান' : 'Active')}
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  approvalStep === 2
                    ? 'bg-orange-50/80 border-[#C2410C] text-[#C2410C] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    approvalStep === 2 ? 'bg-[#C2410C] text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ২
                </div>
                <div>
                  <div className="text-xs font-bold">{isBangla ? 'ধাপ ২: চূড়ান্ত প্রকাশ' : 'Step 2: Publication'}</div>
                  <div className="text-[10px] opacity-80">{isBangla ? 'নিশ্চিতকরণ আবশ্যক' : 'Confirmation'}</div>
                </div>
              </div>
            </div>

            {/* Step 1 Content */}
            {approvalStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-[#0F766E]" />
                    <span>{isBangla ? 'ধাপ ১ অডিট ও পরিসংখ্যানে যা যাচাই করা হবে:' : 'Step 1 Validation Scope:'}</span>
                  </div>
                  <ul className="text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>{isBangla ? '১. কোনো শিক্ষার্থীর নম্বর বাদ পড়েছে কি না তা স্বয়ংক্রিয় শনাক্তকরণ।' : 'Missing marks detection'}</li>
                    <li>{isBangla ? '২. পাস-ফেল অনুপাত ও গ্রেড বণ্টন নির্ভুল হিসাব।' : 'Pass rate and grade calculation'}</li>
                    <li>{isBangla ? '৩. অনুমোদনকারী কোঅর্ডিনেটরের আইডেন্টিটি ও টাইমস্ট্যাম্প অডিট লগে রেকর্ড।' : 'Audit timestamp and author recording'}</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    {isBangla
                      ? 'ধাপ ১ সম্পন্ন হলেও ফলাফল ছাত্রদের কাছে দৃশ্যমান হবে না। এটি শুধুমাত্র অভ্যন্তরীণভাবে অনুমোদিত হবে।'
                      : 'Step 1 approval remains invisible to students.'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApprovalModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Review}
                    disabled={isReviewingStep1}
                    className="px-5 py-2.5 text-xs font-bold bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isReviewingStep1 ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        {isBangla ? 'অডিট হচ্ছে...' : 'Auditing...'}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-white" />
                        {isBangla ? 'ধাপ ১: অডিট ও অনুমোদন করুন' : 'Approve Step 1 (Audit)'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {approvalStep === 2 && (
              <div className="space-y-4">
                {approvalStats && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isBangla ? 'ধাপ ১ অডিট রিপোর্ট:' : 'Step 1 Audit Report:'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>মোট পরীক্ষার্থী: <strong>{approvalStats.total_students}</strong></div>
                      <div>উত্তীর্ণ: <strong>{approvalStats.passed_count} ({approvalStats.pass_rate_percentage}%)</strong></div>
                      <div>অনুপস্থিত/বাদ: <strong>{approvalStats.missing_marks_count}</strong></div>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    {isBangla
                      ? 'চূড়ান্ত সতর্কতা: ধাপ ২ নিশ্চিত করার সাথে সাথে সকল পরীক্ষার্থীর ব্যক্তিগত ড্যাশবোর্ডে গ্রেড ও ফলাফল প্রকাশিত হবে এবং স্বয়ংক্রিয় নোটিফিকেশন চলে যাবে।'
                      : 'Final Warning: Confirming Step 2 will immediately make results visible to all students and send notifications.'}
                  </span>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#C2410C] focus:ring-[#C2410C] border-gray-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {isBangla
                      ? 'আমি ঘোষণা করছি যে সকল গ্রেড ও নম্বর নির্ভুল এবং শিক্ষার্থীদের জন্য চূড়ান্ত প্রকাশনা অনুমোদন করছি।'
                      : 'I certify that all grades are accurate and authorize final publication to students.'}
                  </span>
                </label>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setApprovalStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    {isBangla ? '← পূর্বের ধাপে যান' : '← Back to Step 1'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2ConfirmPublish}
                    disabled={isConfirmingStep2 || !confirmCheckbox}
                    className="px-5 py-2.5 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isConfirmingStep2 ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        {isBangla ? 'প্রকাশ হচ্ছে...' : 'Publishing...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        {isBangla ? 'ধাপ ২: চূড়ান্ত অনুমোদন ও প্রকাশ করুন' : 'Confirm Step 2 Publication'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
