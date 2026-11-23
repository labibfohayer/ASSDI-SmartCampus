'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Calendar,
  User,
  Layers,
  Filter,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardShell from '@/components/layout/DashboardShell';

interface AnnouncementItem {
  id: number;
  author_id: string;
  author_name: string;
  author_login_id: string;
  scope: 'Global' | 'Course' | 'Batch';
  target_course: number | null;
  target_course_name?: string;
  target_batch: number | null;
  target_batch_name?: string;
  title: string;
  content: string;
  is_active: boolean;
  published_at: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { isBangla, t } = useLanguage();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterScope, setFilterScope] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [scope, setScope] = useState<'Global' | 'Course' | 'Batch'>('Global');
  const [targetCourse, setTargetCourse] = useState<string>('');
  const [targetBatch, setTargetBatch] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Options for course/batch
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const canPublish = user?.role === 'super_admin' || user?.role === 'coordinator';

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/announcements/');
      const items = res.data.results || res.data || [];
      setAnnouncements(items);
    } catch (err: any) {
      toast.error(isBangla ? 'নোটিশ লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    if (!canPublish) return;
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        api.get('/api/v1/courses/'),
        api.get('/api/v1/batches/'),
      ]);
      setCourses(coursesRes.data.results || coursesRes.data || []);
      setBatches(batchesRes.data.results || batchesRes.data || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchOptions();
  }, [user]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(isBangla ? 'শিরোনাম ও বিস্তারিত বিবরণ উভয়ই আবশ্যক।' : 'Title and content are required.');
      return;
    }

    if (scope === 'Course' && !targetCourse) {
      toast.error(isBangla ? 'কোর্স নির্বাচন করা আবশ্যক।' : 'Course selection is required.');
      return;
    }

    if (scope === 'Batch' && !targetBatch) {
      toast.error(isBangla ? 'ব্যাচ নির্বাচন করা আবশ্যক।' : 'Batch selection is required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/v1/announcements/', {
        scope,
        target_course: scope === 'Course' ? parseInt(targetCourse) : null,
        target_batch: scope === 'Batch' ? parseInt(targetBatch) : null,
        title: title.trim(),
        content: content.trim(),
      });

      toast.success(isBangla ? 'বিজ্ঞপ্তি সফলভাবে প্রকাশিত হয়েছে!' : 'Announcement published successfully!');
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setTargetCourse('');
      setTargetBatch('');
      fetchAnnouncements();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.target_course || 'Error publishing notice';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(isBangla ? 'আপনি কি নিশ্চিত এই নোটিশটি ডিলিট করতে চান?' : 'Are you sure you want to delete this notice?')) {
      return;
    }

    try {
      await api.delete(`/api/v1/announcements/${id}/`);
      toast.success(isBangla ? 'নোটিশ মুছে ফেলা হয়েছে।' : 'Notice deleted.');
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error(isBangla ? 'নোটিশ মোছা সম্ভব হয়নি।' : 'Failed to delete notice.');
    }
  };

  const filteredList = announcements.filter((a) => {
    if (filterScope === 'all') return true;
    return a.scope.toLowerCase() === filterScope.toLowerCase();
  });

  const getScopeBadge = (item: AnnouncementItem) => {
    switch (item.scope) {
      case 'Global':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-white">
            {isBangla ? 'সার্বজনীন / Global' : 'Global Notice'}
          </span>
        );
      case 'Course':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#1B4D3E] text-white">
            {isBangla ? 'কোর্স:' : 'Course:'} {item.target_course_name || 'SBMC'}
          </span>
        );
      case 'Batch':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-800 text-white">
            {isBangla ? 'ব্যাচ:' : 'Batch:'} {item.target_batch_name || 'Batch'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardShell role={(user?.role as any) || 'student'}>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#FFFBEB] rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#0F172A]">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/90 border border-[#FCD34D] text-[#B45309] flex items-center justify-center shrink-0 shadow-xs">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border border-[#FCD34D] text-[11px] font-semibold text-[#92400E] mb-1 shadow-xs">
                <span>{isBangla ? 'অফিসিয়াল কমিউনিকেশন হাব' : 'Institutional Communications'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
                {isBangla ? 'প্রাতিষ্ঠানিক নোটিশ বোর্ড' : 'Institutional Notice Board'}
              </h1>
              <p className="text-xs sm:text-sm text-[#78350F] font-normal mt-0.5">
                {isBangla
                  ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের সকল আনুষ্ঠানিক ঘোষণা ও নোটিশ'
                  : 'Official notices and announcements of ASSDI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto relative z-10">
            <button
              onClick={fetchAnnouncements}
              className="p-2.5 rounded-xl bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] transition-colors cursor-pointer active:scale-95 shadow-xs"
              title={isBangla ? 'রিফ্রেশ' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#B45309]' : ''}`} />
            </button>

            {canPublish && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{isBangla ? 'নতুন নোটিশ দিন' : 'Publish Notice'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all', labelBn: 'সকল নোটিশ', labelEn: 'All Notices' },
            { id: 'global', labelBn: 'সার্বজনীন (Global)', labelEn: 'Global' },
            { id: 'course', labelBn: 'কোর্স নোটিশ', labelEn: 'Course' },
            { id: 'batch', labelBn: 'ব্যাচ নোটিশ', labelEn: 'Batch' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterScope(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterScope === tab.id
                  ? 'bg-[#FFFBEB] text-[#B45309] shadow-xs border border-[#FCD34D]'
                  : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-[#FFFBEB]'
              }`}
            >
              {isBangla ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Announcements List */}
        {loading && announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#B45309]" />
            <p>{isBangla ? 'নোটিশ লোড হচ্ছে...' : 'Loading announcements...'}</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">
              {isBangla ? 'কোনো নোটিশ পাওয়া যায়নি' : 'No announcements found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isBangla ? 'নতুন কোনো নোটিশ জারি করা হলে এখানে দেখতে পাবেন।' : 'New announcements will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((item) => {
              const canDelete = user?.role === 'super_admin' || user?.login_id === item.author_login_id;

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs transition-all hover:border-[#CCFBF1]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {getScopeBadge(item)}
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(item.published_at).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}</span>
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {item.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700">
                          {item.author_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.author_login_id}
                        </p>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={isBangla ? 'ডিলিট করুন' : 'Delete notice'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="pt-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {item.content}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Publish Notice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] flex items-center justify-center font-bold">
                    <Megaphone className="w-4 h-4 text-[#B45309]" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {isBangla ? 'নতুন নোটিশ প্রকাশ করুন' : 'Publish New Notice'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="p-5 sm:p-6 space-y-4">
                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isBangla ? 'নোটিশের পরিধি / Scope' : 'Notice Scope'}
                  </label>
                  <select
                    value={scope}
                    onChange={(e: any) => setScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                  >
                    {user?.role === 'super_admin' && (
                      <option value="Global">{isBangla ? 'সার্বজনীন (Global - সকল শিক্ষার্থী ও শিক্ষক)' : 'Global (All Users)'}</option>
                    )}
                    <option value="Course">{isBangla ? 'কোর্স ভিত্তিক (Course)' : 'Course Specific'}</option>
                    <option value="Batch">{isBangla ? 'ব্যাচ ভিত্তিক (Batch)' : 'Batch Specific'}</option>
                  </select>
                </div>

                {/* Target Course (if Scope == Course) */}
                {scope === 'Course' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isBangla ? 'কোর্স নির্বাচন করুন *' : 'Select Target Course *'}
                    </label>
                    <select
                      value={targetCourse}
                      onChange={(e) => setTargetCourse(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                    >
                      <option value="">{isBangla ? '-- কোর্স বেছে নিন --' : '-- Choose Course --'}</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Target Batch (if Scope == Batch) */}
                {scope === 'Batch' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isBangla ? 'ব্যাচ নির্বাচন করুন *' : 'Select Target Batch *'}
                    </label>
                    <select
                      value={targetBatch}
                      onChange={(e) => setTargetBatch(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                    >
                      <option value="">{isBangla ? '-- ব্যাচ বেছে নিন --' : '-- Choose Batch --'}</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (Batch #{b.batch_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isBangla ? 'নোটিশের শিরোনাম *' : 'Notice Title *'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder={isBangla ? 'যেমন: আগামী রবিবার ক্লাসের বিশেষ সময়সূচি' : 'e.g., Special class schedule next Sunday'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isBangla ? 'বিস্তারিত বিবরণ *' : 'Detailed Content *'}
                  </label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    placeholder={isBangla ? 'এখানে বিস্তারিত নোটিশ বা নির্দেশনা লিখুন...' : 'Write detailed announcement here...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting ? (isBangla ? 'প্রকাশ হচ্ছে...' : 'Publishing...') : (isBangla ? 'নোটিশ প্রকাশ করুন' : 'Publish Notice')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
