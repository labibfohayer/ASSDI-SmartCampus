'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Layers,
  CheckCircle2,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { isLoggedIn, getDefaultRouteForRole } from '@/lib/auth';

export default function LoginPage() {
  const { user, isAuthenticated, login } = useAuth();
  const { t, isBangla } = useLanguage();
  const router = useRouter();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to user's assigned portal
  useEffect(() => {
    if (isLoggedIn() && user) {
      const target = getDefaultRouteForRole(user.role);
      router.replace(target);
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMessage(
        isBangla
          ? 'অনুগ্রহ করে লগইন আইডি এবং পাসওয়ার্ড প্রদান করুন।'
          : 'Please provide both Login ID and Password.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/v1/auth/login/', {
        login_id: cleanId,
        password: cleanPass,
      });

      if (response.data && response.data.success) {
        const { access, refresh, user: userData } = response.data.data;
        const redirectUrl = login(access, refresh, userData);
        toast.success(isBangla ? 'সফলভাবে লগইন হয়েছে!' : 'Login successful!');
        router.replace(redirectUrl);
      } else {
        const msg = response.data?.error?.message || t('auth.invalidCredentials');
        setErrorMessage(msg);
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      if (errorData?.code === 'ACCOUNT_LOCKED') {
        setErrorMessage(errorData.message || t('auth.lockedError'));
      } else if (errorData?.message) {
        setErrorMessage(errorData.message);
      } else if (err.response?.status === 401) {
        setErrorMessage(
          isBangla
            ? 'লগইন আইডি অথবা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
            : 'Invalid login ID or password. Please try again.'
        );
      } else {
        setErrorMessage(
          isBangla
            ? 'সার্ভারে সংযোগ স্থাপন করা সম্ভব হয়নি। ব্যাকএন্ড চালু আছে কি না পরীক্ষা করুন।'
            : 'Unable to connect to server. Please verify backend service.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to populate demo credentials for testing
  const setDemoRole = (roleLoginId: string, rolePass: string, roleName: string) => {
    setLoginId(roleLoginId);
    setPassword(rolePass);
    setErrorMessage(null);
    toast.success(
      isBangla
        ? `${roleName} ক্রেডেনশিয়াল পূরণ করা হয়েছে`
        : `${roleName} credentials filled`
    );
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col justify-between text-[#0F172A] relative"
      style={{ backgroundImage: "url('/login-islamic-bg.jpg')" }}
    >
      {/* Floating Language Switcher in top right corner */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
        <div className="bg-white/95 hover:bg-white backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-white/60 transition">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Main Login Two-Column Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto pt-14 sm:pt-12 pb-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">
          {/* Left Column: Institute Branding & Platform Purpose */}
          <div className="lg:col-span-7 text-white space-y-4 sm:space-y-5 lg:pr-4 text-left">
            {/* Top Affiliation Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#FEF3C7] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>
                {isBangla
                  ? 'আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমুখী প্রকল্প • অনুমোদিত NSDA'
                  : 'A Project of As-Sunnah Foundation • Registered with NSDA'}
              </span>
            </div>

            {/* Big Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black !text-white tracking-tight font-serif leading-[1.2] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                {isBangla ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট' : 'As-Sunnah Skill Development Institute'}
              </h1>
              <p className="text-lg sm:text-xl font-extrabold !text-[#FDE68A] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] font-serif">
                {isBangla
                  ? 'লার্নিং প্রগ্রেস, ফিডব্যাক ও একাডেমিক ম্যানেজমেন্ট সিস্টেম'
                  : 'Student Learning Progress, Feedback & Management System'}
              </p>
            </div>

            {/* Website Purpose Description */}
            <p className="text-sm sm:text-[15px] !text-white/95 leading-relaxed max-w-2xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] font-medium">
              {isBangla
                ? 'আবাসিক শিক্ষার্থীদের ক্লাসের দৈনন্দিন বোঝাপড়া, শিক্ষক সহায়তা আবেদন, স্মার্ট ডিজিটাল উপস্থিতি এবং সামগ্রিক একাডেমিক অগ্রগতি নিবিড়ভাবে তদারকির একটি সেন্ট্রালাইজড ম্যানেজমেন্ট প্ল্যাটফর্ম।'
                : 'A centralized residential learning platform for monitoring daily class comprehension, teacher help requests, smart attendance, and holistic academic progress.'}
            </p>

            {/* 3 Key Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/20 shadow-md">
                <div className="flex items-center gap-1.5 !text-[#FDE68A] mb-1">
                  <BookOpen className="w-4 h-4 shrink-0 text-[#FDE68A]" />
                  <span className="text-xs font-bold !text-[#FDE68A]">{isBangla ? 'প্রথম আবাসিক কোর্স' : 'First Course'}</span>
                </div>
                <p className="text-xs !text-white/90 leading-snug font-medium">
                  {isBangla ? 'ক্ষুদ্র ব্যবসা ব্যবস্থাপনা (SBMC)' : 'Small Business Management'}
                </p>
              </div>

              <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/20 shadow-md">
                <div className="flex items-center gap-1.5 !text-[#FDE68A] mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FDE68A]" />
                  <span className="text-xs font-bold !text-[#FDE68A]">{isBangla ? 'দৈনিক ফিডব্যাক' : 'Daily Feedback'}</span>
                </div>
                <p className="text-xs !text-white/90 leading-snug font-medium">
                  {isBangla ? 'টপিক অনুযায়ী বোঝাপড়ার রেটিং' : 'Topic comprehension rating'}
                </p>
              </div>

              <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/20 shadow-md">
                <div className="flex items-center gap-1.5 !text-[#FDE68A] mb-1">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#FDE68A]" />
                  <span className="text-xs font-bold !text-[#FDE68A]">{isBangla ? 'সহায়তা ও তদারকি' : 'Intervention'}</span>
                </div>
                <p className="text-xs !text-white/90 leading-snug font-medium">
                  {isBangla ? 'শিক্ষক ও কোঅর্ডিনেটরের নজরদারি' : 'Faculty intervention & monitoring'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="w-full max-w-md bg-white text-[#0F172A] rounded-2xl shadow-2xl p-6 sm:p-7 border border-white/90">
              {/* Card Brand Header */}
              <div className="text-center mb-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-1.5 mb-2.5 flex items-center justify-center shadow-xs">
                  <Image
                    src="/logo.png"
                    alt="ASSDI Logo"
                    width={44}
                    height={44}
                    priority
                    className="object-contain"
                  />
                </div>

                <h2 className="text-lg sm:text-xl font-bold !text-[#14532D] tracking-tight font-serif">
                  {isBangla ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account'}
                </h2>
                <p className="text-xs text-[#475569] font-medium mt-0.5">
                  {isBangla ? 'ইউজার আইডি ও পাসওয়ার্ড প্রদান করুন' : 'Enter your credentials to access the portal'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] rounded-full text-[11px] font-semibold">
                  <BookOpen className="w-3 h-3 text-[#15803D]" />
                  <span>{t('brand.course')}</span>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-[#991B1B] text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="login_id"
                    className="block text-xs font-bold text-[#334155] mb-1"
                  >
                    {t('auth.loginId')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login_id"
                      type="text"
                      autoComplete="username"
                      required
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={isBangla ? 'ইউজার আইডি / লগইন আইডি' : 'User ID / Login ID'}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-[#334155] mb-1"
                  >
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#0F172A] focus:outline-none cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#475569] hover:text-[#0F172A] select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#16A34A] focus:ring-[#16A34A]/30 cursor-pointer accent-[#16A34A]"
                    />
                    <span>{isBangla ? 'মনে রাখুন' : 'Remember me'}</span>
                  </label>
                  <span className="text-[#64748B] hover:text-[#16A34A] text-xs font-medium cursor-pointer transition">
                    {isBangla ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </span>
                </div>

                {/* Submit button with Lock icon */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 py-2.5 px-4 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md border border-[#15803D] flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('auth.loggingIn')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-white" />
                      <span>{isBangla ? 'লগইন' : 'Login'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Fill Buttons for Testing */}
              <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
                <p className="text-[10.5px] font-bold text-[#64748B] mb-2 text-center uppercase tracking-wider font-serif">
                  {t('auth.quickDemo')}
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setDemoRole('coord01', 'CoordPass2026!', 'Coordinator')}
                    className="px-2 py-1.5 text-[11px] font-bold bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#16A34A] rounded-lg transition border border-[#BBF7D0] cursor-pointer"
                  >
                    Coordinator
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('teacher01', 'TeacherPass2026!', 'Teacher')}
                    className="px-2 py-1.5 text-[11px] font-bold bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#16A34A] rounded-lg transition border border-[#BBF7D0] cursor-pointer"
                  >
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('STD-2026-042-001', 'StudentPass2026!', 'Student')}
                    className="px-2 py-1.5 text-[11px] font-bold bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#16A34A] rounded-lg transition border border-[#BBF7D0] cursor-pointer"
                  >
                    Student (STD-2026-042-001)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('observer01', 'ObserverPass2026!', 'Observer')}
                    className="px-2 py-1.5 text-[11px] font-bold bg-[#F8FAFC] hover:bg-[#F0FDF4] text-[#475569] rounded-lg transition border border-[#E2E8F0] cursor-pointer"
                  >
                    Observer
                  </button>
                </div>
              </div>

              {/* Copyright inside card */}
              <div className="mt-4 text-center">
                <p className="text-[10px] text-[#64748B]">
                  © 2026 As-Sunnah Skill Development Institute | All Rights Reserved
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Ambient Bar */}
      <footer className="relative z-10 py-3 px-4 text-center text-xs text-white/80 bg-black/40 backdrop-blur-xs">
        <p className="max-w-2xl mx-auto leading-relaxed">
          © 2026 {t('brand.name')} • {t('brand.tagline')} • ঢাকা, বাংলাদেশ
        </p>
      </footer>
    </div>
  );
}
