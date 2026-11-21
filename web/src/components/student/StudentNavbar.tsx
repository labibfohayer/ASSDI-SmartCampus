'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  LogOut,
  User as UserIcon,
  BookOpen,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function StudentNavbar() {
  const { user, logoutUser } = useAuth();
  const { t, isBangla } = useLanguage();

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <Link href="/student" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 p-1 flex items-center justify-center shadow-xs">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm tracking-tight">
                    {t('brand.name')}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-700 text-white rounded-full">
                    {isBangla ? 'শিক্ষার্থী পোর্টাল' : 'Student Portal'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {t('brand.course')}
                </p>
              </div>
            </Link>
          </div>

          {/* User info, Language & Logout */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">
                {user?.full_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-gray-800 leading-tight">
                  {user?.full_name || 'Student'}
                </p>
                <p className="text-[10px] text-emerald-700 font-mono font-medium">
                  {user?.login_id}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title={t('auth.logout')}
              className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
