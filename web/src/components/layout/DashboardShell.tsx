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
    id: 'overview',
    href: '/admin',
    labelBn: 'অ্যাডমিন ওভারভিউ',
    labelEn: 'System Overview',
    iconName: 'ShieldCheck',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'students',
    href: '/admin/students',
    labelBn: 'শিক্ষার্থী ও ভর্তি',
    labelEn: 'Student Directory',
    iconName: 'Users',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'courses',
    href: '/admin/courses',
    labelBn: 'কোর্স ও ব্যাচসমূহ',
    labelEn: 'Courses & Batches',
    iconName: 'Layers',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'sessions',
    href: '/admin/sessions',
    labelBn: 'ক্লাস সেশন ও রুটিন',
    labelEn: 'Class Sessions & Routine',
    iconName: 'Calendar',
    section: 'main',
    isArchived: false,
    isSystemDefault: true,
  },
  {
    id: 'announcements',
    href: '/announcements',
    labelBn: 'নোটিশ ও অ্যানাউন্সমেন্ট',
    labelEn: 'Notice Board',
    iconName: 'Megaphone',
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

  const handleNavClick = (href: string) => {
    setMobileSidebarOpen(false);
    if (typeof window !== 'undefined') {
      if (href.includes('?')) {
        const [, query] = href.split('?');
        setCurrentSearch('?' + query);
      } else {
        setCurrentSearch('');
      }
      if (pathname === '/student' && href.startsWith('/student')) {
        window.history.pushState(null, '', href);
      }
      window.dispatchEvent(new CustomEvent('assdi-tab-navigate', { detail: { href } }));
      window.dispatchEvent(new CustomEvent('assdi-nav-change', { detail: { href } }));
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('assdi_admin_nav_menus_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strictly exclude any cross-dashboard coordinator navigation from admin menus
            const sanitized = parsed.filter(
              (m: any) => m.id !== 'coordinator_analytics' && m.href !== '/coordinator'
            );
            setAdminMenus(sanitized);
            localStorage.setItem('assdi_admin_nav_menus_v1', JSON.stringify(sanitized));
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
      localStorage.setItem('assdi_admin_nav_menus_v1', JSON.stringify(updated));
    }
  };

  const handleResetAdminMenus = () => {
    setAdminMenus(DEFAULT_ADMIN_MENUS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('assdi_admin_nav_menus_v1');
    }
  };

  // Pre-configured role-specific navigation menus (Serial-by-serial vertical list)
  const getNavSections = (): NavSection[] => {
    switch (role) {
      case 'super_admin': {
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
            titleBn: 'প্রধান অ্যাডমিন মেনু',
            titleEn: 'Main Admin Menu',
            items: mainItems,
          },
          {
            titleBn: 'অ্যানালিটিক্স ও রিপোর্টস',
            titleEn: 'Analytics & Reports',
            items: analyticsItems,
          },
        ];
      }

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

      {/* LEFT SIDEBAR (Dynamic: Islamic Modern Forest Green for Student; Warm Cream for Others) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] md:w-64 lg:w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          role === 'student'
            ? 'bg-gradient-to-b from-[#002F25] via-[#00281F] to-[#001F18] border-r border-[#00221A] text-white'
            : 'bg-[#FFFBEB] border-r border-[#FCD34D]'
        } ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Institute Brand & Identity */}
        <div className="flex flex-col flex-1 min-h-0">
          {role === 'student' ? (
            <div className="p-3 pb-2 border-b border-[#00241C] bg-[#002F25] flex flex-col items-center text-center shrink-0 relative">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full md:hidden cursor-pointer active:scale-95 transition bg-white/10 hover:bg-white/20 text-[#A7F3D0] border border-[#065F46]"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>

              <Link
                href="/student"
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
                    STUDENT / শিক্ষার্থী
                  </span>
                </div>
              </Link>
            </div>
          ) : (
            <div className="p-4 sm:p-5 border-b border-[#FCD34D] flex items-start justify-between bg-[#FFFBEB] shrink-0">
              <Link
                href={role === 'super_admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/coordinator'}
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs border border-[#FCD34D] group-hover:scale-105 transition-transform">
                  <Image
                    src="/logo.png"
                    alt="ASSDI Logo"
                    width={34}
                    height={34}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold text-[#0F172A] text-xs sm:text-sm tracking-tight leading-snug line-clamp-1 font-serif">
                    {t('brand.name')}
                  </h1>
                  <p className="text-[11px] text-[#64748B] font-medium line-clamp-1">
                    {t('brand.course')}
                  </p>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider bg-white text-[#B45309] border border-[#FCD34D]">
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-[#FCD34D] md:hidden cursor-pointer active:scale-95 transition shadow-2xs"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Top Primary Dashboard Menu Button (Student Role - Reference Image Architecture) */}
          {role === 'student' && (
            <div className="px-3 pt-3 pb-0.5 shrink-0">
              <Link
                href="/student"
                onClick={() => handleNavClick('/student')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  pathname === '/student' && !currentSearch
                    ? 'bg-gradient-to-r from-[#FF8108] to-[#EA580C] text-white shadow-md shadow-orange-950/30'
                    : 'text-[#D1FAE5]/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/student' && !currentSearch ? 'text-white' : 'text-[#6EE7B7]'
                  }`}
                />
                <span>{isBangla ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
              </Link>
            </div>
          )}

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
                            onClick={() => handleNavClick(item.href)}
                            className={`relative flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                              active
                                ? role === 'student'
                                  ? 'bg-gradient-to-r from-[#FF8108] to-[#EA580C] text-white font-bold shadow-md shadow-orange-950/30'
                                  : 'bg-white text-[#B45309] shadow-xs border border-[#FCD34D] font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1.5 before:bg-[#D97706] before:rounded-r'
                                : role === 'student'
                                ? 'text-[#D1FAE5]/80 hover:text-white hover:bg-white/10'
                                : 'text-[#475569] hover:text-[#B45309] hover:bg-[#FEF3C7]/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  active
                                    ? 'text-white'
                                    : role === 'student'
                                    ? 'text-[#6EE7B7]'
                                    : 'text-[#64748B] group-hover:text-[#B45309]'
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
                                    : role === 'student'
                                    ? 'bg-[#00221A] border border-[#065F46] text-[#6EE7B7]'
                                    : 'bg-white/90 border border-[#FCD34D] text-[#B45309]'
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
                <div className="pt-2 border-t border-[#FCD34D]/70">
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
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#B45309] hover:bg-[#FEF3C7]/60 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#B45309]" />
                    <span>{isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
                  </Link>
                </div>
              )}

              {/* Super Admin Navigation Customizer Button */}
              {role === 'super_admin' && (
                <div className="pt-2 border-t border-[#FCD34D]/70">
                  <button
                    type="button"
                    onClick={() => setMenuManagerOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] text-xs font-bold transition flex items-center justify-between shadow-xs cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#B45309]" />
                      <span>{isBangla ? 'মেনু এডিটর ও আর্কাইভ' : 'Menu & Archive Control'}</span>
                    </div>
                    {adminMenus.some((m) => m.isArchived) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#B45309]/15 text-[#B45309] font-extrabold border border-[#B45309]/30">
                        {adminMenus.filter((m) => m.isArchived).length} {isBangla ? 'হাইড' : 'hidden'}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom: User Card (Non-student) or Mosque Card + Copyright (Student) */}
        <div
          className={`p-2.5 border-t space-y-2 shrink-0 ${
            role === 'student'
              ? 'border-[#00241C] bg-[#001F18]'
              : 'border-[#FCD34D] bg-[#FFFBEB]'
          }`}
        >
          {role === 'student' ? (
            <>
              {/* Islamic Mosque Artwork Quote Card (Student Only - Prominent & Beautifully Balanced) */}
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

              {/* Student Footer Copyright with Red Heart (Image 1 Style) */}
              <div className="text-center pt-1.5 pb-0.5 text-[9.5px] text-[#A7F3D0]/70 space-y-0.5 border-t border-[#00241C]">
                <p>© 2026 As-Sunnah Skill Development Institute</p>
                <p className="flex items-center justify-center gap-1 text-[9px]">
                  <span>All rights reserved.</span>
                  <span className="text-rose-500 text-xs">❤️</span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* User info snippet (Staff/Admin/Coordinator/Teacher) */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl shadow-2xs bg-white border border-[#FCD34D]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
                    {user?.full_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-bold text-xs truncate font-serif text-[#0F172A]">
                      {user?.full_name || 'Staff User'}
                    </p>
                    <p className="text-[10px] font-mono truncate text-[#64748B]">
                      {user?.login_id || 'user'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title={isBangla ? 'লগআউট' : 'Logout'}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 text-[#64748B] hover:text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile PWA Install Trigger */}
              <button
                type="button"
                onClick={triggerPwaInstall}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer bg-white hover:bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]"
              >
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>{isBangla ? 'হোমস্ক্রিনে অ্যাপ ইনস্টল' : 'Install PWA App'}</span>
                </span>
                <span className="text-[9px] text-white px-1.5 py-0.5 rounded-md font-bold bg-[#D97706]">
                  {isBangla ? 'যুক্ত করুন' : 'Install'}
                </span>
              </button>

              {/* Language Switcher Bar */}
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-[#64748B]">
                  <Globe className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>{isBangla ? 'ভাষা / Language' : 'Language'}</span>
                </span>
                <LanguageSwitcher />
              </div>
            </>
          )}
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

        {/* Top Header Bar */}
        {role === 'student' ? (
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] h-14 flex items-center justify-between px-4 sm:px-6 shadow-2xs gap-3">
            {/* Left: Mobile Drawer Button & Search Bar (Reference Image 1 Style) */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:bg-emerald-50 md:hidden cursor-pointer active:scale-95 transition shrink-0"
                title="Open Navigation"
                aria-label="মেনু খুলুন"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden md:flex p-1.5 rounded-lg text-slate-500 items-center justify-center shrink-0">
                <Menu className="w-4 h-4" />
              </div>

              {/* Search Bar with Quick Student Navigation Results */}
              <div ref={studentSearchRef} className="relative flex-1 max-w-md">
                <div className="flex items-center gap-2 bg-[#F1F5F9]/90 hover:bg-[#F1F5F9] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002F25]/20 border border-slate-200/80 rounded-full px-3.5 py-1.5 transition-all">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onFocus={() => setStudentSearchFocused(true)}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setStudentSearchFocused(true);
                    }}
                    placeholder={isBangla ? 'যেকোনো কিছু খুঁজুন (ক্লাস, সনদ, উপস্থিতি...)' : 'Search anything...'}
                    className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {studentSearchFocused && (
                  <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 max-h-72 overflow-y-auto">
                    {[
                      { href: '/student', labelBn: 'ড্যাশবোর্ড ওভারভিউ', labelEn: 'Dashboard Overview', icon: LayoutDashboard },
                      { href: '/student?tab=today', labelBn: 'আজকের ক্লাস ও মূল্যায়ন', labelEn: "Today's Schedule & Feedback", icon: Calendar },
                      { href: '/student?scan=true', labelBn: 'কিউআর দিয়ে উপস্থিতি', labelEn: 'Scan Attendance QR', icon: QrCode },
                      { href: '/student?tab=materials', labelBn: 'লেকচার শিট ও রিসোর্স হাব', labelEn: 'Lecture Notes & Hub', icon: BookOpen },
                      { href: '/student?tab=attendance', labelBn: 'উপস্থিতির হিস্ট্রি লগ', labelEn: 'Attendance Log', icon: CheckCircle2 },
                      { href: '/student?tab=help', labelBn: 'শিক্ষকের সমাধান ও উত্তর', labelEn: 'Teacher Help & Replies', icon: HelpCircle },
                      { href: '/student?tab=graduation', labelBn: 'সনদ ও গ্র্যাজুয়েশন ট্র্যাকার', labelEn: 'Graduation & Certificate', icon: Award },
                      { href: '/student?card=true', labelBn: 'ডিজিটাল আইডি কার্ড', labelEn: 'Digital Student ID Card', icon: CreditCard },
                      { href: '/announcements', labelBn: 'প্রাতিষ্ঠানিক নোটিশ বোর্ড', labelEn: 'Notice Board', icon: Megaphone },
                    ]
                      .filter((opt) => {
                        if (!studentSearchQuery.trim()) return true;
                        const q = studentSearchQuery.toLowerCase();
                        return opt.labelBn.toLowerCase().includes(q) || opt.labelEn.toLowerCase().includes(q);
                      })
                      .map((opt) => {
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.href}
                            type="button"
                            onClick={() => {
                              setStudentSearchFocused(false);
                              setStudentSearchQuery('');
                              if (opt.href === '/announcements' || pathname !== '/student') {
                                router.push(opt.href);
                              } else {
                                handleNavClick(opt.href);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                          >
                            <OptIcon className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                            <span className="font-medium truncate">
                              {isBangla ? opt.labelBn : opt.labelEn}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Language Switcher, Notification Bell & Student Profile Dropdown (Reference Image 1 Style) */}
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Student Profile Account Dropdown */}
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
                      {user?.full_name || 'Abdullah Student'}
                    </p>
                    <p className="text-[10.5px] font-medium text-[#64748B] truncate">
                      {isBangla ? 'শিক্ষার্থী' : 'Student'}
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
                    className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-[#0F172A] truncate font-serif">
                        {user?.full_name || 'Abdullah Student'}
                      </p>
                      <p className="text-[10.5px] font-mono text-[#0F766E] mt-0.5 truncate">
                        {user?.login_id || 'STD-2026-042-001'}
                      </p>
                    </div>

                    <div className="py-1">
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

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          if (pathname !== '/student') router.push('/student?tab=graduation');
                          else handleNavClick('/student?tab=graduation');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#002F25] transition-colors cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-[#0F766E]" />
                        <span>{isBangla ? 'সনদ ও গ্র্যাজুয়েশন ট্র্যাকার' : 'Certificate & Progress'}</span>
                      </button>

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

                    <div className="sm:hidden px-3.5 py-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isBangla ? 'ভাষা' : 'Language'}
                      </span>
                      <LanguageSwitcher />
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
        ) : (
          <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#E2E8F0] h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-2xs">
            {/* Left: Mobile Toggle & Page Context Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:bg-amber-100/70 md:hidden cursor-pointer active:scale-95 transition shrink-0"
                title="Open Navigation"
                aria-label="মেনু খুলুন"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Mobile Brand / Page Title */}
              <div className="flex sm:hidden items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-[#FCD34D] shrink-0 flex items-center justify-center shadow-2xs">
                  <Image
                    src="/logo.png"
                    alt="ASSDI Logo"
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-xs text-[#0F172A] truncate font-serif">
                  {activeItemLabel || (isBangla ? 'আস-সুন্নাহ স্কিল' : 'ASSDI')}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="font-bold text-[#0F172A] font-serif">{t('brand.name')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                <span className="font-bold text-[#0F766E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-md border border-[#CCFBF1]">
                  {activeItemLabel || t('brand.course')}
                </span>
              </div>
            </div>

            {/* Right: Academic Cohort, Live Status, Time & Switcher */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#E2E8F0] text-[#334155] text-xs font-semibold shadow-2xs">
                <span className="text-[#0F766E] font-bold">SBMC</span>
                <span className="text-slate-400">•</span>
                <span className="text-[#475569] font-medium">{isBangla ? 'ব্যাচ ০১' : 'Batch #1'}</span>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[#0369A1] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
                <span>{isBangla ? 'সিস্টেম সক্রিয়' : 'System Active'}</span>
              </div>

              <div className="hidden md:flex items-center gap-1.5 text-xs text-[#475569] font-medium">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
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
        )}

        {/* Notice Banner (e.g. Observer Read-Only Notice) */}
        {noticeBanner}

        {/* Main Body Content (Full width & flex-stretch single-screen fit on Student role) */}
        <main
          className={`flex-1 w-full relative z-10 ${
            role === 'student'
              ? 'flex flex-col px-4 sm:px-6 pt-3 pb-24 md:pb-3'
              : 'max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8'
          }`}
        >
          {children}
        </main>

        {/* Institutional Footer */}
        <footer
          className={`border-t border-slate-200/80 bg-white text-center text-slate-500 ${
            role === 'student'
              ? 'py-2 text-[11px] pb-20 md:pb-2'
              : 'py-4 text-xs pb-20 md:pb-4'
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
              onClick={() => handleNavClick(item.href)}
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

      {/* Super Admin Navigation Customizer Modal */}
      {role === 'super_admin' && (
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
