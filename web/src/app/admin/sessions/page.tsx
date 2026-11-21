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
  published_at: string | null;
  cancel_reason?: string;
  description?: string;
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, batchesRes] = await Promise.all([
        api.get('/class-sessions/'),
        api.get('/batches/'),
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
      const res = await api.post(`/class-sessions/${session.id}/publish/`);
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
      await api.post(`/class-sessions/${cancellingSession.id}/cancel/`, {
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

      const res = await api.post('/class-schedules/generate-all-sessions/', payload);
      setGenerateResult(
        isBangla
          ? `সফলভাবে ${res.data.created_count || 0}টি সেশন তৈরি ও পাবলিশ করা হয়েছে!`
          : `Successfully created & published ${res.data.created_count || 0} sessions!`
      );
      // Refresh list
      const updatedSess = await api.get('/class-sessions/');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            {isBangla ? 'সেশন ও সময়সূচি নিয়ন্ত্রণ' : 'Session & Timetable Management'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isBangla ? 'ক্লাস সেশন ও রুটিন তালিকা' : 'Class Sessions & Timetable'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isBangla
              ? 'দৈনিক ও সাপ্তাহিক ক্লাস সূচি, ড্রাফট সেশন পাবলিশ এবং বাতিল কার্যক্রম পরিচালনা করুন।'
              : 'Manage daily/weekly schedules, publish draft sessions, or handle class cancellations.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGenerateResult(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            {isBangla ? 'শিডিউল থেকে সেশন তৈরি' : 'Auto-Generate Sessions'}
          </button>
          <button
            onClick={fetchInitialData}
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
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

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isBangla ? 'পাবলিশড (লাইভ)' : 'Published'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{publishedSessions}</p>
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
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id.toString()}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
            <option value="published">{isBangla ? 'পাবলিশড' : 'Published'}</option>
            <option value="draft">{isBangla ? 'ড্রাফট' : 'Draft'}</option>
            <option value="cancelled">{isBangla ? 'বাতিলকৃত' : 'Cancelled'}</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </div>
                    </td>

                    {/* Batch & Subject */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{s.subject_name}</div>
                      <div className="text-xs text-emerald-700 font-semibold mt-0.5">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {isBangla ? 'পাবলিশড' : 'Published'}
                        </span>
                      )}
                      {s.status === 'draft' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isBangla ? 'ড্রাফট' : 'Draft'}
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
                            onClick={() => handlePublish(s)}
                            disabled={actionLoadingId === s.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            {isBangla ? 'পাবলিশ' : 'Publish'}
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Play className="w-5 h-5 fill-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {isBangla ? 'শিডিউল থেকে সেশন তৈরি' : 'Generate Concrete Sessions'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isBangla
                      ? 'সাপ্তাহিক রুটিন টেমপ্লেট থেকে নির্দিষ্ট তারিখের জন্য সেশন জেনারেট করুন'
                      : 'Create concrete class sessions automatically from weekly schedules'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {generateResult && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">{isBangla ? 'সব সক্রিয় ব্যাচ' : 'All Active Batches'}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id.toString()}>
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
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-[11px] leading-relaxed">
                💡 {isBangla
                  ? 'এই প্রক্রিয়াটি স্বয়ংক্রিয়ভাবে শুধুমাত্র ক্লাস দিবসে (রবি-বৃহস্পতি) সক্রিয় রুটিন অনুযায়ী সেশন তৈরি করবে এবং পূর্বে প্রস্তুতকৃত কোনো সেশনের পুনরাবৃত্তি করবে না।'
                  : 'This process automatically generates sessions for school days according to active weekly schedules without duplicating existing sessions.'}
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
                  className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {isBangla ? 'জেনারেট হচ্ছে...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      {isBangla ? 'সেশন তৈরি শুরু করুন' : 'Start Generation'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
