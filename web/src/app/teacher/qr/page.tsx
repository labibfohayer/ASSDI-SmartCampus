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
          setSelectedSessionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load sessions for QR:', err);
      }
    };
    loadSessions();
  }, []);

  // 2. Fetch QR Token for selected session
  const fetchQrToken = async () => {
    if (!selectedSessionId) return;
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
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        (isBangla
          ? 'কিউআর কোড প্রস্তুত করা যায়নি। কিউআর উইন্ডোটি ক্লাস শুরুর সময় থেকে ১৫ মিনিট পর্যন্ত উন্মুক্ত থাকে।'
          : 'Unable to generate QR token. QR window is active only within 15 minutes of class start.');
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
      fetchQrToken();
    }
  }, [selectedSessionId]);

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

  // Circular timer calculation
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (remainingSeconds / 45) * circumference;

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'bg-[#1B4D3E] text-white p-6 sm:p-12 flex flex-col justify-between h-screen w-screen overflow-hidden'
          : 'space-y-6'
      }`}
    >
      {/* Top Header & Controls */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-xl border ${
          isFullscreen
            ? 'bg-emerald-950/40 border-emerald-700/60 text-white'
            : 'bg-white border-slate-200/90 shadow-2xs text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className={`p-2 rounded-lg transition ${
              isFullscreen ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isBangla ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <QrCode className="w-6 h-6 text-[#1B4D3E] dark:text-emerald-300" />
              <span>{isBangla ? 'ক্লাসরুম লাইভ কিউআর প্রজেক্টর' : 'Live Classroom QR Projector'}</span>
            </h1>
            <p className="text-xs opacity-80">
              {isBangla
                ? 'বড় স্ক্রিন বা প্রজেক্টরে প্রদর্শন করুন; প্রতি ৪৫ সেকেন্ডে টোকেন স্বয়ংক্রিয়ভাবে পরিবর্তিত হয়।'
                : 'Project onto classroom screen. Token rotates securely every 45 seconds.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Session Selector */}
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            className="px-3.5 py-2 bg-white dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_name || `Session #${s.id}`} ({d(s.start_time.slice(0, 5))} - {d(s.end_time.slice(0, 5))})
              </option>
            ))}
          </select>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#153E32] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>{isBangla ? 'ফুলস্ক্রিন বন্ধ' : 'Exit Fullscreen'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>{isBangla ? 'ফুলস্ক্রিন প্রজেক্টর' : 'Projector Mode'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main QR Display Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        <div className="w-full max-w-xl bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border-4 border-emerald-500/20 text-center space-y-6">
          {/* Active Session Info Banner */}
          {activeSession && (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4">
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                {activeSession.audience} Session
              </span>
              <h2 className="text-xl font-black text-gray-900 mt-2">
                {activeSession.subject_name}
              </h2>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                {activeSession.topic_title || isBangla ? 'টপিক আলোচনা' : 'Topic Overview'}
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  {d(activeSession.start_time.slice(0, 5))} - {d(activeSession.end_time.slice(0, 5))}
                </span>
                <span>•</span>
                <span>{d(activeSession.session_date)}</span>
              </div>
            </div>
          )}

          {/* QR Code Presentation Box */}
          <div className="flex justify-center items-center py-2">
            {loadingToken && !qrToken ? (
              <div className="w-72 h-72 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-gray-500">
                  {isBangla ? 'সিকিউর টোকেন জেনারেট হচ্ছে...' : 'Generating Secure Signed Token...'}
                </p>
              </div>
            ) : errorMessage ? (
              <div className="w-72 h-72 rounded-2xl bg-amber-50 border-2 border-amber-200 p-6 flex flex-col items-center justify-center text-center gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
                <p className="text-xs font-bold text-amber-800 leading-snug">
                  {errorMessage}
                </p>
                <button
                  onClick={fetchQrToken}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
                >
                  {isBangla ? 'আবার চেষ্টা করুন' : 'Retry'}
                </button>
              </div>
            ) : qrToken ? (
              <div className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-inner flex items-center justify-center relative">
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
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
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
                        remainingSeconds <= 10 ? 'text-red-500' : 'text-emerald-600'
                      } transition-all duration-1000`}
                      fill="transparent"
                    />
                  </svg>
                  <span className={`absolute text-xs font-extrabold ${
                    remainingSeconds <= 10 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {d(remainingSeconds)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-800">
                    {isBangla ? 'টোকেন পরিবর্তনের বাকি' : 'Token Expires In'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {d(remainingSeconds)} {isBangla ? 'সেকেন্ড' : 'seconds'}
                  </p>
                </div>
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={fetchQrToken}
                disabled={loadingToken}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${loadingToken ? 'animate-spin' : ''}`} />
                <span>{isBangla ? 'এখনই রিফ্রেশ' : 'Refresh Now'}</span>
              </button>
            </div>
          )}

          {/* Student Instruction Banner */}
          <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
            {isBangla
              ? 'শিক্ষার্থীদের নির্দেশ দিন: আপনার অফিসিয়াল ASSDI মোবাইল অ্যাপ ওপেন করে এই কোডটি স্ক্যান করুন।'
              : 'Instruct students: Open the official ASSDI Mobile App and scan this rotating code.'}
          </p>
        </div>
      </div>
    </div>
  );
}
