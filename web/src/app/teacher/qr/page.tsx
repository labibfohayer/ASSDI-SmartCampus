'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface SessionOption {
  id: number;
  subject_name?: string;
  topic_title?: string;
  batch_name?: string;
  start_time: string;
  end_time: string;
  session_date: string;
  audience: string;
}

export default function LiveQrProjectorPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('sessionId');
  const { t, d, isBangla } = useLanguage();

  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    preselectedId ? Number(preselectedId) : null
  );

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(45);
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attendedCount, setAttendedCount] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to determine if a session is currently LIVE, UPCOMING, or ENDED
  const getSessionTimingState = (s: SessionOption | undefined): 'LIVE' | 'UPCOMING' | 'ENDED' => {
    if (!s) return 'ENDED';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (s.session_date < todayStr) return 'ENDED';
    if (s.session_date > todayStr) return 'UPCOMING';

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = (s.start_time || '00:00').split(':').map(Number);
    const startMinutes = (sH || 0) * 60 + (sM || 0);

    const [eH, eM] = (s.end_time || '23:59').split(':').map(Number);
    const endMinutes = (eH || 0) * 60 + (eM || 0);

    if (currentMinutes < startMinutes) return 'UPCOMING';
    // QR token is active from class start time up to start_time + 15 minutes (or end_time)
    if (currentMinutes > endMinutes || currentMinutes > startMinutes + 15) return 'ENDED';
    return 'LIVE';
  };

  // 1. Fetch available sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await api.get('/api/v1/class-sessions/today/');
        let list: SessionOption[] = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (res.data?.results) list = res.data.results;
        else if (res.data?.data) list = res.data.data;

        // Fallback: If today has no sessions, fetch recent published sessions
        if (list.length === 0) {
          const allRes = await api.get('/api/v1/class-sessions/?status=published');
          if (Array.isArray(allRes.data)) list = allRes.data;
          else if (allRes.data?.results) list = allRes.data.results;
        }

        setSessions(list);
        if (!selectedSessionId && list.length > 0) {
          const live = list.find((s) => getSessionTimingState(s) === 'LIVE');
          if (live) {
            setSelectedSessionId(live.id);
          } else {
            const upcoming = list.find((s) => getSessionTimingState(s) === 'UPCOMING');
            setSelectedSessionId(upcoming ? upcoming.id : list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load sessions for QR:', err);
      }
    };
    loadSessions();
  }, []);

  // 2. Fetch QR Token for selected session (Strictly only during class time)
  const fetchQrToken = async () => {
    if (!selectedSessionId) return;
    const current = sessions.find((s) => s.id === selectedSessionId);
    const timing = getSessionTimingState(current);
    if (timing !== 'LIVE') {
      setQrToken(null);
      return;
    }

    setLoadingToken(true);
    setErrorMessage(null);

    try {
      const response = await api.post(`/api/v1/class-sessions/${selectedSessionId}/qr-token/`);
      if (response.data && response.data.data) {
        setQrToken(response.data.data.qr_token);
        const rem = response.data.data.remaining_seconds || 45;
        setRemainingSeconds(rem);
      } else if (response.data?.qr_token) {
        setQrToken(response.data.qr_token);
        setRemainingSeconds(response.data.remaining_seconds || 45);
      }

      // Fetch live attendance count
      fetchAttendanceSummary();
    } catch (err: any) {
      const rawMsg = String(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        ''
      );

      let msg = rawMsg;
      if (rawMsg.includes('closed') || rawMsg.includes('উইন্ডো')) {
        msg = isBangla
          ? 'ক্লাসের নির্ধারিত কিউআর উইন্ডোটি সমাপ্ত হয়ে গেছে। ক্লাসের সময় ব্যতীত কিউআর কোড চালু করা যায় না।'
          : 'The QR attendance window has closed.';
      } else if (rawMsg.includes('start time') || rawMsg.includes('পূর্বে')) {
        msg = isBangla
          ? 'ক্লাস শুরুর নির্ধারিত সময়ের পূর্বে কিউআর কোড চালু করা যায় না। শুধুমাত্র ক্লাসের নির্ধারিত সময়ে এটি সক্রিয় হবে।'
          : 'QR token can only be generated starting at class start time.';
      } else if (rawMsg.includes('সমাপ্ত') || rawMsg.includes('দিন ও নির্ধারিত')) {
        msg = isBangla
          ? 'ক্লাসের নির্ধারিত সময় সমাপ্ত হয়ে গেছে। ক্লাসের সময় ব্যতীত অন্য কোনো সময় কিউআর কোড চালু করা যায় না।'
          : 'Class time has ended. QR tokens can only be generated during class time.';
      } else if (!msg) {
        msg = isBangla
          ? 'শুধুমাত্র ক্লাসের নির্ধারিত সময়েই কিউআর কোড চালু করা সম্ভব।'
          : 'QR token can only be generated during scheduled class time.';
      }
      setErrorMessage(msg);
      setQrToken(null);
    } finally {
      setLoadingToken(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await api.get(`/api/v1/class-sessions/${selectedSessionId}/attendance-summary/`);
      const data = res.data?.data || res.data;
      if (data) {
        setAttendedCount((data.present || 0) + (data.late || 0));
        setTotalStudents(data.total_enrolled || data.total || 0);
      }
    } catch {
      // Non-critical background count
    }
  };

  // Trigger token generation when session changes
  useEffect(() => {
    if (selectedSessionId) {
      const cur = sessions.find((s) => s.id === selectedSessionId);
      if (getSessionTimingState(cur) === 'LIVE') {
        fetchQrToken();
      } else {
        setQrToken(null);
        setErrorMessage(null);
      }
    }
  }, [selectedSessionId, sessions]);

  // 3. Countdown timer: tick every second and refresh token at 0s
  useEffect(() => {
    if (!qrToken) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          fetchQrToken();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrToken, selectedSessionId]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);
  const timingState = getSessionTimingState(activeSession);

  // Circular timer calculation
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (remainingSeconds / 45) * circumference;

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'bg-[#1E293B] text-white p-6 sm:p-12 flex flex-col justify-between h-screen w-screen overflow-hidden'
          : 'space-y-6'
      }`}
    >
      {/* Top Header & Controls */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-xl border ${
          isFullscreen
            ? 'bg-[#1E293B] border-[#FCD34D]/40 text-white'
            : 'bg-white border-[#E2E8F0] shadow-xs text-[#0F172A]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className={`p-2 rounded-lg transition ${
              isFullscreen ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E]'
            }`}
            title={isBangla ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2 font-heading">
              <QrCode className="w-6 h-6 text-[#0F766E]" />
              <span>{isBangla ? 'ক্লাসরুম লাইভ কিউআর প্রজেক্টর' : 'Live Classroom QR Projector'}</span>
            </h1>
            <p className="text-xs opacity-80 mt-0.5">
              {isBangla
                ? 'বড় স্ক্রিন বা প্রজেক্টরে প্রদর্শন করুন; শুধুমাত্র ক্লাসের সময় প্রতি ৪৫ সেকেন্ডে টোকেন স্বয়ংক্রিয়ভাবে পরিবর্তিত হয়।'
                : 'Project onto classroom screen. Token rotates securely every 45 seconds during class time.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Session Selector */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-amber-800 rounded-xl shadow-xs">
            <Clock className="w-4 h-4 text-[#0F766E] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                {isBangla ? 'সেশন নির্বাচন করুন' : 'Select Session'}
              </span>
              <select
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-[#0F172A] dark:text-amber-100 focus:outline-none cursor-pointer min-w-[220px] max-w-xs sm:min-w-[280px] truncate"
              >
                {sessions.length === 0 ? (
                  <option value="" disabled>
                    {isBangla ? 'কোনো সেশন পাওয়া যায়নি' : 'No sessions available'}
                  </option>
                ) : (
                  sessions.map((s) => {
                    const st = getSessionTimingState(s);
                    const prefix =
                      st === 'LIVE'
                        ? (isBangla ? '🟢 [চলমান]' : '🟢 [LIVE]')
                        : st === 'UPCOMING'
                        ? (isBangla ? '⏳ [আসন্ন]' : '⏳ [UPCOMING]')
                        : (isBangla ? '🔒 [সমাপ্ত]' : '🔒 [ENDED]');
                    return (
                      <option key={s.id} value={s.id}>
                        {prefix} {s.subject_name || `Session #${s.id}`} ({d(s.start_time.slice(0, 5))} - {d(s.end_time.slice(0, 5))})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-[#C1982E]" />
                <span>{isBangla ? 'ফুলস্ক্রিন বন্ধ' : 'Exit Fullscreen'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-[#C1982E]" />
                <span>{isBangla ? 'ফুলস্ক্রিন প্রজেক্টর' : 'Projector Mode'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main QR Display Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        <div className="w-full max-w-xl bg-white rounded-3xl p-8 sm:p-10 shadow-xl border-4 border-[#FCD34D] text-center space-y-6">
          {/* Active Session Info Banner */}
          {activeSession && (
            <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl p-4">
              <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 bg-[#0F766E] text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                  {activeSession.audience} Session
                </span>
                {timingState === 'LIVE' && (
                  <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full tracking-wider animate-pulse">
                    🟢 {isBangla ? 'ক্লাস চলমান' : 'Class Live'}
                  </span>
                )}
                {timingState === 'UPCOMING' && (
                  <span className="px-2.5 py-0.5 bg-amber-600 text-white text-[11px] font-bold rounded-full tracking-wider">
                    ⏳ {isBangla ? 'আসন্ন ক্লাস' : 'Upcoming'}
                  </span>
                )}
                {timingState === 'ENDED' && (
                  <span className="px-2.5 py-0.5 bg-slate-600 text-white text-[11px] font-bold rounded-full tracking-wider">
                    🔒 {isBangla ? 'ক্লাস সমাপ্ত' : 'Ended'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-[#0F172A] font-heading mt-2">
                {activeSession.subject_name}
              </h2>
              <p className="text-xs text-[#0F766E] font-semibold mt-0.5">
                {activeSession.topic_title || (isBangla ? 'টপিক আলোচনা' : 'Topic Overview')}
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs font-bold text-[#475569]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                  {d(activeSession.start_time.slice(0, 5))} - {d(activeSession.end_time.slice(0, 5))}
                </span>
                <span>•</span>
                <span>{d(activeSession.session_date)}</span>
              </div>
            </div>
          )}

          {/* QR Code Presentation Box */}
          <div className="flex justify-center items-center py-2">
            {timingState === 'UPCOMING' ? (
              <div className="w-full max-w-md rounded-2xl bg-amber-50/90 border-2 border-amber-300 p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-3 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {isBangla ? 'ক্লাস এখনও শুরু হয়নি' : 'Not Started'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-amber-950 font-heading mt-2">
                    {isBangla ? 'শুধুমাত্র ক্লাসের সময়েই কিউআর কোড চালু হবে' : 'QR Generation Locked Until Class Start'}
                  </h3>
                </div>
                <p className="text-xs font-medium text-amber-900/90 leading-relaxed max-w-sm">
                  {isBangla
                    ? `এই ক্লাসটি ${d(activeSession?.session_date || '')} তারিখে ${d((activeSession?.start_time || '').slice(0, 5))} থেকে ${d((activeSession?.end_time || '').slice(0, 5))} পর্যন্ত নির্ধারিত। ক্লাসের নির্ধারিত সময় শুরুর পূর্বে কিউআর কোড জেনারেট করা যাবে না।`
                    : `This class is scheduled for ${d((activeSession?.start_time || '').slice(0, 5))} - ${d((activeSession?.end_time || '').slice(0, 5))}. QR code can only be generated during class time.`}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      if (activeSession && getSessionTimingState(activeSession) === 'LIVE') {
                        fetchQrToken();
                      } else {
                        toast(isBangla ? 'এখনও ক্লাসের সময় হয়নি।' : 'Not class time yet.');
                      }
                    }}
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                    <span>{isBangla ? 'সময় রিফ্রেশ করুন' : 'Check Live Status'}</span>
                  </button>
                </div>
              </div>
            ) : timingState === 'ENDED' ? (
              <div className="w-full max-w-md rounded-2xl bg-slate-50 border-2 border-slate-300 p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-3 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {isBangla ? 'ক্লাসের সময় সমাপ্ত' : 'Class Ended'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading mt-2">
                    {isBangla ? 'ক্লাসের সময় ব্যতীত কিউআর কোড বন্ধ থাকে' : 'QR Generation Locked - Class Ended'}
                  </h3>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-sm">
                  {isBangla
                    ? `এই ক্লাসের নির্ধারিত সময় (${d((activeSession?.start_time || '').slice(0, 5))} - ${d((activeSession?.end_time || '').slice(0, 5))}) শেষ হয়ে গেছে। ক্লাসের সময় ব্যতীত অন্য কোনো সময়ে কিউআর কোড চালু করা যায় না।`
                    : `This class ended at ${d((activeSession?.end_time || '').slice(0, 5))}. Outside class time, QR codes cannot be generated.`}
                </p>
                <div className="mt-2 flex flex-col sm:flex-row gap-2 w-full justify-center">
                  <Link
                    href="/teacher/attendance"
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                    <span>{isBangla ? 'ম্যানুয়াল হাজিরা শিট দেখুন' : 'View Attendance Sheet'}</span>
                  </Link>
                </div>
              </div>
            ) : loadingToken && !qrToken ? (
              <div className="w-72 h-72 rounded-2xl bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin" />
                <p className="text-xs font-bold text-[#475569]">
                  {isBangla ? 'সিকিউর টোকেন জেনারেট হচ্ছে...' : 'Generating Secure Signed Token...'}
                </p>
              </div>
            ) : errorMessage ? (
              <div className="w-80 rounded-2xl bg-amber-50/90 border-2 border-amber-200 p-6 flex flex-col items-center justify-center text-center gap-3 shadow-xs">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="flex flex-col w-full gap-2 mt-1">
                  <button
                    onClick={fetchQrToken}
                    className="w-full py-2 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                    <span>{isBangla ? 'আবার চেষ্টা করুন' : 'Retry'}</span>
                  </button>
                  <Link
                    href="/teacher/attendance"
                    className="w-full py-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold rounded-xl border border-[#E2E8F0] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isBangla ? 'ম্যানুয়াল হাজিরা শিট' : 'Manual Attendance'}</span>
                  </Link>
                </div>
              </div>
            ) : qrToken ? (
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E2E8F0] shadow-inner flex items-center justify-center relative">
                <QRCodeSVG
                  value={qrToken}
                  size={isFullscreen ? 320 : 260}
                  level="H"
                  includeMargin={true}
                />
              </div>
            ) : null}
          </div>

          {/* Countdown & Live Indicator */}
          {qrToken && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              {/* Circular Timer */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r={circleRadius}
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-gray-200"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r={circleRadius}
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className={`${
                        remainingSeconds <= 10 ? 'text-red-500' : 'text-[#0F766E]'
                      } transition-all duration-1000`}
                      fill="transparent"
                    />
                  </svg>
                  <span className={`absolute text-xs font-extrabold ${
                    remainingSeconds <= 10 ? 'text-red-600' : 'text-[#0F172A]'
                  }`}>
                    {d(remainingSeconds)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#0F172A]">
                    {isBangla ? 'টোকেন পরিবর্তনের বাকি' : 'Token Expires In'}
                  </p>
                  <p className="text-[11px] text-[#475569]">
                    {d(remainingSeconds)} {isBangla ? 'সেকেন্ড' : 'seconds'}
                  </p>
                </div>
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={fetchQrToken}
                disabled={loadingToken}
                className="px-3.5 py-2 bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#FCD34D] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0F766E] ${loadingToken ? 'animate-spin' : ''}`} />
                <span>{isBangla ? 'এখনই রিফ্রেশ' : 'Refresh Now'}</span>
              </button>
            </div>
          )}

          {/* Student Instruction Banner */}
          <p className="text-xs text-[#475569] font-medium leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            {isBangla
              ? 'শিক্ষার্থীদের নির্দেশ দিন: আপনার অফিসিয়াল ASSDI মোবাইল অ্যাপ ওপেন করে এই কোডটি স্ক্যান করুন।'
              : 'Instruct students: Open the official ASSDI Mobile App and scan this rotating code.'}
          </p>
        </div>
      </div>
    </div>
  );
}
