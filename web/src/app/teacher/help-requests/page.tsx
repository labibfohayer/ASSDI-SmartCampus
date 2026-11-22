'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  Clock,
  Play,
  CheckCircle,
  MessageSquare,
  User,
  BookOpen,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface HelpRequest {
  id: number;
  session: number;
  student: number;
  student_name?: string;
  student_id_number?: string;
  batch_name?: string;
  subject_name?: string;
  topic_title?: string;
  student_comment: string;
  status: 'pending' | 'in_progress' | 'resolved';
  teacher_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export default function TeacherHelpRequestsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { t, d, isBangla } = useLanguage();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  // Resolve modal state
  const [resolvingItem, setResolvingItem] = useState<HelpRequest | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const fetchHelpRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/help-requests/');
      const data = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.data || [];
      setRequests(data);
    } catch (err) {
      console.error('Failed to load help requests:', err);
      toast.error(isBangla ? 'হেল্প রিকোয়েস্ট লোড করা যায়নি' : 'Failed to load help requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpRequests();
  }, []);

  // Action: Start helping (move from pending -> in_progress)
  const handleStartHelping = async (requestId: number) => {
    try {
      await api.post(`/api/v1/help-requests/${requestId}/start/`);
      toast.success(isBangla ? 'সহায়তা প্রদান শুরু করা হয়েছে!' : 'Marked as In-Progress');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification-refresh'));
      }
      fetchHelpRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to start');
    }
  };

  // Action: Open resolve modal
  const openResolveModal = (req: HelpRequest) => {
    setResolvingItem(req);
    setTeacherNotes('');
  };

  // Action: Submit resolution with teacher notes
  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;

    if (!teacherNotes.trim()) {
      toast.error(isBangla ? 'অনুগ্রহ করে সমাধানের নোট বা মন্তব্য লিখুন।' : 'Please enter resolution notes.');
      return;
    }

    setSubmittingResolution(true);
    try {
      await api.post(`/api/v1/help-requests/${resolvingItem.id}/resolve/`, {
        teacher_notes: teacherNotes.trim(),
      });
      toast.success(isBangla ? 'রিকোয়েস্ট সফলভাবে সমাধান হিসেবে চিহ্নিত হয়েছে!' : 'Resolved successfully!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification-refresh'));
      }
      setResolvingItem(null);
      fetchHelpRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to resolve');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const pendingList = requests.filter((r) => r.status === 'pending');
  const inProgressList = requests.filter((r) => r.status === 'in_progress');
  const resolvedList = requests.filter((r) => r.status === 'resolved');

  const displayedList =
    activeTab === 'all'
      ? requests
      : activeTab === 'pending'
      ? pendingList
      : activeTab === 'in_progress'
      ? inProgressList
      : resolvedList;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0F766E] p-6 sm:p-7 rounded-2xl border border-[#0D9488] text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(#14B8A6_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-white mb-2.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#C1982E]" />
            <span>{isBangla ? 'শিক্ষার্থী সাপোর্ট ডেস্ক' : 'Student Support Desk'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading">
            {isBangla ? 'শিক্ষার্থী হেল্প রিকোয়েস্ট বোর্ড' : 'Student Help Requests Board'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-50 mt-1 max-w-xl">
            {isBangla
              ? 'ক্লাস শেষে শিক্ষার্থীরা যেসব প্রশ্ন বা সমস্যার সমাধান চেয়ে অনুরোধ জানিয়েছে তা তদারকি করুন।'
              : 'Review and resolve questions/requests submitted by students during daily feedback.'}
          </p>
        </div>

        {/* Tab Filter Segmented Controls */}
        <div className="flex items-center gap-1 bg-[#0D9488] border border-teal-500/30 p-1.5 rounded-xl relative z-10">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-teal-100 hover:text-white'
            }`}
          >
            {isBangla ? 'সকল' : 'All'} ({d(requests.length)})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-200 hover:text-white'
            }`}
          >
            {isBangla ? 'অমীমাংসিত' : 'Pending'} ({d(pendingList.length)})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'in_progress' ? 'bg-[#016C90] text-white shadow-xs' : 'text-sky-200 hover:text-white'
            }`}
          >
            {isBangla ? 'চলমান' : 'In Progress'} ({d(inProgressList.length)})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'resolved' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-emerald-200 hover:text-white'
            }`}
          >
            {isBangla ? 'সমাধানকৃত' : 'Resolved'} ({d(resolvedList.length)})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">{t('common.loading')}</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">
            {isBangla ? 'কোনো হেল্প রিকোয়েস্ট পাওয়া যায়নি' : 'No Help Requests Found'}
          </h3>
          <p className="text-xs text-gray-500">
            {isBangla
              ? 'এই ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় হেল্প রিকোয়েস্ট নেই।'
              : 'There are currently no requests under this status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((req) => {
            const isHighlighted = highlightId && Number(highlightId) === req.id;
            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl p-5 border transition shadow-xs flex flex-col justify-between space-y-4 ${
                  isHighlighted
                    ? 'border-[#0F766E] ring-2 ring-[#0F766E]/30'
                    : req.status === 'pending'
                    ? 'border-amber-200 bg-amber-50/20'
                    : req.status === 'in_progress'
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-[#E2E8F0]'
                }`}
              >
                {/* Header: Student & Status Badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A] leading-tight font-heading">
                          {req.student_name || `Student #${req.student}`}
                        </h4>
                        <p className="text-[10px] text-[#475569] font-mono">
                          {req.student_id_number || `STD-${req.student}`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'in_progress'
                          ? 'bg-[#F0FDFA] text-[#016C90] border border-[#CCFBF1]'
                          : 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                      }`}
                    >
                      {req.status === 'pending'
                        ? isBangla
                          ? 'অমীমাংসিত'
                          : 'Pending'
                        : req.status === 'in_progress'
                        ? isBangla
                          ? 'চলমান'
                          : 'In Progress'
                        : isBangla
                        ? 'সমাধানকৃত'
                        : 'Resolved'}
                    </span>
                  </div>

                  {/* Subject & Topic Tag */}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] bg-[#F0FDFA] px-2.5 py-1 rounded-lg border border-[#CCFBF1]">
                    <BookOpen className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span className="font-semibold truncate">
                      {req.topic_title || req.subject_name || 'SBMC'}
                    </span>
                  </div>

                  {/* Student Question / Comment Box */}
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <p className="text-xs text-[#334155] italic leading-relaxed">
                      "{req.student_comment}"
                    </p>
                  </div>

                  {/* Teacher Resolution Notes (If Resolved) */}
                  {req.status === 'resolved' && req.teacher_notes && (
                    <div className="p-3 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] space-y-1">
                      <p className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wide">
                        {isBangla ? 'শিক্ষকের সমাধান নোট:' : 'Teacher Resolution Note:'}
                      </p>
                      <p className="text-xs text-[#0F172A] leading-relaxed font-medium">
                        {req.teacher_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer: Date & Actions */}
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{d(new Date(req.created_at).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US'))}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleStartHelping(req.id)}
                        className="px-3 py-1.5 bg-[#016C90] hover:bg-[#035977] text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>{isBangla ? 'সহায়তা শুরু' : 'Start'}</span>
                      </button>
                    )}

                    {(req.status === 'pending' || req.status === 'in_progress') && (
                      <button
                        type="button"
                        onClick={() => openResolveModal(req)}
                        className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>{isBangla ? 'সমাধান সম্পন্ন' : 'Resolve'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8F0] border-t-4 border-t-[#C1982E] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2 font-heading">
                <CheckCircle className="w-5 h-5 text-[#0F766E]" />
                <span>{isBangla ? 'হেল্প রিকোয়েস্ট সমাধান' : 'Resolve Help Request'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setResolvingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <p className="font-extrabold text-[#0F172A]">
                  {resolvingItem.student_name} ({resolvingItem.student_id_number}):
                </p>
                <p className="italic text-[#334155] mt-1">"{resolvingItem.student_comment}"</p>
              </div>

              <form onSubmit={handleSubmitResolve} className="space-y-4 pt-2">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    {isBangla ? 'সমাধানের বিবরণ / শিক্ষকের নোট:' : 'Resolution Note / Action Taken:'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder={
                      isBangla
                        ? 'যেমন: ক্লাসের পর সরাসরি ল্যাবে ফর্মুলা প্রয়োগ করে সমস্যাটি সমাধান করে দেয়া হয়েছে।'
                        : 'Explain how you resolved this question for the student...'
                    }
                    className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResolvingItem(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResolution}
                    className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {submittingResolution ? (
                      isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'
                    ) : (
                      isBangla ? 'সমাধান নিশ্চিত করুন' : 'Confirm Resolution'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
