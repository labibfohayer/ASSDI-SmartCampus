'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Users,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  LayoutDashboard,
  QrCode,
  ClipboardCheck,
  HelpCircle,
  AlertTriangle,
  GraduationCap,
  Star,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  Globe,
  Clock,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';

export interface NavItem {
  href: string;
  labelBn: string;
  labelEn: string;
  icon: any;
  badge?: string | number;
}

export interface NavSection {
  titleBn?: string;
  titleEn?: string;
  items: NavItem[];
}

interface DashboardShellProps {
  children: React.ReactNode;
  role: 'super_admin' | 'coordinator' | 'teacher' | 'student' | 'observer' | 'reports';
  noticeBanner?: React.ReactNode;
}

export default function DashboardShell({ children, role, noticeBanner }: DashboardShellProps) {
  const { user, logoutUser } = useAuth();
  const { isBangla, t } = useLanguage();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Pre-configured role-specific navigation menus (Serial-by-serial vertical list)
  const getNavSections = (): NavSection[] => {
    switch (role) {
      case 'super_admin':
        return [
          {
            titleBn: 'প্রধান অ্যাডমিন মেনু',
            titleEn: 'Main Admin Menu',
            items: [
              {
                href: '/admin',
                labelBn: 'অ্যাডমিন ওভারভিউ',
                labelEn: 'System Overview',
                icon: ShieldCheck,
              },
              {
                href: '/admin/students',
                labelBn: 'শিক্ষার্থী ও ভর্তি',
                labelEn: 'Student Directory',
                icon: Users,
              },
              {
                href: '/admin/courses',
                labelBn: 'কোর্স ও ব্যাচসমূহ',
                labelEn: 'Courses & Batches',
                icon: Layers,
              },
              {
                href: '/admin/sessions',
                labelBn: 'ক্লাস সেশন ও রুটিন',
                labelEn: 'Class Sessions & Routine',
                icon: Calendar,
              },
              {
                href: '/announcements',
                labelBn: 'নোটিশ ও অ্যানাউন্সমেন্ট',
                labelEn: 'Notice Board',
                icon: Megaphone,
              },
            ],
          },
          {
            titleBn: 'অ্যানালিটিক্স ও রিপোর্টস',
            titleEn: 'Analytics & Reports',
            items: [
              {
                href: '/coordinator',
                labelBn: 'কো-অর্ডিনেটর ড্যাশবোর্ড',
                labelEn: 'Coordinator Dashboard',
                icon: BarChart3,
              },
              {
                href: '/reports',
                labelBn: '৯টি এসআরএস রিপোর্টস হাব',
                labelEn: '9 SRS Reports Hub',
                icon: FileText,
              },
            ],
          },
        ];

      case 'coordinator':
      case 'observer':
        return [
          {
            titleBn: 'কো-অর্ডিনেশন ও মনিটরিং',
            titleEn: 'Coordination & Monitoring',
            items: [
              {
                href: '/coordinator',
                labelBn: 'ওভারভিউ অ্যানালিটিক্স',
                labelEn: 'Overview & KPIs',
                icon: LayoutDashboard,
              },
              {
                href: '/coordinator/batches',
                labelBn: 'ব্যাচ ও ফ্যাকাল্টি বিশ্লেষণ',
                labelEn: 'Batches & Faculty',
                icon: Layers,
              },
              {
                href: '/coordinator/at-risk',
                labelBn: 'ঝুঁকিপূর্ণ শিক্ষার্থী ট্র্যাকিং',
                labelEn: 'At-Risk Students',
                icon: AlertTriangle,
              },
              {
                href: '/announcements',
                labelBn: 'নোটিশ ও অ্যানাউন্সমেন্ট',
                labelEn: 'Notice Board',
                icon: Megaphone,
              },
            ],
          },
          {
            titleBn: 'প্রাতিষ্ঠানিক রিপোর্ট',
            titleEn: 'Institutional Reports',
            items: [
              {
                href: '/reports',
                labelBn: '৯টি এসআরএস রিপোর্টস হাব',
                labelEn: '9 SRS Reports Hub',
                icon: FileText,
              },
            ],
          },
        ];

      case 'teacher':
        return [
          {
            titleBn: 'ক্লাসরুম ও পাঠদান',
            titleEn: 'Classroom & Teaching',
            items: [
              {
                href: '/teacher',
                labelBn: 'আজকের ক্লাস ও সারসংক্ষেপ',
                labelEn: "Today's Schedule & Summary",
                icon: LayoutDashboard,
              },
              {
                href: '/teacher/qr',
                labelBn: 'প্রজেক্টর কিউআর কোড (লাইভ)',
                labelEn: 'Live Projector QR Code',
                icon: QrCode,
              },
              {
                href: '/teacher/attendance',
                labelBn: 'ম্যানুয়াল হাজিরা শিট',
                labelEn: 'Manual Attendance Roster',
                icon: ClipboardCheck,
              },
              {
                href: '/teacher/help-requests',
                labelBn: 'শিক্ষার্থী হেল্প রিকোয়েস্ট',
                labelEn: 'Student Help Board',
                icon: HelpCircle,
              },
              {
                href: '/teacher/understanding',
                labelBn: 'টপিক অনুধাবন অ্যানালিটিক্স',
                labelEn: 'Topic Understanding Analytics',
                icon: BarChart3,
              },
              {
                href: '/announcements',
                labelBn: 'নোটিশ বোর্ড',
                labelEn: 'Notice Board',
                icon: Megaphone,
              },
            ],
          },
          {
            titleBn: 'অফিসিয়াল রিপোর্টস',
            titleEn: 'Official Reports',
            items: [
              {
                href: '/reports',
                labelBn: '৯টি এসআরএস রিপোর্টস হাব',
                labelEn: '9 SRS Reports Hub',
                icon: FileText,
              },
            ],
          },
        ];

      case 'student':
        return [
          {
            titleBn: 'প্রধান মেনু',
            titleEn: 'Main Menu',
            items: [
              {
                href: '/student',
                labelBn: 'আজকের ক্লাস ও মূল্যায়ন',
                labelEn: "Today's Schedule & Feedback",
                icon: Calendar,
              },
            ],
          },
          {
            titleBn: 'লার্নিং ও সাপোর্ট',
            titleEn: 'Learning & Support',
            items: [
              {
                href: '/student?tab=attendance',
                labelBn: 'উপস্থিতির হিস্ট্রি লগ',
                labelEn: 'Attendance Log',
                icon: CheckCircle2,
              },
              {
                href: '/student?tab=help',
                labelBn: 'শিক্ষকের সমাধান ও উত্তর',
                labelEn: 'Teacher Help & Replies',
                icon: HelpCircle,
              },
              {
                href: '/announcements',
                labelBn: 'প্রাতিষ্ঠানিক নোটিশ বোর্ড',
                labelEn: 'Notice Board',
                icon: Megaphone,
              },
            ],
          },
        ];

      case 'reports':
      default:
        return [
          {
            titleBn: 'এসআরএস রিপোর্টিং হাব',
            titleEn: 'SRS Reporting Hub',
            items: [
              {
                href: '/reports',
                labelBn: '৯টি প্রাতিষ্ঠানিক রিপোর্ট',
                labelEn: '9 Institutional Reports',
                icon: FileText,
              },
            ],
          },
        ];
    }
  };

  const navSections = getNavSections();

  const getRoleBadge = () => {
    switch (user?.role || role) {
      case 'super_admin':
        return {
          label: isBangla ? 'সুপার অ্যাডমিন' : 'Super Admin',
          color: 'bg-slate-800 text-white',
        };
      case 'coordinator':
        return {
          label: isBangla ? 'কোর্স কো-অর্ডিনেটর' : 'Coordinator',
          color: 'bg-[#1B4D3E] text-white',
        };
      case 'teacher':
        return {
          label: isBangla ? 'সম্মানিত শিক্ষক' : 'Faculty Member',
          color: 'bg-teal-800 text-white',
        };
      case 'observer':
        return {
          label: isBangla ? 'পর্যবেক্ষক (Observer)' : 'Observer',
          color: 'bg-purple-800 text-white',
        };
      case 'student':
        return {
          label: isBangla ? 'শিক্ষার্থী' : 'Student',
          color: 'bg-emerald-700 text-white',
        };
      default:
        return {
          label: isBangla ? 'স্টাফ' : 'Staff',
          color: 'bg-slate-700 text-white',
        };
    }
  };

  const roleBadge = getRoleBadge();

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  const isLinkActive = (href: string) => {
    if (typeof window !== 'undefined' && href.includes('?')) {
      const currentFullUrl = pathname + window.location.search;
      if (currentFullUrl === href) return true;
      if (href === '/student' && !window.location.search) return true;
    }
    if (pathname === href) return true;
    if (
      href !== '/admin' &&
      href !== '/coordinator' &&
      href !== '/teacher' &&
      href !== '/student' &&
      href !== '/reports' &&
      !href.includes('?')
    ) {
      return pathname.startsWith(href);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col md:flex-row text-slate-800 font-sans">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* LEFT SIDEBAR (সিরিয়াল বাই সিরিয়াল উল্লম্ব মেনুবার) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#0B2A21] border-r border-[#071F18] flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Institute Brand & Identity */}
        <div>
          <div className="p-5 border-b border-emerald-950/80 flex items-start justify-between">
            <Link
              href={role === 'super_admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/coordinator'}
              className="flex items-center gap-3 group"
            >
              <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-white text-xs sm:text-sm tracking-tight leading-snug line-clamp-1">
                  {t('brand.name')}
                </h1>
                <p className="text-[11px] text-emerald-300/90 font-medium line-clamp-1">
                  {t('brand.course')}
                </p>
                <div className="mt-1">
                  <span
                    className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider bg-emerald-950 text-emerald-200 border border-emerald-700/60"
                  >
                    {roleBadge.label}
                  </span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-emerald-400 hover:text-white md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items (Serial by Serial) */}
          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-14rem)]">
            {navSections.map((sec, secIdx) => (
              <div key={secIdx} className="space-y-1">
                {(sec.titleBn || sec.titleEn) && (
                  <p className="px-3 text-[10px] font-bold uppercase text-emerald-400/70 tracking-widest mb-2">
                    {isBangla ? sec.titleBn : sec.titleEn}
                  </p>
                )}

                <ul className="space-y-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const active = isLinkActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#164E3D] text-white shadow-sm ring-1 ring-emerald-400/40 font-bold'
                              : 'text-emerald-100/75 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                active ? 'text-emerald-300' : 'text-emerald-400/80 group-hover:text-white'
                              }`}
                            />
                            <span className="truncate">
                              {isBangla ? item.labelBn : item.labelEn}
                            </span>
                          </div>

                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                active
                                  ? 'bg-emerald-900 text-emerald-200 border border-emerald-600/50'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* If in Reports Hub, show quick back to user dashboard */}
            {role === 'reports' && (
              <div className="pt-2 border-t border-emerald-950/80">
                <Link
                  href={
                    user?.role === 'super_admin'
                      ? '/admin'
                      : user?.role === 'teacher'
                      ? '/teacher'
                      : user?.role === 'student'
                      ? '/student'
                      : '/coordinator'
                  }
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-200 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>{isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom: User Card, Language Toggle & Logout */}
        <div className="p-3 border-t border-[#071F18] bg-[#061C16] space-y-2">
          {/* User info snippet */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0B2A21] border border-emerald-900/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-600/40 flex items-center justify-center text-xs font-bold shrink-0">
                {user?.full_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-xs text-white truncate">
                  {user?.full_name || 'Staff User'}
                </p>
                <p className="text-[10px] font-mono text-emerald-300/80 truncate">
                  {user?.login_id || 'user'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title={isBangla ? 'লগআউট' : 'Logout'}
              className="p-1.5 rounded-lg text-emerald-400/80 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Language Switcher Bar */}
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-semibold text-emerald-200/70 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400/70" />
              <span>{isBangla ? 'ভাষা / Language' : 'Language'}</span>
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 lg:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs">
          {/* Left: Mobile Toggle & Page Context */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="text-slate-900 font-bold">{t('brand.name')}</span>
              <span>•</span>
              <span className="text-emerald-800">{t('brand.course')}</span>
            </div>
          </div>

          {/* Right: Live Status, Date & Role Indicator */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isBangla ? 'সিস্টেম সক্রিয়' : 'System Active'}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            <div className="sm:hidden">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Notice Banner (e.g. Observer Read-Only Notice) */}
        {noticeBanner}

        {/* Main Body Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Institutional Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
          <p>© 2026 আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI) • ঢাকা, বাংলাদেশ</p>
        </footer>
      </div>
    </div>
  );
}
