'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Play,
  XCircle,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  BookOpen,
  Info,
  X,
  ShieldCheck,
  History,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface ClassSessionItem {
  id: number;
  batch: number;
  batch_name: string;
  subject: number;
  subject_name: string;
  teacher_user: string;
  teacher_name: string;
  topic: number | null;
  topic_title: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  audience: 'all' | 'madrasa' | 'general';
  status: 'draft' | 'published' | 'cancelled';
  approval_status?: 'draft' | 'approved_for_publication' | 'published';
  step1_approved_by_name?: string | null;
  step1_approved_at?: string | null;
  version_number?: number;
  published_at: string | null;
  cancel_reason?: string;
  description?: string;
}

interface RoutineVersionItem {
  id: number;
  batch: number;
  version_number: number;
  change_summary: string;
  schedule_snapshot: any;
  approved_by_name: string;
  published_by_name: string;
  published_at: string;
  created_at: string;
}

interface BatchOption {
  id: number;
  name: string;
  code: string;
}

interface SubjectOption {
  id: number;
  name: string;
  batch: number;
}

export default function AdminSessionsPage() {
  const { isBangla } = useLanguage();

  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cancel Modal
  const [cancellingSession, setCancellingSession] = useState<ClassSessionItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Generate Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genStartDate, setGenStartDate] = useState('');
  const [genEndDate, setGenEndDate] = useState('');
  const [genBatchId, setGenBatchId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Two-Step Routine Approval Modal State (Section 3.3)
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApprovalBatch, setSelectedApprovalBatch] = useState<string>('');
  const [approvalStep, setApprovalStep] = useState<1 | 2>(1);
  const [approvalConflicts, setApprovalConflicts] = useState<any[]>([]);
  const [approvalHasConflicts, setApprovalHasConflicts] = useState(false);
  const [isReviewingStep1, setIsReviewingStep1] = useState(false);
  const [isConfirmingStep2, setIsConfirmingStep2] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string | null>(null);

  // Routine Version History Modal State
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [routineVersions, setRoutineVersions] = useState<RoutineVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchRoutineVersions = async (batchId?: string) => {
    setLoadingVersions(true);
    try {
      const url = batchId ? `/api/v1/class-sessions/routine-versions/?batch_id=${batchId}` : '/api/v1/class-sessions/routine-versions/';
      const res = await api.get(url);
      setRoutineVersions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching routine versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const openApprovalModal = (batchId?: number | string) => {
    const targetBatch = batchId ? batchId.toString() : (batches[0]?.id?.toString() || sessions[0]?.batch?.toString() || '1');
    setSelectedApprovalBatch(targetBatch);
    setApprovalStep(1);
    setApprovalConflicts([]);
    setApprovalHasConflicts(false);
    setChangeSummary('SBMC সাপ্তাহিক ক্লাস রুটিন ও ল্যাব সময়সূচি অনুমোদন ও প্রকাশ');
    setConfirmCheckbox(false);
    setApprovalSuccessMsg(null);
    setShowApprovalModal(true);
  };

  const handleStep1Review = async () => {
    const bId = selectedApprovalBatch || batches[0]?.id?.toString() || '1';
    setIsReviewingStep1(true);
    try {
      const res = await api.post('/api/v1/class-sessions/step1-review/', {
        batch_id: parseInt(bId, 10),
      });
      setApprovalConflicts(res.data.conflicts || []);
      setApprovalHasConflicts(res.data.has_conflicts || false);
      setApprovalSuccessMsg(res.data.message || 'ধাপ ১ অডিট ও পর্যালোচনা সম্পন্ন হয়েছে।');
      setApprovalStep(2);
      fetchInitialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || (isBangla ? 'ধাপ ১ অনুমোদন ব্যর্থ হয়েছে।' : 'Step 1 review failed.'));
    } finally {
      setIsReviewingStep1(false);
    }
  };

  const handleStep2ConfirmPublish = async () => {
    if (!confirmCheckbox) {
      alert(isBangla ? 'অনুগ্রহ করে প্রকাশনা নিশ্চিতকরণ বক্সে টিক দিন।' : 'Please check the confirmation box.');
      return;
    }
    setIsConfirmingStep2(true);
    try {
      const res = await api.post('/api/v1/class-sessions/confirm-publish/', {
        batch_id: parseInt(selectedApprovalBatch, 10),
        confirm_publication: true,
        change_summary: changeSummary,
      });
      alert(res.data.message || (isBangla ? 'রুটিন সফলভাবে প্রকাশিত হয়েছে!' : 'Routine published!'));
      setShowApprovalModal(false);
      fetchInitialData();
      fetchRoutineVersions(selectedApprovalBatch);
    } catch (err: any) {
      alert(err?.response?.data?.error || (isBangla ? 'ধাপ ২ প্রকাশনা ব্যর্থ হয়েছে।' : 'Step 2 publish failed.'));
    } finally {
      setIsConfirmingStep2(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, batchesRes] = await Promise.all([
        api.get('/api/v1/class-sessions/'),
        api.get('/api/v1/batches/'),
      ]);

      const sessData = Array.isArray(sessionsRes.data)
        ? sessionsRes.data
        : sessionsRes.data?.results || [];
      const batchData = Array.isArray(batchesRes.data)
        ? batchesRes.data
        : batchesRes.data?.results || [];

      setSessions(sessData);
      setBatches(batchData);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(
        isBangla
          ? 'ক্লাস সেশনের তথ্য লোড করতে সমস্যা হয়েছে।'
          : 'Failed to load class sessions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (session: ClassSessionItem) => {
    if (
      !confirm(
        isBangla
          ? `আপনি কি "${session.subject_name}" ক্লাসটি পাবলিশ করতে চান? শিক্ষার্থীরা এটি দেখতে পাবে।`
          : `Do you want to publish the session "${session.subject_name}"?`
      )
    ) {
      return;
    }

    setActionLoadingId(session.id);
    try {
      const res = await api.post(`/api/v1/class-sessions/${session.id}/publish/`);
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: 'published', published_at: res.data.published_at } : s))
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          (isBangla ? 'পাবলিশ করতে ব্যর্থ হয়েছে।' : 'Failed to publish.')
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSession || !cancelReason.trim()) return;

    setIsSubmittingCancel(true);
    try {
      await api.post(`/api/v1/class-sessions/${cancellingSession.id}/cancel/`, {
        cancel_reason: cancelReason.trim(),
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === cancellingSession.id
            ? { ...s, status: 'cancelled', cancel_reason: cancelReason.trim() }
            : s
        )
      );
      setCancellingSession(null);
      setCancelReason('');
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          (isBangla ? 'বাতিল করতে ব্যর্থ হয়েছে।' : 'Failed to cancel session.')
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleGenerateSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genStartDate || !genEndDate) {
      alert(
        isBangla
          ? 'অনুগ্রহ করে শুরুর তারিখ ও শেষের তারিখ নির্বাচন করুন।'
          : 'Please select start and end dates.'
      );
      return;
    }

    setIsGenerating(true);
    setGenerateResult(null);
    try {
      const payload: any = {
        start_date: genStartDate,
        end_date: genEndDate,
      };
      if (genBatchId) {
        payload.batch_id = parseInt(genBatchId, 10);
      }

      const res = await api.post('/api/v1/class-schedules/generate-all-sessions/', payload);
      setGenerateResult(
        isBangla
          ? `সফলভাবে ${res.data.created_count || 0}টি সেশন তৈরি ও পাবলিশ করা হয়েছে!`
          : `Successfully created & published ${res.data.created_count || 0} sessions!`
      );
      // Refresh list
      const updatedSess = await api.get('/api/v1/class-sessions/');
      setSessions(
        Array.isArray(updatedSess.data)
          ? updatedSess.data
          : updatedSess.data?.results || []
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          (isBangla ? 'সেশন জেনারেট ব্যর্থ হয়েছে।' : 'Session generation failed.')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    if (selectedBatch !== 'all' && s.batch.toString() !== selectedBatch) {
      return false;
    }
    if (selectedStatus !== 'all' && s.status !== selectedStatus) {
      return false;
    }
    if (filterDate && s.session_date !== filterDate) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchSub = s.subject_name?.toLowerCase().includes(query);
      const matchTopic = s.topic_title?.toLowerCase().includes(query);
      const matchTeacher = s.teacher_name?.toLowerCase().includes(query);
      const matchBatch = s.batch_name?.toLowerCase().includes(query);
      if (!matchSub && !matchTopic && !matchTeacher && !matchBatch) {
        return false;
      }
    }
    return true;
  });

  const totalSessions = sessions.length;
  const publishedSessions = sessions.filter((s) => s.status === 'published').length;
  const draftSessions = sessions.filter((s) => s.status === 'draft').length;
  const cancelledSessions = sessions.filter((s) => s.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#FCD34D] text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'সেশন ও সময়সূচি নিয়ন্ত্রণ' : 'Session & Timetable Management'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'ক্লাস সেশন ও রুটিন তালিকা' : 'Class Sessions & Timetable'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-xl">
            {isBangla
              ? 'দৈনিক ও সাপ্তাহিক ক্লাস সূচি, ড্রাফট সেশন পাবলিশ এবং বাতিল কার্যক্রম পরিচালনা করুন।'
              : 'Manage daily/weekly schedules, publish draft sessions, or handle class cancellations.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => openApprovalModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>{isBangla ? 'দ্বিমুখী রুটিন অনুমোদন ও প্রকাশ' : 'Two-Step Routine Approval'}</span>
          </button>
          <button
            onClick={() => {
              fetchRoutineVersions();
              setShowVersionsModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <History className="w-4 h-4 text-[#0F766E]" />
            <span>{isBangla ? 'সংস্করণ ইতিহাস' : 'Versions'}</span>
          </button>
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGenerateResult(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>{isBangla ? 'শিডিউল থেকে সেশন তৈরি' : 'Auto-Generate Sessions'}</span>
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
              {isBangla ? 'সর্বমোট সেশন' : 'Total Sessions'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[#0369A1] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'পাবলিশড (লাইভ)' : 'Published'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0369A1]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0369A1]">{publishedSessions}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'ড্রাফট (অপেক্ষমান)' : 'Draft'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-800">{draftSessions}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'বাতিলকৃত' : 'Cancelled'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-800">{cancelledSessions}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isBangla
                ? 'বিষয়, টপিক, শিক্ষক বা ব্যাচ দিয়ে খুঁজুন...'
                : 'Search by subject, topic, teacher or batch...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-w-[170px]"
          >
            <option value="all" className="bg-white text-[#0F172A]">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id.toString()} className="bg-white text-[#0F172A]">
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-w-[160px]"
          >
            <option value="all" className="bg-white text-[#0F172A]">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
            <option value="published" className="bg-white text-[#0F172A]">{isBangla ? 'পাবলিশড' : 'Published'}</option>
            <option value="draft" className="bg-white text-[#0F172A]">{isBangla ? 'ড্রাফট' : 'Draft'}</option>
            <option value="cancelled" className="bg-white text-[#0F172A]">{isBangla ? 'বাতিলকৃত' : 'Cancelled'}</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />

          {(selectedBatch !== 'all' || selectedStatus !== 'all' || filterDate || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBatch('all');
                setSelectedStatus('all');
                setFilterDate('');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors whitespace-nowrap"
            >
              {isBangla ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p>{isBangla ? 'সেশন লোড হচ্ছে...' : 'Loading sessions...'}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-700">
              {isBangla ? 'কোন সেশন পাওয়া যায়নি' : 'No sessions found'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isBangla
                ? 'ফিল্টার পরিবর্তন করুন অথবা নতুন সেশন শিডিউল করুন।'
                : 'Try adjusting filters or generate new sessions from timetable.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200/80 text-gray-600 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">{isBangla ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'ব্যাচ ও বিষয়' : 'Batch & Subject'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'টপিক / পাঠ্যসূচি' : 'Topic'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'শিক্ষক' : 'Teacher'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'অডিয়েন্স' : 'Audience'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{s.session_date}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#0F766E]" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </div>
                    </td>

                    {/* Batch & Subject */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{s.subject_name}</div>
                      <div className="text-xs text-[#0F766E] font-semibold mt-0.5">
                        {s.batch_name}
                      </div>
                    </td>

                    {/* Topic */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {s.topic_title ? (
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1">
                            {s.topic_title}
                          </p>
                          {s.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {s.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          {isBangla ? 'সাধারণ ক্লাস' : 'General Session'}
                        </span>
                      )}
                    </td>

                    {/* Teacher */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span>{s.teacher_name || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Audience */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.audience === 'all'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.audience === 'madrasa'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {s.audience === 'all'
                          ? isBangla ? 'সকল' : 'All'
                          : s.audience === 'madrasa'
                          ? isBangla ? 'মাদ্রাসা ব্যাকগ্রাউন্ড' : 'Madrasa'
                          : isBangla ? 'জেনারেল ব্যাকগ্রাউন্ড' : 'General'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {s.status === 'published' && (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1]">
                            <CheckCircle2 className="w-3 h-3 text-[#0369A1]" />
                            {isBangla ? 'পাবলিশড (লাইভ)' : 'Published'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            সংস্করণ v{s.version_number || 1}
                          </span>
                        </div>
                      )}
                      {s.status === 'draft' && s.approval_status === 'approved_for_publication' && (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            {isBangla ? 'ধাপ ১ অনুমোদিত' : 'Step 1 Approved'}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            {isBangla ? 'ধাপ ২ চূড়ান্ত অনুমোদন বাকি' : 'Awaiting Step 2'}
                          </span>
                        </div>
                      )}
                      {s.status === 'draft' && s.approval_status !== 'approved_for_publication' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isBangla ? 'খসড়া (ড্রাফট)' : 'Draft'}
                        </span>
                      )}
                      {s.status === 'cancelled' && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {isBangla ? 'বাতিলকৃত' : 'Cancelled'}
                          </span>
                          {s.cancel_reason && (
                            <p className="text-[11px] text-rose-600 mt-1 max-w-[180px] truncate" title={s.cancel_reason}>
                              {s.cancel_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.status === 'draft' && (
                          <button
                            onClick={() => openApprovalModal(s.batch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-95"
                          >
                            <ShieldCheck className="w-3 h-3 text-white" />
                            {s.approval_status === 'approved_for_publication'
                              ? (isBangla ? 'ধাপ ২ প্রকাশ' : 'Step 2 Publish')
                              : (isBangla ? 'অনুমোদন ও প্রকাশ' : 'Review & Publish')}
                          </button>
                        )}
                        {s.status === 'published' && (
                          <button
                            onClick={() => {
                              setCancellingSession(s);
                              setCancelReason('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors"
                          >
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {isBangla ? 'বাতিল' : 'Cancel'}
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

      {/* Cancel Session Modal */}
      {cancellingSession && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 border-t-4 border-t-rose-600">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {isBangla ? 'ক্লাস সেশন বাতিল করুন' : 'Cancel Class Session'}
                </h3>
                <p className="text-xs text-gray-500">
                  {cancellingSession.subject_name} • {cancellingSession.session_date}
                </p>
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isBangla ? 'বাতিল করার কারণ (বাধ্যতামূলক):' : 'Cancellation Reason (Required):'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={
                    isBangla
                      ? 'উদা: শিক্ষক জরুরি ছুটিতে আছেন অথবা বিদ্যুৎ বিভ্রাট...'
                      : 'E.g., Faculty emergency leave, electrical maintenance...'
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingSession(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {isBangla ? 'ফিরে যান' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingCancel
                    ? isBangla ? 'বাতিল হচ্ছে...' : 'Cancelling...'
                    : isBangla ? 'নিশ্চিত করুন' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Generate Sessions Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#0F766E] border border-[#FCD34D] flex items-center justify-center font-bold">
                  <Play className="w-5 h-5 fill-[#0F766E] text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'শিডিউল থেকে সেশন তৈরি' : 'Generate Concrete Sessions'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? 'সাপ্তাহিক রুটিন টেমপ্লেট থেকে নির্দিষ্ট তারিখের জন্য সেশন জেনারেট করুন'
                      : 'Create concrete class sessions automatically from weekly schedules'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generateResult && (
              <div className="p-3 mb-4 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span>{generateResult}</span>
              </div>
            )}

            <form onSubmit={handleGenerateSessions} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isBangla ? 'ব্যাচ নির্বাচন (ঐচ্ছিক - খালি রাখলে সব ব্যাচ):' : 'Batch (Optional):'}
                </label>
                <select
                  value={genBatchId}
                  onChange={(e) => setGenBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="" className="bg-white text-[#0F172A]">{isBangla ? 'সব সক্রিয় ব্যাচ' : 'All Active Batches'}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id.toString()} className="bg-white text-[#0F172A]">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isBangla ? 'শুরুর তারিখ (Start Date):' : 'Start Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isBangla ? 'শেষের তারিখ (End Date):' : 'End Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={genEndDate}
                    onChange={(e) => setGenEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  {isBangla
                    ? 'এই প্রক্রিয়াটি স্বয়ংক্রিয়ভাবে শুধুমাত্র ক্লাস দিবসে (রবি-বৃহস্পতি) সক্রিয় রুটিন অনুযায়ী সেশন তৈরি করবে এবং পূর্বে প্রস্তুতকৃত কোনো সেশনের পুনরাবৃত্তি করবে না।'
                    : 'This process automatically generates sessions for school days according to active weekly schedules without duplicating existing sessions.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2.5 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      {isBangla ? 'জেনারেট হচ্ছে...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-[#C1982E] text-[#C1982E]" />
                      {isBangla ? 'সেশন তৈরি শুরু করুন' : 'Start Generation'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Two-Step Routine Approval Modal (Section 3.3) */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C2410C] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] border border-orange-200 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6 text-[#C2410C]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {isBangla ? 'বাধ্যতামূলক দ্বিমুখী রুটিন অনুমোদন কর্মপ্রবাহ' : 'Mandatory Two-Step Routine Approval Workflow'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? 'এসবিএমসি মাস্টার প্রম্পট ৩.৩: অডিট, সংঘাত যাচাই ও চূড়ান্ত প্রকাশনা নিশ্চিতকরণ'
                      : 'Section 3.3: Schedule Conflict Audit & Final Publication Confirmation'}
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

            {/* Step Wizard Bar */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  approvalStep === 1
                    ? 'bg-orange-50/80 border-[#C2410C] text-[#C2410C] shadow-xs'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    approvalStep === 1
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {approvalStep === 2 ? <Check className="w-4 h-4" /> : '১'}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {isBangla ? 'ধাপ ১: অডিট ও সংঘাত যাচাই' : 'Step 1: Audit & Conflict Check'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {approvalStep === 2
                      ? (isBangla ? 'সফলভাবে যাচাইকৃত' : 'Verified')
                      : (isBangla ? 'পর্যালোচনাধীন' : 'In Progress')}
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
                    approvalStep === 2
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ২
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {isBangla ? 'ধাপ ২: চূড়ান্ত প্রকাশনা নিশ্চিতকরণ' : 'Step 2: Publication Confirmation'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {approvalStep === 2
                      ? (isBangla ? 'চূড়ান্ত অনুমোদন আবশ্যক' : 'Requires Confirmation')
                      : (isBangla ? 'অপেক্ষমান' : 'Pending')}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Content */}
            {approvalStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'অনুমোদনের জন্য ব্যাচ নির্বাচন করুন:' : 'Select Target Batch:'}
                  </label>
                  <select
                    value={selectedApprovalBatch}
                    onChange={(e) => setSelectedApprovalBatch(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#0F766E]" />
                    <span>{isBangla ? 'স্বয়ংক্রিয় ৩-স্তরের কনফ্লিক্ট ভ্যালিডেশন:' : 'Automatic 3-Layer Conflict Validation:'}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>{isBangla ? '১. শিক্ষক সময়সূচি সংঘাত: একজন শিক্ষক একই সময়ে দুটি ব্যাচে নিয়োজিত হতে পারবেন না।' : '1. Teacher Overlap: Rigorous 1-teacher-1-slot rule.'}</li>
                    <li>{isBangla ? '২. ল্যাব ও ক্লাসরুম সংঘাত: একই ল্যাবে একাধিক ক্লাস সমাপতিত হওয়া নিষিদ্ধ।' : '2. Room Collision: Dedicated lab allocation.'}</li>
                    <li>{isBangla ? '৩. অডিয়েন্স ওভারল্যাপ: সাধারণ ও মাদ্রাসা ব্যাকগ্রাউন্ড অডিয়েন্স ইন্টারসেকশন যাচাই।' : '3. Audience Overlap: Madrasa vs General stream intersection.'}</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    {isBangla
                      ? 'অনুমোদন বোতাম চাপলে সিস্টেম উল্লেখিত সকল সেশনের সংঘাত বিশ্লেষণ করবে এবং অনুমোদিত করবে।'
                      : 'Clicking approve will trigger conflict validation and mark sessions as approved for publication.'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApprovalModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
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
                        {isBangla ? 'কনফ্লিক্ট যাচাই হচ্ছে...' : 'Auditing Conflicts...'}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-white" />
                        {isBangla ? 'ধাপ ১: কনফ্লিক্ট অডিট ও অনুমোদন করুন' : 'Approve Step 1 (Conflict Audit)'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {approvalStep === 2 && (
              <div className="space-y-4">
                {/* Conflict Status Banner */}
                {approvalHasConflicts ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>{isBangla ? 'সতর্কতা: রুটিনে কনফ্লিক্ট পাওয়া গেছে!' : 'Warning: Routine Conflicts Found!'}</span>
                    </div>
                    <div className="space-y-1">
                      {approvalConflicts.map((c: any, idx: number) => (
                        <p key={idx} className="text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200">
                          {c.message}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">{isBangla ? 'কোনো কনফ্লিক্ট পাওয়া যায়নি (Clean Schedule)' : 'Zero Conflicts Detected'}</div>
                      <div className="text-[11px] text-emerald-700">
                        {approvalSuccessMsg || (isBangla ? 'রুটিনটি ত্রুটিমুক্ত এবং চূড়ান্ত প্রকাশের জন্য সম্পূর্ণ প্রস্তুত।' : 'Ready for publication.')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Change Summary Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'রুটিন সংস্করণের সারসংক্ষেপ ও পরিবর্তনের কারণ (বাধ্যতামূলক):' : 'Change Summary / Release Notes (Required):'}
                  </label>
                  <textarea
                    rows={2}
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    placeholder={isBangla ? 'উদা: সপ্তাহ ০১-০৪ ক্লাস ও ল্যাব সূচি চূড়ান্ত অনুমোদন ও প্রকাশ' : 'E.g., Routine release for Week 1-4...'}
                  />
                </div>

                {/* Important Notice */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    {isBangla
                      ? 'গুরুত্বপূর্ণ: ধাপ ২ নিশ্চিতকরণের পূর্বে শিক্ষার্থীদের কাছে কোনো রুটিন বা পরিবর্তন দৃশ্যমান হয় না। প্রকাশ নিশ্চিত করলে স্বয়ংক্রিয়ভাবে শিক্ষার্থীদের সিস্টেমে নোটিফিকেশন পাঠানো হবে এবং RoutineVersion এ স্ন্যাপশট সংরক্ষিত থাকবে।'
                      : 'Important: Routines are strictly hidden from students until Step 2 is confirmed. Confirming will notify students and create a version audit entry.'}
                  </span>
                </div>

                {/* Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#C2410C] focus:ring-[#C2410C] border-gray-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {isBangla
                      ? 'আমি ঘোষণা করছি যে শিক্ষক, ক্লাসরুম এবং সময়ের সকল তথ্য পর্যালোচনা করেছি এবং শিক্ষার্থীদের জন্য চূড়ান্ত প্রকাশনা নিশ্চিত করছি।'
                      : 'I certify that I have reviewed faculty and classroom allocations, and authorize final publication to students.'}
                  </span>
                </label>

                {/* Actions */}
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
                    disabled={isConfirmingStep2 || !confirmCheckbox || !changeSummary.trim()}
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

      {/* Routine Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#0F766E] animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center font-bold">
                  <History className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'রুটিন সংস্করণ ও অডিট ইতিহাস' : 'Routine Version & Audit History'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? 'প্রতিটি চূড়ান্ত রুটিন প্রকাশের অপরিবর্তনীয় স্ন্যাপশট ও ইতিহাস'
                      : 'Immutable snapshot log of every published routine version'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingVersions ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
                <p className="text-xs">{isBangla ? 'সংস্করণ ইতিহাস লোড হচ্ছে...' : 'Loading versions...'}</p>
              </div>
            ) : routineVersions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">{isBangla ? 'কোনো পূর্ববর্তী সংস্করণ পাওয়া যায়নি।' : 'No previous versions found.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {routineVersions.map((v) => (
                  <div key={v.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#0F766E] border border-teal-200">
                        সংস্করণ v{v.version_number}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(v.published_at).toLocaleString('bn-BD')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">{v.change_summary}</p>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>অনুমোদনকারী: <strong>{v.approved_by_name || 'কোঅর্ডিনেটর'}</strong></span>
                      <span>প্রকাশক: <strong>{v.published_by_name || 'কোঅর্ডিনেটর'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
