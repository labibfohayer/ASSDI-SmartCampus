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
  Eye as EyeIcon,
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
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between text-slate-800">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/80 p-1 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="ASSDI Logo"
                width={32}
                height={32}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-sm leading-tight">
                {t('brand.name')}
              </h2>
              <p className="text-emerald-800 text-xs font-medium">
                {t('brand.course')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#1B4D3E] p-6 sm:p-8">
          {/* Card Brand Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-xl bg-slate-50 border border-slate-200/80 p-2 mb-3.5 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="ASSDI Logo"
                width={52}
                height={52}
                priority
                className="object-contain"
              />
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t('brand.name')}
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {t('brand.systemTitle')}
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-md text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('brand.course')}</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login_id"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t('auth.loginId')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1B4D3E] focus:ring-1 focus:ring-[#1B4D3E] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1B4D3E] focus:ring-1 focus:ring-[#1B4D3E] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
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
              className="w-full mt-2 py-2.5 px-4 bg-[#1B4D3E] hover:bg-[#153E32] active:bg-[#102E25] text-white text-sm font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.loginBtn')}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5 text-center">
              {t('auth.quickDemo')}
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => setDemoRole('admin01', 'AdminPass2026!', 'Super Admin')}
                className="px-2 py-1.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition cursor-pointer"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('coord01', 'CoordPass2026!', 'Coordinator')}
                className="px-2 py-1.5 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md transition cursor-pointer"
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('teacher_msoffice', 'TeacherPass2026!', 'Teacher')}
                className="px-2 py-1.5 text-[11px] font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-md transition cursor-pointer"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('observer01', 'ObserverPass2026!', 'Observer')}
                className="px-2 py-1.5 text-[11px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md transition cursor-pointer"
              >
                Observer
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('STD-2026-042-001', 'StudentPass2026!', 'Student')}
                className="col-span-2 px-2 py-1.5 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md transition cursor-pointer"
              >
                Student (STD-2026-042-001)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <p>
          © 2026 {t('brand.name')} • {t('brand.tagline')}
        </p>
      </footer>
    </div>
  );
}
