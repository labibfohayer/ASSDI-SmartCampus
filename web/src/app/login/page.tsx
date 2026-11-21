'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, LogIn, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
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
      const response = await api.post('/api/v1/accounts/login/', {
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
  const setDemoRole = (roleLoginId: string, roleName: string) => {
    setLoginId(roleLoginId);
    setPassword('Pass@123456');
    setErrorMessage(null);
    toast(
      isBangla
        ? `${roleName} ক্রেডেনশিয়াল পূরণ করা হয়েছে`
        : `${roleName} credentials filled`,
      { icon: '🔑' }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#102E25] via-[#1B4D3E] to-[#12382C] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header / Language Switcher */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-md p-1.5 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="As-Sunnah Institute Logo"
              width={32}
              height={32}
              priority
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-white font-bold text-sm leading-tight">
              {t('brand.name')}
            </h2>
            <p className="text-emerald-200 text-xs">{t('brand.course')}</p>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          {/* Logo & Card Title */}
          <div className="text-center mb-6">
            <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-2xl p-2.5 mb-4 shadow-inner border border-emerald-100 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="ASSDI Logo"
                width={64}
                height={64}
                priority
                className="object-contain drop-shadow"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {t('brand.name')}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium mt-1">
              {t('brand.systemTitle')}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>{t('brand.course')}</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login_id"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                {t('auth.loginId')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-700"
                >
                  {t('auth.password')}
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
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
              className="w-full mt-2 py-3 px-4 bg-[#1B4D3E] hover:bg-[#153E32] active:bg-[#102E25] text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
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
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 mb-2.5 text-center">
              {t('auth.quickDemo')}
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => setDemoRole('ADM001', 'Super Admin')}
                className="px-2 py-1.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('COORD01', 'Coordinator')}
                className="px-2 py-1.5 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('TCH001', 'Teacher')}
                className="px-2 py-1.5 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('OBS001', 'Observer')}
                className="px-2 py-1.5 text-[11px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition"
              >
                Observer
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('STU2026-001', 'Student')}
                className="col-span-2 px-2 py-1.5 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
              >
                Student (STU2026-001)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-emerald-200/80 py-2">
        <p>
          © 2026 {t('brand.name')} • {t('brand.tagline')}
        </p>
      </footer>
    </div>
  );
}
