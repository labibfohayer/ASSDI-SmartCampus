'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  ArrowLeft,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function ReportsNavbar() {
  const { user, logoutUser } = useAuth();
  const { t, isBangla } = useLanguage();

  const getBackLink = () => {
    if (!user) {
      return {
        href: '/login',
        label: isBangla ? 'লগইন' : 'Login',
        icon: LogOut,
      };
    }
    switch (user.role) {
      case 'super_admin':
        return {
          href: '/admin',
          label: isBangla ? 'অ্যাডমিন প্যানেল' : 'Admin Panel',
          icon: ShieldAlert,
        };
      case 'teacher':
        return {
          href: '/teacher',
          label: isBangla ? 'শিক্ষক পোর্টাল' : 'Teacher Portal',
          icon: BookOpen,
        };
      case 'observer':
      case 'coordinator':
      default:
        return {
          href: '/coordinator',
          label: isBangla ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Coordinator Dashboard',
          icon: BarChart3,
        };
    }
  };

  const backNav = getBackLink();
  const BackIcon = backNav.icon;

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/reports" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] p-1 flex items-center justify-center shadow-xs">
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
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F766E] text-white rounded-full">
                    {isBangla ? 'এসআরএস রিপোর্টস হাব' : 'Reports Hub'}
                  </span>
                </div>
                <p className="text-[11px] text-[#0F766E] font-medium">
                  {t('brand.course')}
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Back Button, Language, User info, Logout */}
          <div className="flex items-center gap-3">
            <Link
              href={backNav.href}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-[#F0FDFA] hover:text-[#0F766E] hover:border-[#CCFBF1] transition-colors"
            >
              <BackIcon className="w-3.5 h-3.5 text-gray-500" />
              <span>{backNav.label}</span>
            </Link>

            <LanguageSwitcher />

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#FFFBEB] border border-[#FCD34D] text-[#0F766E] flex items-center justify-center text-xs font-bold">
                {user?.full_name?.charAt(0) || <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-gray-800 leading-tight">
                  {user?.full_name || 'Staff User'}
                </p>
                <p className="text-[10px] text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ') || 'User'}
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
