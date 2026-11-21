'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  Sparkles,
  BookOpen,
  Send,
  RefreshCw,
  UserCheck,
  Building,
  Layers,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface StudentProfile {
  id: number;
  student_id_number: string;
  registration_no: string;
  full_name: string;
  phone: string;
  education_background: string;
  campus_name: string;
  current_batch_name: string;
  status: string;
}

interface AttendanceSummary {
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  approved_leave: number;
  attendance_percentage: number;
}

interface AttendanceRecord {
  id: number;
  session_date: string;
  subject_name: string;
  status: 'present' | 'late' | 'absent' | 'approved_leave';
  marked_at: string;
  reason?: string;
}

interface ClassSessionItem {
  id: number;
  subject_name: string;
  topic_title: string | null;
  teacher_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  audience: string;
  description?: string;
}

interface FeedbackRecord {
  id: number;
  session: number;
  session_date: string;
  subject_name: string;
  topic_title: string;
  understanding_rating: number;
  percentage: number;
  band: string;
  needs_help: boolean;
  student_comment?: string;
  submitted_at: string;
}

interface HelpRequestItem {
  id: number;
  subject_name: string;
  topic_title: string;
  teacher_name: string;
  student_message: string;
  teacher_note?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export default function StudentPortalPage() {
  const { isBangla } = useLanguage();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'help'>('today');

  // Feedback modal / card
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<ClassSessionItem | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackNeedsHelp, setFeedbackNeedsHelp] = useState<boolean>(false);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [profRes, attRes, sessRes, fbRes, helpRes] = await Promise.all([
        api.get('/students/me/'),
        api.get('/attendance/mine/'),
        api.get('/class-sessions/'),
        api.get('/feedback/mine/'),
        api.get('/help-requests/'),
      ]);

      setProfile(profRes.data?.data || profRes.data);
      setAttSummary(attRes.data?.summary || null);
      setAttRecords(attRes.data?.records || []);
      
      const sessList = Array.isArray(sessRes.data)
        ? sessRes.data
        : sessRes.data?.results || [];
      setSessions(sessList);

      const fbList = Array.isArray(fbRes.data) ? fbRes.data : [];
      setFeedbacks(fbList);

      const helpList = Array.isArray(helpRes.data)
        ? helpRes.data
        : helpRes.data?.results || [];
      setHelpRequests(helpList);
    } catch (err) {
      console.error('Error loading student portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForFeedback) return;

    setSubmittingFeedback(true);
    setFeedbackSuccessMsg(null);
    try {
      await api.post('/feedback/', {
        session: selectedSessionForFeedback.id,
        understanding_rating: feedbackRating,
        needs_help: feedbackNeedsHelp,
        student_comment: feedbackComment.trim(),
      });

      setFeedbackSuccessMsg(
        isBangla
          ? 'আলহামদুলিল্লাহ! আপনার ক্লাসের ফিডব্যাক সফলভাবে জমা হয়েছে।'
          : 'Alhamdulillah! Your session feedback has been submitted successfully.'
      );

      // Refresh feedbacks & help requests
      const [fbRes, helpRes] = await Promise.all([
        api.get('/feedback/mine/'),
        api.get('/help-requests/'),
      ]);
      setFeedbacks(Array.isArray(fbRes.data) ? fbRes.data : []);
      setHelpRequests(Array.isArray(helpRes.data) ? helpRes.data : helpRes.data?.results || []);

      setTimeout(() => {
        setSelectedSessionForFeedback(null);
        setFeedbackComment('');
        setFeedbackNeedsHelp(false);
        setFeedbackRating(5);
        setFeedbackSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          err?.response?.data?.error?.message ||
          (isBangla ? 'ফিডব্যাক জমা দিতে ব্যর্থ হয়েছে।' : 'Failed to submit feedback.')
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const safeFixed = (val: any, decimals = 1): string => {
    if (val === null || val === undefined || isNaN(Number(val))) return 'N/A';
    return Number(val).toFixed(decimals);
  };

  const ratingDescriptions: Record<number, { bn: string; en: string }> = {
    1: { bn: 'খুব কম বুঝেছি (১/৫)', en: 'Very Low Understanding (1/5)' },
    2: { bn: 'আংশিক বুঝেছি (২/৫)', en: 'Partial Understanding (2/5)' },
    3: { bn: 'মোটামুটি বুঝেছি (৩/৫)', en: 'Moderate Understanding (3/5)' },
    4: { bn: 'ভালো বুঝেছি (৪/৫)', en: 'Good Understanding (4/5)' },
    5: { bn: 'চমৎকারভাবে বুঝেছি (৫/৫)', en: 'Excellent Understanding (5/5)' },
  };

  // Check if student already gave feedback for a session
  const hasGivenFeedback = (sessionId: number) => {
    return feedbacks.some((fb) => fb.session === sessionId);
  };

  return (
    <div className="space-y-6">
      {/* Student Profile Hero Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-bold shadow-inner">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600/60 border border-emerald-400/30 text-emerald-100">
                  {profile?.current_batch_name || 'SBMC Batch 42'}
                </span>
                <span className="text-[11px] font-mono bg-white/15 px-2 py-0.5 rounded text-white/90">
                  {profile?.student_id_number || 'STD-2026-042-001'}
                </span>
              </div>
              <h1 className="text-2xl font-bold mt-1 tracking-tight">
                {profile?.full_name || 'Abdullah Student'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-200 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {profile?.campus_name || 'Kazi Bari Campus'}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {isBangla ? 'ব্যাকগ্রাউন্ড:' : 'Background:'} {profile?.education_background || 'General'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={loadStudentData}
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
            className="self-start md:self-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Attendance & Learning Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isBangla ? 'উপস্থিতি হার' : 'Attendance Rate'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-800">
              {safeFixed(attSummary?.attendance_percentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (attSummary?.attendance_percentage || 0) < 75
                  ? 'bg-rose-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(attSummary?.attendance_percentage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Present Days */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            {isBangla ? 'উপস্থিত দিন' : 'Present Sessions'}
          </span>
          <p className="text-3xl font-extrabold text-emerald-800 mt-2">
            {attSummary?.present || 0}{' '}
            <span className="text-sm font-normal text-gray-500">
              / {attSummary?.total_sessions || 0}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isBangla ? 'ক্লাসে উপস্থিত ছিলেন' : 'Attended successfully'}
          </p>
        </div>

        {/* Absent Days */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            {isBangla ? 'অনুপস্থিতি' : 'Absences'}
          </span>
          <p className="text-3xl font-extrabold text-rose-800 mt-2">
            {attSummary?.absent || 0}{' '}
            <span className="text-sm font-normal text-gray-500">
              {isBangla ? 'দিন' : 'days'}
            </span>
          </p>
          <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            {(attSummary?.absent || 0) >= 3
              ? isBangla ? 'সতর্কবার্তা: অনুপস্থিতি বেশি' : 'Warning: High absences'
              : isBangla ? 'স্বাভাবিক উপস্থিতি' : 'Normal range'}
          </p>
        </div>

        {/* Help Requests */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            {isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}
          </span>
          <p className="text-3xl font-extrabold text-blue-800 mt-2">
            {helpRequests.length}
          </p>
          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
            {helpRequests.filter((h) => h.status === 'resolved').length}{' '}
            {isBangla ? 'টি সমাধান হয়েছে' : 'resolved'}
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'today'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {isBangla ? 'আজকের ক্লাস ও পাঠ মূল্যায়ন' : "Today's Classes & Feedback"}
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isBangla ? 'উপস্থিতির হিস্ট্রি' : 'Attendance Log'}
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'help'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          {isBangla ? 'শিক্ষকের সহায়তা ও উত্তর' : 'Teacher Help Requests'}
          {helpRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {helpRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Today's Classes & Feedback */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {isBangla ? 'আপনার কোর্স ক্লাস সমূহ' : 'Your Scheduled Sessions'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? '১০-১৫ সেকেন্ডে ফিডব্যাক জমা দিন' : '10-15s Quick Feedback'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s) => {
              const given = hasGivenFeedback(s.id);
              const pastFeedback = feedbacks.find((fb) => fb.session === s.id);

              return (
                <div
                  key={s.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {s.subject_name}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm">
                      {s.topic_title || (isBangla ? 'সাধারণ ক্লাস সেশন' : 'General Session')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {isBangla ? 'তারিখ:' : 'Date:'} {s.session_date} • {isBangla ? 'শিক্ষক:' : 'Faculty:'}{' '}
                      <strong>{s.teacher_name}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    {given ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {isBangla ? 'ফিডব্যাক জমা হয়েছে' : 'Feedback Given'} (⭐{' '}
                          {pastFeedback?.understanding_rating}/5)
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedSessionForFeedback(s);
                          setFeedbackRating(5);
                          setFeedbackNeedsHelp(false);
                          setFeedbackComment('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        {isBangla ? 'ফিডব্যাক দিন' : 'Rate Class'}
                      </button>
                    )}

                    <span className="text-[11px] text-gray-400 capitalize">
                      {s.audience === 'all'
                        ? isBangla ? 'সকলের জন্য' : 'All Students'
                        : `${s.audience} module`}
                    </span>
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className="col-span-2 p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">
                  {isBangla ? 'বর্তমানে কোনো ক্লাস সেশন শিডিউল নেই' : 'No active sessions scheduled'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Attendance History */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              {isBangla ? 'উপস্থিতির বিস্তারিত রেকর্ড' : 'Detailed Attendance Records'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? `মোট ${attRecords.length}টি ক্লাস রেকর্ড` : `Total ${attRecords.length} records`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                  <th className="py-2.5 px-4">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="py-2.5 px-4">{isBangla ? 'বিষয়' : 'Subject'}</th>
                  <th className="py-2.5 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-2.5 px-4 text-right">{isBangla ? 'মন্তব্য' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-medium text-gray-900">
                      {rec.session_date}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-800">
                      {rec.subject_name}
                    </td>
                    <td className="py-2.5 px-4">
                      {rec.status === 'present' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {isBangla ? 'উপস্থিত' : 'Present'}
                        </span>
                      )}
                      {rec.status === 'late' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isBangla ? 'দেরিতে উপস্থিত' : 'Late'}
                        </span>
                      )}
                      {rec.status === 'absent' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          {isBangla ? 'অনুপস্থিত' : 'Absent'}
                        </span>
                      )}
                      {rec.status === 'approved_leave' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          {isBangla ? 'অনুমোদিত ছুটি' : 'Leave'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-500">
                      {rec.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Help Requests */}
      {activeTab === 'help' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              {isBangla ? 'আমার হেল্প রিকোয়েস্ট ও শিক্ষকের উত্তর' : 'Teacher Help Inquiries & Answers'}
            </h2>
            <span className="text-xs text-gray-500">
              {isBangla ? 'শিক্ষক উত্তর দিলে এখানে দেখতে পাবেন' : 'Teacher answers will appear here'}
            </span>
          </div>

          <div className="space-y-3">
            {helpRequests.map((hr) => (
              <div
                key={hr.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {hr.subject_name}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      {hr.topic_title}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      hr.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : hr.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hr.status === 'resolved'
                      ? isBangla ? 'সমাধান হয়েছে' : 'Resolved'
                      : hr.status === 'in_progress'
                      ? isBangla ? 'শিক্ষক পর্যালোচনা করছেন' : 'In Progress'
                      : isBangla ? 'অপেক্ষমান' : 'Pending'}
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                  <p className="text-gray-500 font-medium mb-1">
                    {isBangla ? 'আপনার প্রশ্ন / জিজ্ঞাসা:' : 'Your Question:'}
                  </p>
                  <p className="text-gray-800">{hr.student_message}</p>
                </div>

                {hr.teacher_note ? (
                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs">
                    <p className="text-emerald-800 font-bold flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      {hr.teacher_name} {isBangla ? 'এর সমাধান ও নির্দেশনা:' : 'Teacher Reply:'}
                    </p>
                    <p className="text-emerald-950 font-medium pl-5">{hr.teacher_note}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    {isBangla
                      ? 'শিক্ষক শীঘ্রই আপনার প্রশ্নটির উত্তর প্রদান করবেন।'
                      : 'Teacher will review and answer your request soon.'}
                  </p>
                )}
              </div>
            ))}

            {helpRequests.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                <HelpCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">
                  {isBangla ? 'কোনো সক্রিয় হেল্প রিকোয়েস্ট নেই' : 'No help requests found'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isBangla
                    ? 'ক্লাসের কোনো বিষয়ে সাহায্য লাগলে ফিডব্যাক জমা দেওয়ার সময় "সহায়তা প্রয়োজন" সিলেক্ট করুন।'
                    : 'Check "I need help" when rating a class if you need extra support.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Feedback Submission Modal (10-15s submittable) */}
      {selectedSessionForFeedback && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {isBangla ? 'ক্লাস ফিডব্যাক ও মূল্যায়ন' : 'Class Understanding Feedback'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {selectedSessionForFeedback.subject_name} • {selectedSessionForFeedback.session_date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSessionForFeedback(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {feedbackSuccessMsg ? (
              <div className="p-6 text-center text-emerald-800 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">{feedbackSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {/* 5-Star Rating Buttons */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {isBangla
                      ? 'আজকের পাঠ আপনি কেমন বুঝতে পেরেছেন?'
                      : 'How well did you understand this topic?'}
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setFeedbackRating(starVal)}
                        className={`flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                          feedbackRating >= starVal
                            ? 'bg-amber-50 border-2 border-amber-400 text-amber-700 shadow-2xs'
                            : 'bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            feedbackRating >= starVal
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                        <span className="text-[10px] font-bold">{starVal}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs font-bold text-emerald-800 mt-2">
                    {isBangla
                      ? ratingDescriptions[feedbackRating]?.bn
                      : ratingDescriptions[feedbackRating]?.en}
                  </p>
                </div>

                {/* Need Help Checkbox */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackNeedsHelp}
                      onChange={(e) => setFeedbackNeedsHelp(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">
                        {isBangla
                          ? 'আমার এই বিষয়ে শিক্ষকের ব্যক্তিগত সহায়তা প্রয়োজন'
                          : 'I need personal help/clarification from the teacher'}
                      </span>
                      <span className="text-[11px] text-amber-800 mt-0.5 block">
                        {isBangla
                          ? 'এটি টিক দিলে শিক্ষক আপনার জন্য একটি হেল্প রিকোয়েস্ট পাবেন।'
                          : 'Checking this opens an actionable help ticket for your teacher.'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Optional Comment / Question */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {feedbackNeedsHelp
                      ? isBangla
                        ? 'আপনার সুনির্দিষ্ট প্রশ্ন বা সমস্যা লিখুন (বাধ্যতামূলক):'
                        : 'Explain your specific problem (Required):'
                      : isBangla
                      ? 'অতিরিক্ত মন্তব্য (ঐচ্ছিক):'
                      : 'Additional Comments (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    required={feedbackNeedsHelp}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder={
                      feedbackNeedsHelp
                        ? isBangla
                          ? 'উদা: প্র্যাক্টিক্যাল করার সময় ৩য় ধাপে বুঝতে সমস্যা হচ্ছে...'
                          : 'E.g., Having trouble on step 3 in practical...'
                        : isBangla
                        ? 'আলহামদুলিল্লাহ ভালো ক্লাস হয়েছে...'
                        : 'Overall good session...'
                    }
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSessionForFeedback(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingFeedback ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isBangla ? 'ফিডব্যাক জমা দিন' : 'Submit Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
