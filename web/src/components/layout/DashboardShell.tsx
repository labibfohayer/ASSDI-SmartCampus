'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
  Award,
  ArrowLeft,
  Globe,
  Clock,
  Megaphone,
  ChevronRight,
  ChevronDown,
  Settings,
  Bookmark,
  Archive,
  Smartphone,
  Search,
  CreditCard,
} from 'lucide-react';
import { triggerPwaInstall } from '@/components/pwa/PwaInstaller';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';
import AdminMenuManagerModal, {
  CustomNavItem,
  AVAILABLE_ICONS,
} from '@/components/admin/AdminMenuManagerModal';

const DEFAULT_ADMIN_MENUS: CustomNavItem[] = [
  {
    id: 'students',
    href: '/admin/students',
    labelBn: 'স্টুডেন্ট',
    labelEn: 'Students',
    iconName: 'Users',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'teachers',
    href: '/admin/courses',
    labelBn: 'টিচার্স',
    labelEn: 'Teachers',
    iconName: 'GraduationCap',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'reports_hub',
    href: '/reports',
    labelBn: '৯টি এসআরএস রিপোর্টস হাব',
    labelEn: '9 SRS Reports Hub',
    iconName: 'FileText',
    section: 'analytics',
    isArchived: false,
    isSystemDefault: true,
  },
];

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
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [menuManagerOpen, setMenuManagerOpen] = useState(false);
  const [adminMenus, setAdminMenus] = useState<CustomNavItem[]>(DEFAULT_ADMIN_MENUS);
  const [currentSearch, setCurrentSearch] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const studentSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setStudentSearchFocused(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setStudentSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentSearch(window.location.search);
      const updateSearch = (e?: any) => {
        if (e?.detail?.href && e.detail.href.includes('?')) {
          const [, query] = e.detail.href.split('?');
          setCurrentSearch('?' + query);
        } else if (e?.detail?.href && !e.detail.href.includes('?')) {
          setCurrentSearch('');
        } else {
          setCurrentSearch(window.location.search);
        }
      };
      window.addEventListener('popstate', updateSearch);
      window.addEventListener('assdi-nav-change', updateSearch);
      return () => {
        window.removeEventListener('popstate', updateSearch);
        window.removeEventListener('assdi-nav-change', updateSearch);
      };
    }
  }, [pathname]);

  const handleNavClick = (href: string, e?: React.MouseEvent<HTMLElement>) => {
    setMobileSidebarOpen(false);
    if (typeof window !== 'undefined') {
      if (href.includes('?')) {
        const [, query] = href.split('?');
        setCurrentSearch('?' + query);
      } else {
        setCurrentSearch('');
      }
      if (pathname === '/student' && href.startsWith('/student')) {
        if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
        }
        window.history.pushState(null, '', href);
      }
      window.dispatchEvent(new CustomEvent('assdi-tab-navigate', { detail: { href } }));
      window.dispatchEvent(new CustomEvent('assdi-nav-change', { detail: { href } }));
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('assdi_admin_nav_menus_v4');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strictly exclude any cross-dashboard coordinator navigation from admin menus
            const sanitized = parsed.filter(
              (m: any) => m.id !== 'coordinator_analytics' && m.href !== '/coordinator'
            );
            setAdminMenus(sanitized);
            localStorage.setItem('assdi_admin_nav_menus_v4', JSON.stringify(sanitized));
          }
        }
      } catch (e) {
        console.error('Failed to load custom admin menus:', e);
      }
    }
  }, []);

  const handleSaveAdminMenus = (updated: CustomNavItem[]) => {
    setAdminMenus(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assdi_admin_nav_menus_v4', JSON.stringify(updated));
    }
  };

  const handleResetAdminMenus = () => {
    setAdminMenus(DEFAULT_ADMIN_MENUS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('assdi_admin_nav_menus_v4');
    }
  };

  // Pre-configured role-specific navigation menus (Serial-by-serial vertical list)
  const getNavSections = (): NavSection[] => {
    switch (role) {
      case 'super_admin':
      case 'coordinator': {
        const activeOnly = adminMenus.filter((m) => !m.isArchived);
        const mainItems = activeOnly
          .filter((m) => m.section === 'main')
          .map((m) => ({
            href: m.href,
            labelBn: m.labelBn,
            labelEn: m.labelEn,
            icon: AVAILABLE_ICONS[m.iconName] || Bookmark,
          }));

        const analyticsItems = activeOnly
          .filter((m) => m.section === 'analytics')
          .map((m) => ({
            href: m.href,
            labelBn: m.labelBn,
            labelEn: m.labelEn,
            icon: AVAILABLE_ICONS[m.iconName] || Bookmark,
          }));

        return [
          {
            titleBn: 'প্রধান কোঅর্ডিনেশন মেনু',
            titleEn: 'Main Coordination Menu',
            items: mainItems,
          },
          {
            titleBn: 'অ্যানালিটিক্স ও রিপোর্টস',
            titleEn: 'Analytics & Reports',
            items: analyticsItems,
          },
        ];
      }

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
            titleEn: 'MAIN MENU',
            items: [
              {
                href: '/student?tab=today',
                labelBn: 'আজকের ক্লাস ও মূল্যায়ন',
                labelEn: "Today's Schedule & Feedback",
                icon: Calendar,
              },
              {
                href: '/student?scan=true',
                labelBn: 'কিউআর দিয়ে উপস্থিতি',
                labelEn: 'Scan Attendance QR',
                icon: QrCode,
              },
            ],
          },
          {
            titleBn: 'লার্নিং ও সাপোর্ট',
            titleEn: 'LEARNING & SUPPORT',
            items: [
              {
                href: '/student?tab=materials',
                labelBn: 'লেকচার শিট ও রিসোর্স হাব',
                labelEn: 'Lecture Notes & Hub',
                icon: BookOpen,
              },
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
                href: '/student?tab=graduation',
                labelBn: 'সনদ ও গ্র্যাজুয়েশন ট্র্যাকার',
                labelEn: 'Graduation & Certificate',
                icon: Award,
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
      case 'coordinator':
        return {
          label: isBangla ? 'কোর্স কো-অর্ডিনেটর' : 'Course Coordinator',
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

  const getRoleHomeHref = () => {
    switch (role) {
      case 'super_admin':
      case 'coordinator':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'observer':
        return '/coordinator';
      case 'student':
      default:
        return '/student';
    }
  };

  const getRoleBadgeLabel = () => {
    switch (role) {
      case 'super_admin':
      case 'coordinator':
        return isBangla ? 'COORDINATOR / কোঅর্ডিনেটর' : 'COORDINATOR';
      case 'teacher':
        return isBangla ? 'TEACHER / শিক্ষক' : 'TEACHER';
      case 'observer':
        return isBangla ? 'OBSERVER / পর্যবেক্ষক' : 'OBSERVER';
      case 'student':
      default:
        return isBangla ? 'STUDENT / শিক্ষার্থী' : 'STUDENT';
    }
  };

  const handleLogout = async () => {
    if (confirm(t('auth.logoutConfirm'))) {
      await logoutUser();
    }
  };

  const isLinkActive = (href: string) => {
    if (href.includes('?')) {
      const currentFullUrl = pathname + currentSearch;
      if (currentFullUrl === href) return true;
      const [base, query] = href.split('?');
      if (pathname === base && currentSearch.includes(query)) return true;
      return false;
    }
    if (pathname === href) {
      if (href === '/student' && currentSearch) {
        return false;
      }
      return true;
    }
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

  // Define mobile bottom navigation items based on current role
  const getBottomNavItems = () => {
    switch (role) {
      case 'teacher':
        return [
          {
            href: '/teacher',
            labelBn: 'হোম',
            labelEn: 'Home',
            icon: LayoutDashboard,
          },
          {
            href: '/teacher/qr',
            labelBn: 'কিউআর কোড',
            labelEn: 'QR Code',
            icon: QrCode,
          },
          {
            href: '/teacher/attendance',
            labelBn: 'হাজিরা শীট',
            labelEn: 'Roster',
            icon: ClipboardCheck,
          },
          {
            href: '/teacher/help-requests',
            labelBn: 'হেল্প বোর্ড',
            labelEn: 'Help',
            icon: HelpCircle,
          },
        ];
      case 'student':
        return [
          {
            href: '/student',
            labelBn: 'হোম',
            labelEn: 'Home',
            icon: LayoutDashboard,
          },
          {
            href: '/student?scan=true',
            labelBn: 'স্ক্যান',
            labelEn: 'Scan',
            icon: QrCode,
          },
          {
            href: '/student?tab=materials',
            labelBn: 'ক্লাস স্টাডি',
            labelEn: 'Study',
            icon: BookOpen,
          },
          {
            href: '/student?tab=graduation',
            labelBn: 'সনদপত্র',
            labelEn: 'Cert',
            icon: Award,
          },
        ];
      case 'coordinator':
        return [
          {
            href: '/coordinator',
            labelBn: 'ড্যাশবোর্ড',
            labelEn: 'Dashboard',
            icon: LayoutDashboard,
          },
          {
            href: '/coordinator/batches',
            labelBn: 'ব্যাচ বিশ্লেষণ',
            labelEn: 'Batches',
            icon: Layers,
          },
          {
            href: '/coordinator/at-risk',
            labelBn: 'ঝুঁকিপূর্ণ ছাত্র',
            labelEn: 'At-Risk',
            icon: AlertTriangle,
          },
          {
            href: '/reports',
            labelBn: 'রিপোর্ট',
            labelEn: 'Reports',
            icon: FileText,
          },
        ];
      case 'super_admin':
      case 'coordinator':
        return [
          {
            href: '/admin',
            labelBn: 'ওভারভিউ',
            labelEn: 'Overview',
            icon: ShieldCheck,
          },
          {
            href: '/admin/students',
            labelBn: 'শিক্ষার্থী',
            labelEn: 'Students',
            icon: Users,
          },
          {
            href: '/admin/sessions',
            labelBn: 'ক্লাস সেশন',
            labelEn: 'Sessions',
            icon: Calendar,
          },
          {
            href: '/reports',
            labelBn: 'রিপোর্ট',
            labelEn: 'Reports',
            icon: FileText,
          },
        ];
      default: // observer or fallback
        return [
          {
            href: role === 'observer' ? '/coordinator' : '/admin',
            labelBn: 'ড্যাশবোর্ড',
            labelEn: 'Dashboard',
            icon: LayoutDashboard,
          },
          {
            href: '/reports',
            labelBn: 'রিপোর্ট',
            labelEn: 'Reports',
            icon: FileText,
          },
        ];
    }
  };

  const bottomNavItems = getBottomNavItems();

  // Find current active item label for breadcrumbs
  let activeItemLabel = '';
  for (const section of navSections) {
    for (const item of section.items) {
      if (isLinkActive(item.href)) {
        activeItemLabel = isBangla ? item.labelBn : item.labelEn;
        break;
      }
    }
    if (activeItemLabel) break;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-[#0F172A] font-sans">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* LEFT SIDEBAR (Islamic Modern Forest Green for All Roles) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] md:w-64 lg:w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 bg-gradient-to-b from-[#002F25] via-[#00281F] to-[#001F18] border-r border-[#00221A] text-white ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Institute Brand & Identity */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-3 pb-2 border-b border-[#00241C] bg-[#002F25] flex flex-col items-center text-center shrink-0 relative">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full md:hidden cursor-pointer active:scale-95 transition bg-white/10 hover:bg-white/20 text-[#A7F3D0] border border-[#065F46]"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>

            <Link
              href={getRoleHomeHref()}
              onClick={() => setMobileSidebarOpen(false)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white p-2 flex items-center justify-center shadow-lg border-2 border-emerald-500/30 mb-1.5 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold !text-white text-sm tracking-tight leading-snug font-serif block">
                As-Sunnah
              </span>
              <span className="text-[10px] font-semibold !text-[#A7F3D0] tracking-wider mt-0.5 block">
                Skill Development Institute
              </span>
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold uppercase rounded-md tracking-wider bg-[#00221A] text-[#FDE68A] border border-[#065F46]">
                  {getRoleBadgeLabel()}
                </span>
              </div>
            </Link>
          </div>

          {/* Top Primary Dashboard Menu Button (All Roles) */}
          <div className="px-3 pt-3 pb-0.5 shrink-0">
            <Link
              href={getRoleHomeHref()}
              onClick={(e) => handleNavClick(getRoleHomeHref(), e)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                (role === 'student' ? pathname === '/student' && !currentSearch : pathname === getRoleHomeHref())
                  ? 'bg-gradient-to-r from-[#FF8108] to-[#EA580C] text-white shadow-md shadow-orange-950/30'
                  : 'text-[#D1FAE5]/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 ${
                  (role === 'student' ? pathname === '/student' && !currentSearch : pathname === getRoleHomeHref()) ? 'text-white' : 'text-[#6EE7B7]'
                }`}
              />
              <span>{isBangla ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
            </Link>
          </div>

          {/* Navigation Items (Serial by Serial) */}
          <nav className="p-3 overflow-y-auto flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {navSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-1">
                  {(sec.titleBn || sec.titleEn) && (
                    <p
                      className={`px-3 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-serif ${
                        role === 'student' ? 'text-[#6EE7B7]' : 'text-[#B45309]'
                      }`}
                    >
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
                            onClick={(e) => handleNavClick(item.href, e)}
                            className={`relative flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-200 cursor-pointer active:scale-[0.98] ${
                              active
                                ? 'bg-gradient-to-r from-[#FF8108] to-[#EA580C] text-white font-bold shadow-md shadow-orange-950/30'
                                : 'text-[#D1FAE5]/80 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  active ? 'text-white' : 'text-[#6EE7B7]'
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
                                    ? 'bg-white text-[#EA580C]'
                                    : 'bg-[#00221A] border border-[#065F46] text-[#6EE7B7]'
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
                <div className="pt-2 border-t border-[#00241C]">
                  <Link
                    href={getRoleHomeHref()}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#FDE68A] hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#FDE68A]" />
                    <span>{isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
                  </Link>
                </div>
              )}

              {/* Coordinator Navigation Customizer Button */}
              {(role === 'super_admin' || role === 'coordinator') && (
                <div className="pt-2 border-t border-[#00241C]">
                  <button
                    type="button"
                    onClick={() => setMenuManagerOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[#FDE68A] border border-[#065F46] text-xs font-bold transition flex items-center justify-between shadow-xs cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#FDE68A]" />
                      <span>{isBangla ? 'মেনু এডিটর ও আর্কাইভ' : 'Menu & Archive Control'}</span>
                    </div>
                    {adminMenus.some((m) => m.isArchived) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#FF8108] text-white font-extrabold">
                        {adminMenus.filter((m) => m.isArchived).length} {isBangla ? 'হাইড' : 'hidden'}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom: Mosque Card + Copyright (Unified across All Roles) */}
        <div className="p-2.5 border-t border-[#00241C] bg-[#001F18] space-y-2 shrink-0">
          {/* Islamic Mosque Artwork Quote Card */}
          <div className="pt-0.5 pb-1 px-1 flex justify-center">
            <div className="relative group w-full max-w-[230px]">
              <Image
                src="/islamic-sidebar-card.png"
                alt="জ্ঞানই শান্তি, দাওয়াই সফলতা"
                width={320}
                height={320}
                priority
                quality={100}
                className="w-full h-auto object-contain drop-shadow-md group-hover:scale-102 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Footer Copyright with Red Heart */}
          <div className="text-center pt-1.5 pb-0.5 text-[9.5px] text-[#A7F3D0]/70 space-y-0.5 border-t border-[#00241C]">
            <p>© 2026 As-Sunnah Skill Development Institute</p>
            <p className="flex items-center justify-center gap-1 text-[9px]">
              <span>All rights reserved.</span>
              <span className="text-rose-500 text-xs">❤️</span>
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-w-0 md:pl-64 lg:pl-72 relative ${
          role === 'student' ? 'bg-[#F8FDF7]' : 'bg-[#F8FAFC]'
        }`}
      >
        {/* Ambient Sky-Blue Light Glow Cascading from Top (Locked / Fixed in place on scroll) */}
        <div
          className="fixed top-0 right-0 left-0 md:left-64 lg:left-72 h-[560px] pointer-events-none bg-gradient-to-b from-[#DCF4F1] via-[#EAF8F5]/85 via-[#F4FCFA]/45 to-transparent z-0"
          aria-hidden="true"
        />

        {/* Top Header Bar (Unified Pristine Header across All Roles - Desktop Menu Icon & Search Bar Removed) */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] h-11 flex items-center justify-between px-3.5 sm:px-5 shadow-2xs gap-3">
          {/* Left: Mobile Drawer Button & Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:bg-emerald-50 md:hidden cursor-pointer active:scale-95 transition shrink-0"
              title="Open Navigation"
              aria-label="মেনু খুলুন"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Subtle Breadcrumb Context */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-bold text-[#0F172A] font-serif">{t('brand.name')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span className="font-bold text-[#0F766E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-md border border-[#CCFBF1]">
                {activeItemLabel || t('brand.course')}
              </span>
            </div>
          </div>

          {/* Right: Academic Cohort, Language Switcher, Notification Bell & User Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            {/* Academic Cohort Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-[#334155] text-xs font-semibold shadow-2xs">
              <span className="text-[#0F766E] font-bold">SBMC</span>
              <span className="text-slate-300">•</span>
              <span className="text-[#475569] font-medium">
                {role === 'student'
                  ? isBangla ? 'ব্যাচ ৪২' : 'Batch #42'
                  : role === 'teacher'
                  ? isBangla ? 'অনুষদ শিক্ষক' : 'Faculty'
                  : (role === 'super_admin' || role === 'coordinator')
                  ? isBangla ? 'কোর্স কোঅর্ডিনেটর' : 'Course Coordinator'
                  : isBangla ? 'সিস্টেম সক্রিয়' : 'System Active'}
              </span>
            </div>

            {/* Language Switcher Button */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Account Dropdown (For ALL Roles: Student, Teacher, Admin, Coordinator) */}
            <div ref={profileDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 sm:gap-2.5 py-1 px-1.5 sm:px-2.5 rounded-full hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#002F25] to-[#0F766E] text-white flex items-center justify-center text-xs sm:text-sm font-extrabold shadow-xs border-2 border-emerald-200 shrink-0">
                  {user?.full_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left leading-tight max-w-[150px]">
                  <p className="text-xs font-bold text-[#0F172A] truncate font-serif">
                    {user?.full_name || (role === 'student' ? 'Abdullah Student' : role === 'teacher' ? 'Faculty Teacher' : 'Admin User')}
                  </p>
                  <p className="text-[10.5px] font-medium text-[#64748B] truncate">
                    {roleBadge.label}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-[#0F172A] truncate font-serif">
                      {user?.full_name || (role === 'student' ? 'Abdullah Student' : 'Staff User')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10.5px] font-mono text-[#0F766E] truncate">
                        {user?.login_id || 'ID-2026-001'}
                      </p>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Role-Specific Shortcuts */}
                    {role === 'student' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            if (pathname !== '/student') router.push('/student');
                            else handleNavClick('/student');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'ড্যাশবোর্ড ওভারভিউ' : 'Dashboard Overview'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            if (pathname !== '/student') router.push('/student?card=true');
                            else handleNavClick('/student?card=true');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'ডিজিটাল আইডি ও এডমিট কার্ড' : 'Digital Student ID Card'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            if (pathname !== '/student') router.push('/student?tab=attendance');
                            else handleNavClick('/student?tab=attendance');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'উপস্থিতির হিস্ট্রি লগ' : 'Attendance History'}</span>
                        </button>
                      </>
                    )}

                    {role === 'teacher' && (
                      <>
                        <Link
                          href="/teacher"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'শিক্ষক ড্যাশবোর্ড' : 'Teacher Dashboard'}</span>
                        </Link>
                        <Link
                          href="/teacher/qr"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'লাইভ কিউআর প্রজেক্টর' : 'Live QR Projector'}</span>
                        </Link>
                        <Link
                          href="/teacher/attendance"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <ClipboardCheck className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'ম্যানুয়াল হাজিরা শিট' : 'Manual Attendance'}</span>
                        </Link>
                        <Link
                          href="/teacher/help-requests"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'শিক্ষার্থী হেল্প বোর্ড' : 'Student Help Board'}</span>
                        </Link>
                        <Link
                          href="/teacher/understanding"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <BarChart3 className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'টপিক অনুধাবন অ্যানালিটিক্স' : 'Understanding Analytics'}</span>
                        </Link>
                      </>
                    )}

                    {(role === 'super_admin' || role === 'coordinator') && (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'কোঅর্ডিনেশন সেন্টার' : 'Coordination Center'}</span>
                        </Link>
                        <Link
                          href="/admin/students"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'শিক্ষার্থী ও ভর্তি' : 'Student Directory'}</span>
                        </Link>
                        <Link
                          href="/admin/courses"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <Layers className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? 'কোর্স ও ব্যাচসমূহ' : 'Courses & Batches'}</span>
                        </Link>
                        <Link
                          href="/reports"
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-[#0F766E]" />
                          <span>{isBangla ? '৯টি এসআরএস রিপোর্টস' : '9 SRS Reports Hub'}</span>
                        </Link>
                      </>
                    )}

                    {/* Shared mobile language switcher */}
                    <div className="sm:hidden px-3.5 py-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isBangla ? 'ভাষা' : 'Language'}
                      </span>
                      <LanguageSwitcher />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        triggerPwaInstall();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-[#B45309] transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-[#FF8108]" />
                      <span>{isBangla ? 'হোমস্ক্রিনে অ্যাপ ইনস্টল' : 'Install App (PWA)'}</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>{isBangla ? 'লগআউট করুন' : 'Logout'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Notice Banner (e.g. Observer Read-Only Notice) */}
        {noticeBanner}

        {/* Main Body Content (Full width across all roles - zero empty left/right boxed gutters) */}
        <main
          className={`flex-1 w-full relative z-10 ${
            role === 'student' || pathname === '/admin'
              ? 'flex flex-col px-4 sm:px-6 pt-3 pb-24 md:pb-3'
              : 'w-full px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 pb-20 md:pb-2'
          }`}
        >
          {children}
        </main>

        {/* Institutional Footer */}
        <footer
          className={`border-t border-slate-200/80 bg-white text-center text-slate-500 ${
            role === 'student' || pathname === '/admin'
              ? 'py-2 text-[11px] pb-20 md:pb-2'
              : 'py-1.5 text-[10.5px] pb-20 md:pb-1.5'
          }`}
        >
          <p>© 2026 আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI) • ঢাকা, বাংলাদেশ</p>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (নেটিভ অ্যাপ স্টাইল কুইক অ্যাক্সেস) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1 py-1 flex items-center justify-around"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(item.href, e)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-lg text-center transition-all duration-150 active:scale-95 ${
                active
                  ? 'text-[#0F766E] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg mb-0.5 transition-colors ${
                  active ? 'bg-[#CCFBF1] text-[#0F766E]' : 'bg-transparent text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight truncate max-w-[62px]">
                {isBangla ? item.labelBn : item.labelEn}
              </span>
            </Link>
          );
        })}

        {/* 5th item: Mobile Menu Drawer Trigger */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-lg text-center transition-all duration-150 active:scale-95 cursor-pointer ${
            mobileSidebarOpen
              ? 'text-[#B45309] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
          aria-label={isBangla ? 'সব মেনু দেখুন' : 'View all menus'}
        >
          <div
            className={`p-1 rounded-lg mb-0.5 transition-colors ${
              mobileSidebarOpen ? 'bg-amber-100 text-[#B45309]' : 'bg-transparent text-slate-500'
            }`}
          >
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight truncate max-w-[62px]">
            {isBangla ? 'সব মেনু' : 'All Menus'}
          </span>
        </button>
      </nav>

      {/* Coordinator Navigation Customizer Modal */}
      {(role === 'super_admin' || role === 'coordinator') && (
        <AdminMenuManagerModal
          isOpen={menuManagerOpen}
          onClose={() => setMenuManagerOpen(false)}
          menus={adminMenus}
          onSaveMenus={handleSaveAdminMenus}
          onResetDefaults={handleResetAdminMenus}
        />
      )}
    </div>
  );
}
