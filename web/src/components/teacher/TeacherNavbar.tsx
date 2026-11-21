'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  QrCode,
  CheckSquare,
  HelpCircle,
  BarChart3,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function TeacherNavbar() {
  const { user, logoutUser } = useAuth();
  const { t, isBangla } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      href: '/teacher',
      label: isBangla ? 'আজকের ক্লাস ও সামারি' : 'Overview & Classes',
      icon: LayoutDashboard,
    },
    {
      href: '/teacher/qr',
      label: isBangla ? 'লাইভ কিউআর স্ক্রিন' : 'Live QR Projector',
      icon: QrCode,
    },
    {
      href: '/teacher/attendance',
      label: isBangla ? 'হাজিরা ও কারেকশন' : 'Attendance Sheet',
      icon: CheckSquare,
    },
    {
      href: '/teacher/help-requests',
      label: isBangla ? 'হেল্প রিকোয়েস্ট বোর্ড' : 'Help Requests',
      icon: HelpCircle,
    },
    {
      href: '/teacher/understanding',
      label: isBangla ? 'লার্নিং ও ফিডব্যাক' : 'Understanding & Feedback',
      icon: BarChart3,
    },
  ];

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/teacher" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 p-1 flex items-center justify-center shadow-xs">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm tracking-tight">
                    {t('brand.name')}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                    {isBangla ? 'শিক্ষক পোর্টাল' : 'Teacher Portal'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {t('brand.course')}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1B4D3E] text-white shadow-xs'
                      : 'text-gray-600 hover:text-emerald-900 hover:bg-emerald-50/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: User info, Language, Logout */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* User Profile */}
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight">
                  {user?.full_name || user?.login_id || 'Teacher'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {user?.login_id}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title={t('auth.logout')}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-emerald-100 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="pb-2 mb-2 border-b border-gray-100 flex items-center gap-2 px-2 text-xs font-semibold text-emerald-800">
            <UserIcon className="w-4 h-4" />
            <span>
              {user?.full_name} ({user?.login_id})
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-[#1B4D3E] text-white font-bold'
                    : 'text-gray-700 hover:bg-emerald-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
