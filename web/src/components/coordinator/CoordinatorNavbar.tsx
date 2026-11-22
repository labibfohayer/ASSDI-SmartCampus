'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  AlertTriangle,
  FileText,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function CoordinatorNavbar() {
  const { user, logoutUser } = useAuth();
  const { t, isBangla } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isObserver = user?.role === 'observer';

  const navItems = [
    {
      href: '/coordinator',
      label: isBangla ? 'ওভারভিউ অ্যানালিটিক্স' : 'Overview & KPIs',
      icon: LayoutDashboard,
    },
    {
      href: '/coordinator/batches',
      label: isBangla ? 'ব্যাচ ও শিক্ষক বিশ্লেষণ' : 'Batches & Faculty',
      icon: Layers,
    },
    {
      href: '/coordinator/at-risk',
      label: isBangla ? 'ঝুঁকিপূর্ণ শিক্ষার্থী তালিকা' : 'At-Risk Students',
      icon: AlertTriangle,
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
            <Link href="/coordinator" className="flex items-center gap-2.5">
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
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                      isObserver
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]'
                    }`}
                  >
                    {isObserver ? <Eye className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3 text-[#0F766E]" />}
                    <span>{isObserver ? 'পর্যবেক্ষক মোড' : 'কোঅর্ডিনেটর পোর্টাল'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#0F766E] font-medium">
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
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0F766E] hover:bg-[#F0FDFA]'
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
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isObserver ? 'bg-purple-100 text-purple-800' : 'bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E]'
                }`}
              >
                {isObserver ? <Eye className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0F172A] leading-tight font-heading">
                  {user?.full_name || user?.login_id || 'Coordinator'}
                </p>
                <p className="text-[10px] text-[#0F766E] font-mono">
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

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#475569] hover:text-[#0F766E] hover:bg-[#F0FDFA] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="pb-2 mb-2 border-b border-[#E2E8F0] flex items-center gap-2 px-2 text-xs font-semibold text-[#0F766E]">
            <UserIcon className="w-4 h-4 text-[#0F766E]" />
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
                    ? 'bg-[#0F766E] text-white font-bold'
                    : 'text-[#475569] hover:bg-[#F0FDFA] hover:text-[#0F766E]'
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
