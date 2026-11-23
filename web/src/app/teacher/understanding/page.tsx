'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Star,
  Users,
  MessageSquare,
  BookOpen,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface SessionOption {
  id: number;
  subject_name?: string;
  topic?: number | null;
  topic_title?: string;
  batch_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
}

interface FeedbackSummary {
  session_id: number;
  average_rating: number;
  average_percentage: number;
  total_submitted: number;
  pending_feedbacks: number;
  bands: {
    '0-40%': number;
    '41-60%': number;
    '61-80%': number;
    '81-100%': number;
  };
}

interface FeedbackItem {
  id: number;
  student: number;
  student_name?: string;
  student_id_number?: string;
  understanding_rating: number;
  percentage?: number;
  understanding_band?: string;
  needs_help: boolean;
  student_comment?: string;
  submitted_at: string;
}

const BAND_COLORS = {
  '0-40%': '#DC2626', // Red
  '41-60%': '#EA580C', // Orange
  '61-80%': '#16A34A', // Green
  '81-100%': '#B45309', // Warm amber brand accent
};

export default function TopicUnderstandingPage() {
  const searchParams = useSearchParams();
  const preselectedSession = searchParams.get('sessionId');
  const { t, d, isBangla } = useLanguage();

  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    preselectedSession ? Number(preselectedSession) : null
  );

  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch available sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/api/v1/class-sessions/?status=published');
        let list: SessionOption[] = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (res.data?.results) list = res.data.results;
        else if (res.data?.data) list = res.data.data;

        setSessions(list);
        if (!selectedSessionId && list.length > 0) {
          setSelectedSessionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    fetchSessions();
  }, []);

  // 2. Fetch feedback summary and student comments for selected session
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchSessionFeedback = async () => {
      setLoading(true);
      try {
        // Fetch Summary
        const sumRes = await api.get(`/api/v1/class-sessions/${selectedSessionId}/feedback-summary/`);
        const sumData = sumRes.data?.data || sumRes.data;
        setSummary(sumData);

        // Fetch Individual Feedbacks
        const fbRes = await api.get(`/api/v1/class-sessions/${selectedSessionId}/feedbacks/`);
        const fbList = Array.isArray(fbRes.data)
          ? fbRes.data
          : fbRes.data?.results || fbRes.data?.data || [];
        setFeedbacks(fbList);
      } catch (err: any) {
        console.error('Failed to load feedback details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionFeedback();
  }, [selectedSessionId]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  // Prepare data for Recharts BarChart
  const chartData = summary?.bands
    ? [
        {
          band: isBangla ? '০-৪০% (উন্নতি চাই)' : '0-40% (Poor)',
          count: summary.bands['0-40%'] || 0,
          key: '0-40%',
          fill: BAND_COLORS['0-40%'],
        },
        {
          band: isBangla ? '৪১-৬০% (মাঝারি)' : '41-60% (Fair)',
          count: summary.bands['41-60%'] || 0,
          key: '41-60%',
          fill: BAND_COLORS['41-60%'],
        },
        {
          band: isBangla ? '৬১-৮০% (ভালো)' : '61-80% (Good)',
          count: summary.bands['61-80%'] || 0,
          key: '61-80%',
          fill: BAND_COLORS['61-80%'],
        },
        {
          band: isBangla ? '৮১-১০০% (চমৎকার)' : '81-100% (Full)',
          count: summary.bands['81-100%'] || 0,
          key: '81-100%',
          fill: BAND_COLORS['81-100%'],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Session Selector (Madrasat-us-Sunnah Warm Banner Architecture) */}
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2.5">
            <BarChart3 className="w-3.5 h-3.5 text-[#B45309]" />
            <span>{isBangla ? 'লার্নিং আউটকাম অ্যানালিটিক্স' : 'Learning Outcomes'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'টপিক বোঝাপড়া ও ফিডব্যাক অ্যানালিটিক্স' : 'Topic Understanding & Feedback'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-xl">
            {isBangla
              ? 'শিক্ষার্থীদের জমা দেওয়া ১০-১৫ সেকেন্ডের রেটিং ও লার্নিং ব্যান্ডের গ্রাফিকাল বিশ্লেষণ।'
              : 'Analyze understanding band distributions and student feedback for this session.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-white border border-[#FCD34D] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#B45309]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-white text-[#0F172A]">
                {s.subject_name || `Session #${s.id}`} - {s.topic_title || d(s.session_date)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Rating */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-amber-300/60 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'গড় রেটিং' : 'Average Rating'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Star className="w-4 h-4 fill-[#C1982E] text-[#C1982E]" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(summary?.average_rating ? summary.average_rating.toFixed(1) : '0.0')} <span className="text-sm font-semibold text-[#475569]">/ {d(5)}</span>
          </h3>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">● {isBangla ? '৫-তারকা স্কেলে রেটিং' : '5-star evaluation'}</p>
        </div>

        {/* Average Percentage */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#B45309]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'অনুধাবন শতাংশ' : 'Comprehension'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4 text-[#0369A1]" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(summary?.average_percentage ? summary.average_percentage.toFixed(1) : '0.0')}%
          </h3>
          <p className="text-[11px] text-[#B45309] font-semibold mt-1">● {isBangla ? 'ব্যান্ড অনুযায়ী অনুধাবন' : 'Overall comprehension'}</p>
        </div>

        {/* Total Submitted */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#016C90]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'প্রাপ্ত ফিডব্যাক' : 'Submitted Feedbacks'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#016C90] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(summary?.total_submitted || 0)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'জন' : ''}</span>
          </h3>
          <p className="text-[11px] text-[#016C90] font-semibold mt-1">● {isBangla ? '১০-১৫ সেকেন্ডের রেটিং' : 'Instant 10-15s ratings'}</p>
        </div>

        {/* Pending Feedbacks */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] hover:border-[#B45309]/40 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              {isBangla ? 'বাকি ফিডব্যাক' : 'Pending Feedbacks'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#0F172A] font-heading">
            {d(summary?.pending_feedbacks || 0)} <span className="text-sm font-semibold text-[#475569]">{isBangla ? 'জন' : ''}</span>
          </h3>
          <p className="text-[11px] text-[#B45309] font-semibold mt-1">● {isBangla ? 'অপেক্ষমাণ শিক্ষার্থী' : 'Awaiting responses'}</p>
        </div>
      </div>

      {/* Recharts Bar Chart: Understanding Band Distribution */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] font-heading">
              {isBangla ? 'আন্ডারস্ট্যান্ডিং ব্যান্ড ডিস্ট্রিবিউশন' : 'Understanding Band Distribution'}
            </h2>
            <p className="text-xs text-[#475569]">
              {isBangla
                ? 'শিক্ষার্থীদের রেটিং অনুযায়ী ৪টি ব্যান্ডের পরিসংখ্যান'
                : 'Count of students across 4 proficiency bands'}
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} জন শিক্ষার্থী`, 'সংখ্যা']}
                  contentStyle={{
                    borderRadius: '8px',
                    backgroundColor: '#1E293B',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Student Feedback Comments List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#0F172A] font-heading">
              {isBangla ? 'শিক্ষার্থীদের মন্তব্য ও রেটিং' : 'Student Comments & Ratings'}
            </h2>
          </div>
          <span className="text-xs text-[#475569]">
            {isBangla ? 'মোট মন্তব্য:' : 'Total Comments:'} <span className="font-bold text-[#0F172A]">{d(feedbacks.length)}</span>
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">{t('common.loading')}</div>
        ) : feedbacks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#475569]">
            {isBangla ? 'এই সেশনে এখনও কোনো শিক্ষার্থী মন্তব্য জমা দেয়নি।' : 'No feedback comments submitted yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#B45309]/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] flex items-center justify-center font-bold text-xs">
                      {fb.understanding_rating}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] leading-tight font-heading">
                        {fb.student_name || `Student #${fb.student}`}
                      </h4>
                      <p className="text-[10px] text-[#475569] font-mono">
                        {fb.student_id_number || `STD-${fb.student}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Stars visual */}
                    <div className="flex items-center text-[#C1982E]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < fb.understanding_rating
                              ? 'fill-[#C1982E] text-[#C1982E]'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {fb.needs_help && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">
                        {isBangla ? 'সাহায্য প্রয়োজন' : 'Needs Help'}
                      </span>
                    )}
                  </div>
                </div>

                {fb.student_comment ? (
                  <p className="text-xs text-[#334155] italic bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                    "{fb.student_comment}"
                  </p>
                ) : (
                  <p className="text-[11px] text-[#94A3B8] italic">
                    {isBangla ? 'কোনো মন্তব্য যোগ করা হয়নি।' : 'No written comment.'}
                  </p>
                )}

                <div className="text-[10px] text-[#94A3B8] text-right">
                  {d(new Date(fb.submitted_at).toLocaleTimeString(isBangla ? 'bn-BD' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
