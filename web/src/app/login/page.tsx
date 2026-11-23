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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-[#0F172A] relative">
      {/* Ambient Sky-Blue Light Glow from Top (Locked / Fixed) */}
      <div
        className="fixed inset-x-0 top-0 h-[520px] pointer-events-none bg-gradient-to-b from-[#DCF4F1] via-[#EAF8F5]/80 via-[#F4FCFA]/40 to-transparent z-0"
        aria-hidden="true"
      />

      {/* Top Institutional Header */}
      <header className="relative z-10 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md text-[#0F172A] shadow-xs">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-[#CCFBF1]">
              <Image
                src="/logo.png"
                alt="ASSDI Logo"
                width={36}
                height={36}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-[#0F172A] font-bold text-sm sm:text-base leading-tight font-serif">
                {t('brand.name')}
              </h2>
              <p className="text-[#64748B] text-xs font-medium">
                {t('brand.course')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white text-[#0F172A] rounded-2xl border border-[#E2E8F0] shadow-xl border-t-4 border-t-[#0F766E] p-7 sm:p-8">
          {/* Card Brand Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#F0FDFA] border-2 border-[#CCFBF1] p-2 mb-3.5 flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="ASSDI Logo"
                width={52}
                height={52}
                priority
                className="object-contain"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-serif">
              {t('brand.name')}
            </h1>
            <p className="text-xs text-[#475569] font-medium mt-1">
              {t('brand.systemTitle')}
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] rounded-full text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-[#0369A1]" />
              <span>{t('brand.course')}</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-[#991B1B] text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login_id"
                className="block text-xs font-bold text-[#334155] mb-1.5"
              >
                {t('auth.loginId')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login_id"
                  type="text"
                  autoComplete="username"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={t('auth.loginIdPlaceholder')}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/15 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-[#334155] mb-1.5"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/15 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#0F766E] hover:bg-[#115E59] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md border border-[#0D9488] flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-white" />
                  <span>{t('auth.loginBtn')}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Testing */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <p className="text-[11px] font-bold text-[#475569] mb-2.5 text-center uppercase tracking-wider font-serif">
              {t('auth.quickDemo')}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => setDemoRole('admin01', 'AdminPass2026!', 'Super Admin')}
                className="px-2 py-1.5 text-[11px] font-bold bg-[#F8FAFC] hover:bg-[#F0FDFA] hover:text-[#0F766E] text-[#0F172A] rounded-lg transition border border-[#E2E8F0] cursor-pointer"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('coord01', 'CoordPass2026!', 'Coordinator')}
                className="px-2 py-1.5 text-[11px] font-bold bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] rounded-lg transition border border-[#CCFBF1] cursor-pointer"
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('teacher01', 'TeacherPass2026!', 'Teacher')}
                className="px-2 py-1.5 text-[11px] font-bold bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] rounded-lg transition border border-[#CCFBF1] cursor-pointer"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('observer01', 'ObserverPass2026!', 'Observer')}
                className="px-2 py-1.5 text-[11px] font-bold bg-[#F8FAFC] hover:bg-[#F0FDFA] text-[#334155] rounded-lg transition border border-[#E2E8F0] cursor-pointer"
              >
                Observer
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('STD-2026-042-001', 'StudentPass2026!', 'Student')}
                className="col-span-2 px-2 py-1.5 text-[11px] font-bold bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] rounded-lg transition border border-[#CCFBF1] cursor-pointer"
              >
                Student (STD-2026-042-001)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="relative bg-white border-t border-[#E2E8F0] py-4 text-center text-xs text-[#64748B]">
        <p>
          © 2026 {t('brand.name')} • {t('brand.tagline')} • ঢাকা, বাংলাদেশ
        </p>
      </footer>
    </div>
  );
}
