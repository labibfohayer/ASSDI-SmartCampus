'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Layers,
  Calendar,
  FileText,
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

export default function AdminNavbar() {
  const { user, logoutUser } = useAuth();
  const { t, isBangla } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      href: '/admin',
      label: isBangla ? 'অ্যাডমিন ওভারভিউ' : 'Overview',
      icon: ShieldAlert,
    },
    {
      href: '/admin/students',
      label: isBangla ? 'শিক্ষার্থী ব্যবস্থাপনা' : 'Students',
      icon: Users,
    },
    {
      href: '/admin/courses',
      label: isBangla ? 'কোর্স ও ব্যাচ' : 'Courses & Batches',
      icon: Layers,
    },
    {
      href: '/admin/sessions',
      label: isBangla ? 'ক্লাস সেশন ও শিডিউল' : 'Sessions',
      icon: Calendar,
    },
    {
      href: '/coordinator',
      label: isBangla ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Analytics',
      icon: BarChart3,
    },
    {
      href: '/reports',
      label: isBangla ? '৯টি এসআরএস রিপোর্টস' : 'SRS Reports Hub',
      icon: FileText,
    },
  ];

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] p-1 flex items-center justify-center shadow-xs">
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
                  <span className="font-bold text-[#0F172A] text-sm tracking-tight font-heading">
                    {t('brand.name')}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#B45309] text-white rounded-full">
                    {isBangla ? 'সুপার অ্যাডমিন' : 'Super Admin'}
                  </span>
                </div>
                <p className="text-[11px] text-[#B45309] font-medium">
                  {t('brand.course')}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Items */}
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
                      ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] shadow-xs'
                      : 'text-[#475569] hover:text-[#B45309] hover:bg-[#FFFBEB]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* User Profile */}
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] flex items-center justify-center font-bold text-xs">
                {user?.full_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0F172A] leading-tight font-heading">
                  {user?.full_name || 'Super Admin'}
                </p>
                <p className="text-[10px] text-[#B45309] font-mono">
                  {user?.login_id}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title={t('auth.logout')}
              className="p-2 text-[#475569] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#475569] hover:text-[#B45309] hover:bg-[#FFFBEB] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="pb-2 mb-2 border-b border-[#E2E8F0] flex items-center gap-2 px-2 text-xs font-semibold text-[#B45309]">
            <UserIcon className="w-4 h-4 text-[#B45309]" />
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
                    ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] font-bold'
                    : 'text-[#475569] hover:bg-[#FFFBEB] hover:text-[#B45309]'
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
