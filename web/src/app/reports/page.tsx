'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  BarChart3,
  Users,
  Layers,
  BookOpen,
  UserCheck,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ArrowRight,
  Clock,
  Star,
} from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import MultiFormatExportDropdown from '@/components/common/MultiFormatExportDropdown';

type ReportKey =
  | 'daily-attendance'
  | 'daily-learning-progress'
  | 'weekly-progress'
  | 'monthly-student-performance'
  | 'batch-wise-performance'
  | 'topic-wise-understanding'
  | 'teacher-wise'
  | 'student-help-requests'
  | 'repeated-absences';

interface ReportMeta {
  key: ReportKey;
  endpoint: string;
  filename: string;
  icon: any;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  badgeBn: string;
  badgeEn: string;
}

const REPORT_DEFINITIONS: ReportMeta[] = [
  {
    key: 'daily-attendance',
    endpoint: 'reports/daily-attendance/',
    filename: 'daily_attendance_report',
    icon: CheckCircle2,
    titleBn: '১. দৈনিক উপস্থিতি রিপোর্ট',
    titleEn: '1. Daily Attendance Report',
    descBn: 'নির্দিষ্ট দিনের সেশনভিত্তিক উপস্থিতি, বিলম্ব ও অনুপস্থিতির বিশদ বিবরণ।',
    descEn: 'Breakdown of attendance across sessions for a given date.',
    badgeBn: 'দৈনিক উপস্থিতি',
    badgeEn: 'Daily Attendance',
  },
  {
    key: 'daily-learning-progress',
    endpoint: 'reports/daily-learning-progress/',
    filename: 'daily_learning_progress_report',
    icon: BarChart3,
    titleBn: '২. দৈনিক লার্নিং প্রগ্রেস রিপোর্ট',
    titleEn: '2. Daily Learning Progress Report',
    descBn: 'শ্রেণিকক্ষে টপিক অনুধাবন রেটিং, ব্যান্ড ডিস্ট্রিবিউশন ও শিক্ষার্থীর সন্তুষ্টি।',
    descEn: 'Topic feedback ratings, understanding bands, and student comprehension.',
    badgeBn: 'লার্নিং প্রগ্রেস',
    badgeEn: 'Learning Progress',
  },
  {
    key: 'weekly-progress',
    endpoint: 'reports/weekly-progress/',
    filename: 'weekly_progress_report',
    icon: Calendar,
    titleBn: '৩. সাপ্তাহিক অগ্রগতি ট্রেন্ড',
    titleEn: '3. Weekly Progress Trend Report',
    descBn: 'সাপ্তাহিক ক্লাসের ট্রেন্ড, সামগ্রিক উপস্থিতি ও ফিডব্যাক সূচক।',
    descEn: 'Multi-day trend of classes, attendance rates, and feedback averages.',
    badgeBn: 'সাপ্তাহিক ট্রেন্ড',
    badgeEn: 'Weekly Trend',
  },
  {
    key: 'monthly-student-performance',
    endpoint: 'reports/monthly-student-performance/',
    filename: 'monthly_student_performance_report',
    icon: Users,
    titleBn: '৪. মাসিক শিক্ষার্থী পারফরম্যান্স',
    titleEn: '4. Monthly Student Performance',
    descBn: 'প্রত্যেক শিক্ষার্থীর মাসিক উপস্থিতি হার, গড় রেটিং ও ড্রপআউট ঝুঁকি পর্যবেক্ষণ।',
    descEn: 'Individual student cumulative attendance, ratings, and status.',
    badgeBn: 'শিক্ষার্থী রিপোর্ট',
    badgeEn: 'Student Performance',
  },
  {
    key: 'batch-wise-performance',
    endpoint: 'reports/batch-wise-performance/',
    filename: 'batch_wise_performance_report',
    icon: Layers,
    titleBn: '৫. ব্যাচভিত্তিক তুলনামূলক রিপোর্ট',
    titleEn: '5. Batch-Wise Performance Report',
    descBn: 'বিভিন্ন ব্যাচের মধ্যে উপস্থিতি ও সামগ্রিক ফলাফলের তুলনামূলক পর্যালোচনা।',
    descEn: 'Cross-batch comparison of attendance and feedback metrics.',
    badgeBn: 'ব্যাচ তুলনা',
    badgeEn: 'Batch Comparison',
  },
  {
    key: 'topic-wise-understanding',
    endpoint: 'reports/topic-wise-understanding/',
    filename: 'topic_wise_understanding_report',
    icon: BookOpen,
    titleBn: '৬. পাঠ্যসূচি ও টপিকভিত্তিক বোধগম্যতা',
    titleEn: '6. Topic-Wise Understanding Report',
    descBn: 'পাঠ্যক্রমের প্রতিটি অধ্যায়ের বোধগম্যতা স্কোর এবং দুর্বল টপিক চিহ্নিতকরণ।',
    descEn: 'Feedback scores and band distributions per curriculum topic.',
    badgeBn: 'টপিক বোধগম্যতা',
    badgeEn: 'Topic Understanding',
  },
  {
    key: 'teacher-wise',
    endpoint: 'reports/teacher-wise/',
    filename: 'teacher_wise_report',
    icon: UserCheck,
    titleBn: '৭. শিক্ষকভিত্তিক পাঠদান ও রেটিং রিপোর্ট',
    titleEn: '7. Teacher-Wise Performance Report',
    descBn: 'শিক্ষকভিত্তিক পরিচালিত ক্লাস সংখ্যা, শিক্ষার্থী মূল্যায়ন রেটিং ও হেল্প সমাধান।',
    descEn: 'Supervisory review of classes conducted and student feedback ratings.',
    badgeBn: 'শিক্ষক মূল্যায়ন',
    badgeEn: 'Faculty Review',
  },
  {
    key: 'student-help-requests',
    endpoint: 'reports/student-help-requests/',
    filename: 'student_help_requests_report',
    icon: HelpCircle,
    titleBn: '৮. শিক্ষার্থী হেল্প ও সাপোর্ট রিপোর্ট',
    titleEn: '8. Student Help Requests Report',
    descBn: 'শিক্ষার্থীদের জিজ্ঞাসা, অপেক্ষমান প্রশ্নের সংখ্যা ও সমাধানের সার্বিক অবস্থা।',
    descEn: 'Track student clarification and follow-up requests across topics.',
    badgeBn: 'হেল্প রিকোয়েস্ট',
    badgeEn: 'Help Requests',
  },
  {
    key: 'repeated-absences',
    endpoint: 'reports/repeated-absences/',
    filename: 'repeated_absences_report',
    icon: AlertTriangle,
    titleBn: '৯. ঝুঁকিপূর্ণ ও ক্রমাগত অনুপস্থিতি রিপোর্ট',
    titleEn: '9. Repeated Absences & At-Risk Alert',
    descBn: 'টানা বা অতিরিক্ত অনুপস্থিত শিক্ষার্থীদের প্রাথমিক সতর্কবার্তা ও ট্র্যাকিং।',
    descEn: 'Identify students with persistent or consecutive absences.',
    badgeBn: 'অনুপস্থিতি অ্যালার্ট',
    badgeEn: 'At-Risk Alert',
  },
];

interface BatchOption {
  id: number;
  name: string;
  code: string;
}

export default function ReportsPage() {
  const { isBangla } = useLanguage();

  const [activeReportKey, setActiveReportKey] = useState<ReportKey>('daily-attendance');
  const [reportData, setReportData] = useState<any>(null);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterDate, setFilterDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filterBatch, setFilterBatch] = useState<string>('');
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterMonth, setFilterMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterThresholdConsecutive, setFilterThresholdConsecutive] = useState<number>(3);
  const [filterThresholdTotal, setFilterThresholdTotal] = useState<number>(5);
  const [filterHelpStatus, setFilterHelpStatus] = useState<string>('');

  const currentReport = REPORT_DEFINITIONS.find((r) => r.key === activeReportKey)!;

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [activeReportKey]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/api/v1/batches/');
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setBatches(data);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const buildQueryParams = () => {
    const params: Record<string, string> = {};

    switch (activeReportKey) {
      case 'daily-attendance':
      case 'daily-learning-progress':
        if (filterDate) params.date = filterDate;
        if (filterBatch) params.batch = filterBatch;
        break;

      case 'weekly-progress':
        if (filterDateFrom) params.week_start = filterDateFrom;
        if (filterDateTo) params.week_end = filterDateTo;
        if (filterBatch) params.batch = filterBatch;
        break;

      case 'monthly-student-performance':
        params.year = filterYear.toString();
        params.month = filterMonth.toString();
        if (filterBatch) params.batch = filterBatch;
        break;

      case 'batch-wise-performance':
        if (filterBatch) params.batch = filterBatch;
        if (filterDateFrom) params.date_from = filterDateFrom;
        if (filterDateTo) params.date_to = filterDateTo;
        break;

      case 'topic-wise-understanding':
        if (filterBatch) params.batch = filterBatch;
        break;

      case 'teacher-wise':
        if (filterDateFrom) params.date_from = filterDateFrom;
        if (filterDateTo) params.date_to = filterDateTo;
        break;

      case 'student-help-requests':
        if (filterHelpStatus) params.status = filterHelpStatus;
        if (filterBatch) params.batch = filterBatch;
        if (filterDateFrom) params.date_from = filterDateFrom;
        if (filterDateTo) params.date_to = filterDateTo;
        break;

      case 'repeated-absences':
        if (filterBatch) params.batch = filterBatch;
        params.threshold_consecutive = filterThresholdConsecutive.toString();
        params.threshold_total = filterThresholdTotal.toString();
        break;
    }

    return params;
  };

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams();
      const res = await api.get(currentReport.endpoint, { params });
      setReportData(res.data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(
        isBangla
          ? 'রিপোর্ট তথ্য লোড করতে ব্যর্থ হয়েছে।'
          : 'Failed to load report data.'
      );
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    setExportingFormat(format);
    try {
      const token = getAccessToken();
      const queryParams = buildQueryParams();
      queryParams.export = format;

      const queryString = new URLSearchParams(queryParams).toString();
      const baseUrl = API_BASE;
      const downloadEndpoint = `${baseUrl}/api/v1/${currentReport.endpoint}?${queryString}`;

      const response = await fetch(downloadEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const disposition = response.headers.get('content-disposition');
      let filename = `${currentReport.filename}.${format}`;
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(
        isBangla
          ? 'ফাইল ডাউনলোড করতে সমস্যা হয়েছে। সার্ভার স্ট্যাটাস পরীক্ষা করুন।'
          : 'Failed to download file. Please try again.'
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const ActiveIcon = currentReport.icon;

  const safeFixed = (val: any, decimals = 1): string => {
    if (val === null || val === undefined || isNaN(Number(val))) return 'N/A';
    return Number(val).toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative z-20">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#FCD34D] text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
            {isBangla ? 'অফিসিয়াল এসআরএস রিপোর্টিং সিস্টেম' : 'Official SRS Reporting Engine'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? '৯টি এসআরএস রিপোর্টস হাব' : 'SRS Reports Hub'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1.5 max-w-2xl">
            {isBangla
              ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের প্রাতিষ্ঠানিক ৯টি এসআরএস রিপোর্ট প্রিভিউ ও এক ক্লিকে পিডিএফ / এক্সেল এক্সপোর্ট।'
              : 'Live on-screen previews and 1-click official PDF / Excel exports for all 9 SRS reports.'}
          </p>
        </div>

        {/* Multi-Format Export Options */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <MultiFormatExportDropdown
            endpoint={currentReport.endpoint}
            queryParams={buildQueryParams()}
            baseFilename={currentReport.filename}
            disabled={loading}
          />

          <button
            onClick={() => handleDownload('pdf')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-700/90 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {exportingFormat === 'pdf' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isBangla ? 'কুইক পিডিএফ' : 'Quick PDF'}</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs (Grid of 9) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_DEFINITIONS.map((r) => {
          const Icon = r.icon;
          const isActive = r.key === activeReportKey;

          return (
            <button
              key={r.key}
              onClick={() => setActiveReportKey(r.key)}
              className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                isActive
                  ? 'bg-[#FFFBEB] text-[#0F172A] border-[#FCD34D] shadow-md ring-2 ring-[#B45309]/50'
                  : 'bg-white hover:bg-[#FFFBEB]/50 border-slate-200/90 hover:border-[#0D9488]/30 text-slate-800 shadow-xs'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-[#FEF3C7] text-[#0F766E] border border-[#FCD34D]' : 'bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#0F766E] text-white border border-[#92400E]'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {isBangla ? r.badgeBn : r.badgeEn}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#B45309] animate-pulse" />
                  )}
                </div>
                <h3
                  className={`text-xs font-extrabold truncate leading-snug ${
                    isActive ? 'text-[#0F172A]' : 'text-slate-900'
                  }`}
                >
                  {isBangla ? r.titleBn : r.titleEn}
                </h3>
                <p
                  className={`text-[11px] line-clamp-1 mt-0.5 ${
                    isActive ? 'text-[#78350F]' : 'text-slate-500'
                  }`}
                >
                  {isBangla ? r.descBn : r.descEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] flex items-center justify-center shrink-0">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                {isBangla ? currentReport.titleBn : currentReport.titleEn}
              </h2>
              <p className="text-xs text-slate-500">
                {isBangla ? currentReport.descBn : currentReport.descEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadReportData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C1982E]' : ''}`} />
              <span>{isBangla ? 'রিপোর্ট রিফ্রেশ' : 'Run Report'}</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {/* Daily Reports: Date */}
          {(activeReportKey === 'daily-attendance' ||
            activeReportKey === 'daily-learning-progress') && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                {isBangla ? 'তারিখ নির্বাচন:' : 'Select Date:'}
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          )}

          {/* Date Range: Weekly, Batch, Teacher, Help */}
          {(activeReportKey === 'weekly-progress' ||
            activeReportKey === 'batch-wise-performance' ||
            activeReportKey === 'teacher-wise' ||
            activeReportKey === 'student-help-requests') && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'শুরুর তারিখ (From):' : 'Date From:'}
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'শেষের তারিখ (To):' : 'Date To:'}
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </>
          )}

          {/* Monthly Report: Year & Month */}
          {activeReportKey === 'monthly-student-performance' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'বছর (Year):' : 'Year:'}
                </label>
                <input
                  type="number"
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'মাস (Month):' : 'Month:'}
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  {[
                    'জানুয়ারি / January',
                    'ফেব্রুয়ারি / February',
                    'মার্চ / March',
                    'এপ্রিল / April',
                    'মে / May',
                    'জুন / June',
                    'জুলাই / July',
                    'আগস্ট / August',
                    'সেপ্টেম্বর / September',
                    'অক্টোবর / October',
                    'নভেম্বর / November',
                    'ডিসেম্বর / December',
                  ].map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1} - {mName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Batch Selector (Applicable to most) */}
          {activeReportKey !== 'teacher-wise' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                {isBangla ? 'ব্যাচ ফিল্টার:' : 'Filter Batch:'}
              </label>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Help Request Status */}
          {activeReportKey === 'student-help-requests' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                {isBangla ? 'স্ট্যাটাস ফিল্টার:' : 'Filter Status:'}
              </label>
              <select
                value={filterHelpStatus}
                onChange={(e) => setFilterHelpStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                <option value="pending">{isBangla ? 'অপেক্ষমান (Pending)' : 'Pending'}</option>
                <option value="in_progress">
                  {isBangla ? 'চলমান (In Progress)' : 'In Progress'}
                </option>
                <option value="resolved">{isBangla ? 'সমাধানকৃত (Resolved)' : 'Resolved'}</option>
              </select>
            </div>
          )}

          {/* Repeated Absences Thresholds */}
          {activeReportKey === 'repeated-absences' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'টানা অনুপস্থিতি থ্রেশহোল্ড:' : 'Consecutive Threshold:'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={filterThresholdConsecutive}
                  onChange={(e) => setFilterThresholdConsecutive(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  {isBangla ? 'মোট অনুপস্থিতি থ্রেশহোল্ড:' : 'Total Absences Threshold:'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={filterThresholdTotal}
                  onChange={(e) => setFilterThresholdTotal(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Report Body / Live Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-3" />
            <p className="font-semibold text-gray-700">
              {isBangla ? 'রিপোর্ট ডাটা প্রস্তুত করা হচ্ছে...' : 'Generating report preview...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isBangla ? 'অনুগ্রহ করে অপেক্ষা করুন।' : 'Please wait.'}
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p>{isBangla ? 'কোন ডাটা পাওয়া যায়নি।' : 'No data available.'}</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 1. Daily Attendance Report Preview */}
            {activeReportKey === 'daily-attendance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {isBangla ? 'মোট ক্লাস সেশন' : 'Total Sessions'}
                    </span>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {reportData.total_sessions || 0}
                    </p>
                  </div>
                  <div className="bg-[#F0FDFA] p-4 rounded-xl border border-[#CCFBF1]">
                    <span className="text-xs text-[#0F766E] font-medium">
                      {isBangla ? 'উপস্থিতি হার' : 'Attendance Rate'}
                    </span>
                    <p className="text-xl font-bold text-[#0F766E] mt-1">
                      {safeFixed(reportData.attendance_percentage)}%
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">
                      {isBangla ? 'মোট উপস্থিতি' : 'Present / Late'}
                    </span>
                    <p className="text-xl font-bold text-blue-800 mt-1">
                      {reportData.present_count || 0} / {reportData.late_count || 0}
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <span className="text-xs text-rose-700 font-medium">
                      {isBangla ? 'মোট অনুপস্থিত' : 'Absent Count'}
                    </span>
                    <p className="text-xl font-bold text-rose-800 mt-1">
                      {reportData.absent_count || 0}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">
                          {isBangla ? 'সেশন ও বিষয়' : 'Session & Subject'}
                        </th>
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষক' : 'Teacher'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'উপস্থিত' : 'Present'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'দেরিতে' : 'Late'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'অনুপস্থিত' : 'Absent'}</th>
                        <th className="py-2.5 px-3 text-right">
                          {isBangla ? 'উপস্থিতি হার' : 'Rate'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.sessions || []).map((s: any) => (
                        <tr key={s.session_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {s.subject_name}
                            <span className="block text-[11px] font-normal text-gray-500">
                              {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#0F766E] font-medium">
                            {s.batch_name}
                          </td>
                          <td className="py-2.5 px-3 text-gray-700">{s.teacher_name}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#0F766E]">
                            {s.present_count}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-amber-600">
                            {s.late_count}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-rose-600">
                            {s.absent_count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0F766E]">
                            {safeFixed(s.attendance_percentage)}%
                          </td>
                        </tr>
                      ))}
                      {(reportData.sessions || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            {isBangla ? 'এই তারিখে কোনো সেশন রেকর্ড নেই।' : 'No session records found for this date.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Daily Learning Progress Preview */}
            {activeReportKey === 'daily-learning-progress' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {isBangla ? 'মোট ফিডব্যাক' : 'Total Feedbacks'}
                    </span>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {reportData.total_feedbacks || 0}
                    </p>
                  </div>
                  <div className="bg-[#F0FDFA] p-4 rounded-xl border border-[#CCFBF1]">
                    <span className="text-xs text-[#0F766E] font-medium">
                      {isBangla ? 'গড় রেটিং' : 'Average Rating'}
                    </span>
                    <p className="text-xl font-bold text-[#0F766E] mt-1 flex items-center gap-1">
                      <Star className="w-4 h-4 fill-[#C1982E] text-[#C1982E]" />
                      {safeFixed(reportData.average_rating)} / 5
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">
                      {isBangla ? 'অনুধাবন হার' : 'Comprehension %'}
                    </span>
                    <p className="text-xl font-bold text-blue-800 mt-1">
                      {safeFixed(reportData.average_percentage)}%
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <span className="text-xs text-purple-700 font-medium">
                      {isBangla ? 'চমৎকার ব্যান্ড' : 'Excellent Band'}
                    </span>
                    <p className="text-xl font-bold text-purple-800 mt-1">
                      {reportData.band_distribution?.excellent || 0} জন
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'টপিক ও বিষয়' : 'Topic & Subject'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ফিডব্যাক জমা' : 'Feedbacks'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'গড় রেটিং' : 'Rating'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'অনুধাবন %' : 'Percentage'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.sessions || []).map((s: any) => (
                        <tr key={s.session_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {s.topic_title || s.subject_name}
                            <span className="block text-[11px] font-normal text-gray-500">
                              {s.subject_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#0F766E] font-medium">
                            {s.batch_name}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">
                            {s.total_feedbacks}
                          </td>
                          <td className="py-2.5 px-3 text-amber-700 font-bold">
                            ⭐ {safeFixed(s.average_rating)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0F766E]">
                            {safeFixed(s.average_percentage)}%
                          </td>
                        </tr>
                      ))}
                      {(reportData.sessions || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            {isBangla ? 'এই তারিখে কোনো লার্নিং ফিডব্যাক ডাটা নেই।' : 'No learning feedback data found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Weekly Progress Trend Preview */}
            {activeReportKey === 'weekly-progress' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {isBangla ? 'সাপ্তাহিক মোট ক্লাস' : 'Total Classes'}
                    </span>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {reportData.total_classes || 0}
                    </p>
                  </div>
                  <div className="bg-[#F0FDFA] p-4 rounded-xl border border-[#CCFBF1]">
                    <span className="text-xs text-[#0F766E] font-medium">
                      {isBangla ? 'সাপ্তাহিক উপস্থিতি গড়' : 'Attendance Avg'}
                    </span>
                    <p className="text-xl font-bold text-[#0F766E] mt-1">
                      {safeFixed(reportData.attendance_summary?.attendance_percentage)}%
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">
                      {isBangla ? 'সাপ্তাহিক লার্নিং স্কোর' : 'Learning Avg Score'}
                    </span>
                    <p className="text-xl font-bold text-blue-800 mt-1">
                      {safeFixed(reportData.learning_summary?.average_percentage)}%
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ক্লাস সংখ্যা' : 'Sessions'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'উপস্থিতি %' : 'Attendance %'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'লার্নিং গড় %' : 'Learning %'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.daily_breakdown || []).map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{d.date}</td>
                          <td className="py-2.5 px-3">{d.sessions_count}</td>
                          <td className="py-2.5 px-3 font-bold text-[#0F766E]">
                            {safeFixed(d.attendance_percentage)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-800">
                            {safeFixed(d.average_percentage)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Monthly Student Performance Preview */}
            {activeReportKey === 'monthly-student-performance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span>
                    <strong>{isBangla ? 'মাস ও বছর:' : 'Period:'}</strong>{' '}
                    {reportData.month}/{reportData.year}
                  </span>
                  <span>
                    <strong>{isBangla ? 'ব্যাচ:' : 'Batch:'}</strong>{' '}
                    {reportData.batch_name || (isBangla ? 'সকল ব্যাচ' : 'All Batches')}
                  </span>
                  <span>
                    <strong>{isBangla ? 'মোট শিক্ষার্থী:' : 'Total Students:'}</strong>{' '}
                    {reportData.total_students || 0}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'আইডি' : 'Student ID'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষার্থীর নাম' : 'Name'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'উপস্থিতি %' : 'Attendance %'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'গড় রেটিং' : 'Avg Rating'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.students || []).map((st: any) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-semibold text-[#0F766E]">
                            {st.student_id_number}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {st.student_name}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{st.batch_name}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">
                            {safeFixed(st.attendance_percentage)}%
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-amber-700">
                            ⭐ {safeFixed(st.average_rating)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (st.attendance_percentage || 0) < 75
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-[#CCFBF1] text-[#0F766E]'
                              }`}
                            >
                              {(st.attendance_percentage || 0) < 75
                                ? isBangla ? 'ঝুঁকিপূর্ণ' : 'At-Risk'
                                : isBangla ? 'সন্তোষজনক' : 'Good'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Batch-Wise Performance Preview */}
            {activeReportKey === 'batch-wise-performance' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ ও ক্যাম্পাস' : 'Batch & Campus'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষার্থী' : 'Students'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ক্লাস সংখ্যা' : 'Classes'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'উপস্থিতি %' : 'Attendance %'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'লার্নিং %' : 'Learning %'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'হেল্প রিকোয়েস্ট' : 'Help Requests'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.batches || []).map((b: any) => (
                        <tr key={b.batch_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-gray-900">{b.batch_name}</span>
                            <span className="block text-[11px] text-gray-500">{b.campus_name}</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{b.student_count}</td>
                          <td className="py-2.5 px-3">{b.total_classes}</td>
                          <td className="py-2.5 px-3 font-bold text-[#0F766E]">
                            {safeFixed(b.attendance_percentage)}%
                          </td>
                          <td className="py-2.5 px-3 font-bold text-blue-800">
                            {safeFixed(b.average_percentage)}%
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-bold text-gray-700">{b.total_help_requests}</span>
                            {b.pending_help_requests > 0 && (
                              <span className="ml-1 text-[10px] text-rose-600 font-bold">
                                ({b.pending_help_requests} {isBangla ? 'অপেক্ষমান' : 'pending'})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Topic-Wise Understanding Preview */}
            {activeReportKey === 'topic-wise-understanding' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'টপিক শিরোনাম' : 'Topic Title'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'বিষয়' : 'Subject'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ফিডব্যাক সংখ্যা' : 'Feedbacks'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'গড় রেটিং' : 'Rating'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'বোধগম্যতা %' : 'Comprehension %'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.topics || []).map((t: any) => (
                        <tr key={t.topic_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{t.topic_title}</td>
                          <td className="py-2.5 px-3 text-gray-600">{t.subject_name}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{t.total_feedbacks}</td>
                          <td className="py-2.5 px-3 text-amber-700 font-bold">
                            ⭐ {safeFixed(t.average_rating)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0F766E]">
                            {safeFixed(t.average_percentage)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Teacher-Wise Performance Preview */}
            {activeReportKey === 'teacher-wise' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষকের নাম' : 'Faculty Name'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ইউজারনেম' : 'Login ID'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'মোট ক্লাস' : 'Classes'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'মোট ফিডব্যাক' : 'Feedbacks'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষক রেটিং' : 'Rating'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'অপেক্ষমান হেল্প' : 'Pending Help'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.teachers || []).map((tc: any) => (
                        <tr key={tc.teacher_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{tc.teacher_name}</td>
                          <td className="py-2.5 px-3 text-gray-500 font-mono">{tc.login_id}</td>
                          <td className="py-2.5 px-3 font-bold">{tc.total_classes}</td>
                          <td className="py-2.5 px-3">{tc.total_feedbacks}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-700">
                            ⭐ {safeFixed(tc.average_rating)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                tc.pending_help_requests > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#CCFBF1] text-[#0F766E]'
                              }`}
                            >
                              {tc.pending_help_requests} {isBangla ? 'টি' : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. Student Help Requests Preview */}
            {activeReportKey === 'student-help-requests' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {isBangla ? 'সর্বমোট হেল্প রিকোয়েস্ট' : 'Total Help Requests'}
                    </span>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {reportData.total_help_requests || 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <span className="text-xs text-amber-700 font-medium">
                      {isBangla ? 'অপেক্ষমান (Pending)' : 'Pending'}
                    </span>
                    <p className="text-xl font-bold text-amber-800 mt-1">
                      {reportData.pending_count || 0}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">
                      {isBangla ? 'চলমান (In Progress)' : 'In Progress'}
                    </span>
                    <p className="text-xl font-bold text-blue-800 mt-1">
                      {reportData.in_progress_count || 0}
                    </p>
                  </div>
                  <div className="bg-[#F0FDFA] p-4 rounded-xl border border-[#CCFBF1]">
                    <span className="text-xs text-[#0F766E] font-medium">
                      {isBangla ? 'সমাধানকৃত (Resolved)' : 'Resolved'}
                    </span>
                    <p className="text-xl font-bold text-[#0F766E] mt-1">
                      {reportData.resolved_count || 0}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষার্থী' : 'Student'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ ও টপিক' : 'Batch & Topic'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'প্রশ্ন / সমস্যা' : 'Question'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.help_requests || []).map((hr: any) => (
                        <tr key={hr.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-900">{hr.student_name}</span>
                            <span className="block text-[10px] text-gray-500 font-mono">
                              {hr.student_id_number}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-[#0F766E]">{hr.batch_name}</span>
                            <span className="block text-[11px] text-gray-500">{hr.topic_title}</span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="line-clamp-2 text-gray-700">{hr.question}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                hr.status === 'resolved'
                                  ? 'bg-[#CCFBF1] text-[#0F766E]'
                                  : hr.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {hr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. Repeated Absences Preview */}
            {activeReportKey === 'repeated-absences' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                  <span className="text-rose-900 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    {isBangla
                      ? `চিহ্নিত ঝুঁকিপূর্ণ শিক্ষার্থী: ${reportData.total_flagged_students || 0} জন`
                      : `Total Flagged At-Risk Students: ${reportData.total_flagged_students || 0}`}
                  </span>
                  <span className="text-rose-800 text-[11px]">
                    {isBangla
                      ? `শর্ত: টানা ${reportData.threshold_consecutive} দিন অথবা মোট ${reportData.threshold_total} দিন অনুপস্থিত`
                      : `Criteria: Consecutive >= ${reportData.threshold_consecutive} or Total >= ${reportData.threshold_total}`}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">{isBangla ? 'আইডি' : 'Student ID'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'শিক্ষার্থীর নাম' : 'Name'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'ব্যাচ' : 'Batch'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'টানা অনুপস্থিতি' : 'Consecutive'}</th>
                        <th className="py-2.5 px-3">{isBangla ? 'মোট অনুপস্থিতি' : 'Total'}</th>
                        <th className="py-2.5 px-3 text-right">{isBangla ? 'সর্বশেষ উপস্থিতি' : 'Last Attended'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.flagged_students || []).map((fs: any) => (
                        <tr key={fs.student_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-semibold text-rose-700">
                            {fs.student_id_number}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {fs.student_name}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{fs.batch_name}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">
                            {fs.consecutive_absences} {isBangla ? 'দিন' : 'days'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">
                            {fs.total_absences} {isBangla ? 'দিন' : 'days'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500">
                            {fs.last_attended_date || (isBangla ? 'কখনও উপস্থিত হননি' : 'Never')}
                          </td>
                        </tr>
                      ))}
                      {(reportData.flagged_students || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            {isBangla
                              ? 'আলহামদুলিল্লাহ! কোনো শিক্ষার্থী ঝুঁকিপূর্ণ অনুপস্থিতির তালিকায় নেই।'
                              : 'No students currently flagged under this threshold.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
