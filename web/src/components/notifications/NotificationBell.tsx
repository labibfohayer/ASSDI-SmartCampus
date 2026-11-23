'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  HelpCircle,
  Megaphone,
  Calendar,
  AlertCircle,
  Check,
  CheckCheck,
  ExternalLink,
  X,
  Trash2,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  notification_type: string;
  data_payload: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const { isBangla } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(-1);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/api/v1/notifications/unread-count/');
      const count = Number(res.data?.unread_count) || 0;
      
      // If unread count increased while on dashboard, trigger toast alert
      if (prevCountRef.current !== -1 && count > prevCountRef.current && count > 0) {
        toast(
          isBangla
            ? `🔔 আপনার ${count}টি নতুন নোটিফিকেশন এসেছে!`
            : `🔔 You have ${count} new notification(s)!`,
          {
            id: 'new-notification-toast',
            duration: 4000,
            icon: '🔔',
            style: {
              background: '#0F766E',
              color: '#FFFFFF',
              border: '1px solid #14B8A6',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '12px',
            },
          }
        );
      }
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch {
      // Ignore background poll errors silently
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/notifications/');
      const items = res.data?.results || res.data || [];
      setNotifications(items.slice(0, 30));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // 10-second real-time poll for immediate alerts
    const interval = setInterval(fetchUnreadCount, 10000);

    const handleFocus = () => {
      fetchUnreadCount();
      if (isOpen) fetchNotifications();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('notification-refresh', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notification-refresh', handleFocus);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationDestination = (item: NotificationItem): string => {
    const payload = item.data_payload || {};
    const type = (item.notification_type || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();

    // 1. Explicit action_url in payload
    if (payload.action_url && typeof payload.action_url === 'string') {
      return payload.action_url;
    }

    // 2. Help Request or Reply
    if (
      type === 'help_request' ||
      type === 'help_reply' ||
      payload.help_request_id ||
      title.includes('হেল্প') ||
      title.includes('সমাধান') ||
      title.includes('help') ||
      body.includes('হেল্প') ||
      body.includes('প্রশ্নের উত্তর')
    ) {
      if (user?.role === 'teacher') {
        const q = payload.help_request_id ? `?highlight=${payload.help_request_id}` : '';
        return `/teacher/help-requests${q}`;
      }
      return '/student?tab=help';
    }

    // 3. Announcements / Institutional Notices
    if (
      type === 'announcement' ||
      payload.announcement_id ||
      title.includes('বিজ্ঞপ্তি') ||
      title.includes('নোটিস') ||
      title.includes('নোটিশ') ||
      title.includes('announcement') ||
      title.includes('notice') ||
      body.includes('বিজ্ঞপ্তি') ||
      body.includes('নোটিস') ||
      body.includes('অবগতির জন্য জানানো')
    ) {
      return '/announcements';
    }

    // 4. Attendance Alert / Consecutive Absence
    if (
      type === 'attendance_alert' ||
      title.includes('অনুপস্থিতি') ||
      title.includes('সতর্কতা') ||
      title.includes('absence')
    ) {
      if (user?.role === 'super_admin' || user?.role === 'coordinator' || user?.role === 'observer') {
        return '/coordinator/at-risk';
      }
      if (user?.role === 'teacher') {
        return '/teacher/attendance';
      }
      return '/student?tab=attendance';
    }

    // 5. Class Reminder / Attendance Session
    if (
      type === 'class_reminder' ||
      payload.session_id ||
      title.includes('ক্লাস') ||
      title.includes('সেশন') ||
      title.includes('session')
    ) {
      if (user?.role === 'teacher') {
        const q = payload.session_id ? `?session=${payload.session_id}` : '';
        return `/teacher/attendance${q}`;
      }
      if (user?.role === 'student') {
        return '/student?tab=today';
      }
      return '/coordinator';
    }

    // 6. Materials / Lecture Sheet
    if (title.includes('লেকচার') || title.includes('হ্যান্ডআউট') || title.includes('material')) {
      return '/student?tab=materials';
    }

    // 7. Certificate / Graduation
    if (title.includes('সনদ') || title.includes('সার্টিফিকেট') || title.includes('certificate')) {
      return '/student?tab=graduation';
    }

    // Fallback based on role
    if (user?.role === 'super_admin') return '/admin';
    if (user?.role === 'teacher') return '/teacher';
    if (user?.role === 'coordinator' || user?.role === 'observer') return '/coordinator';
    return '/student';
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    try {
      if (!item.is_read) {
        api.post(`/api/v1/notifications/${item.id}/mark-read/`).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      setIsOpen(false);
      const destination = getNotificationDestination(item);

      if (typeof window !== 'undefined') {
        if (destination.startsWith('/student') && window.location.pathname === '/student') {
          const url = new URL(destination, window.location.origin);
          const tab = url.searchParams.get('tab') || 'today';
          window.history.pushState(null, '', destination);
          window.dispatchEvent(new CustomEvent('assdi-tab-navigate', { detail: { href: destination } }));
          window.dispatchEvent(new CustomEvent('student-tab-change', { detail: tab }));
          return;
        }
      }

      router.push(destination);
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const handleMarkAsRead = async (id: number, payload?: Record<string, any>, navigate: boolean = true) => {
    try {
      await api.post(`/api/v1/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      if (navigate) {
        const item = notifications.find((n) => n.id === id);
        if (item) {
          handleNotificationClick(item);
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/v1/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success(
        isBangla ? 'সব নোটিফিকেশন পড়া হিসেবে চিহ্নিত হয়েছে।' : 'Marked all as read.'
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/v1/notifications/${id}/delete/`);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      toast.success(isBangla ? 'নোটিফিকেশন মুছে ফেলা হয়েছে' : 'Notification removed');
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      await api.post('/api/v1/notifications/clear-all-read/');
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      toast.success(isBangla ? 'পঠিত নোটিফিকেশন পরিষ্কার করা হয়েছে' : 'Cleared read notifications');
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const getTypeMetadata = (type: string) => {
    switch (type) {
      case 'help_request':
        return {
          icon: <HelpCircle className="w-4 h-4 text-amber-600" />,
          labelBn: 'সহায়তা রিকোয়েস্ট',
          labelEn: 'Help Request',
          bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'help_reply':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          labelBn: 'সমাধান সম্পন্ন',
          labelEn: 'Resolved',
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'announcement':
        return {
          icon: <Megaphone className="w-4 h-4 text-blue-600" />,
          labelBn: 'প্রাতিষ্ঠানিক নোটিশ',
          labelEn: 'Announcement',
          bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'class_reminder':
        return {
          icon: <Calendar className="w-4 h-4 text-indigo-600" />,
          labelBn: 'ক্লাস রিমাইন্ডার',
          labelEn: 'Class Reminder',
          bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'attendance_alert':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
          labelBn: 'উপস্থিতি সতর্কতা',
          labelEn: 'Attendance Alert',
          bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-slate-500" />,
          labelBn: 'সিস্টেম বার্তা',
          labelEn: 'System Alert',
          bgColor: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return isBangla ? 'এইমাত্র' : 'Just now';
      if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        return isBangla ? `${mins} মিনিট আগে` : `${mins}m ago`;
      }
      if (diff < 86400) {
        const hrs = Math.floor(diff / 3600);
        return isBangla ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
      }
      const days = Math.floor(diff / 86400);
      return isBangla ? `${days} দিন আগে` : `${days}d ago`;
    } catch {
      return '';
    }
  };

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Interactive Bell Button with Pulsating Red Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#FFFBEB] text-[#0F766E] border border-[#FCD34D] shadow-xs'
            : 'text-slate-600 hover:text-[#0F766E] hover:bg-[#FFFBEB]'
        }`}
        title={isBangla ? 'বিজ্ঞপ্তি ও নোটিফিকেশন সেন্টার' : 'Notifications Center'}
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'text-[#0F766E]' : ''}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10.5px] font-black text-white bg-rose-600 rounded-full border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Window */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[410px] bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Bar */}
          <div className="p-3.5 bg-[#FFFBEB] border-b border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/90 border border-[#FCD34D] flex items-center justify-center text-[#0F766E]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-[#0F172A] leading-tight font-serif">
                  {isBangla ? 'রিয়েল-টাইম নোটিফিকেশন' : 'Live Notification Center'}
                </h3>
                <p className="text-[10px] text-[#78350F]">
                  {unreadCount > 0
                    ? (isBangla ? `${unreadCount}টি নতুন অপঠিত বিজ্ঞপ্তি` : `${unreadCount} unread alert(s)`)
                    : (isBangla ? 'সব নোটিফিকেশন হালনাগাদ' : 'All caught up')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title={isBangla ? 'সবগুলো পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3 h-3 text-[#C1982E]" />
                  <span>{isBangla ? 'সব পঠিত' : 'Mark all'}</span>
                </button>
              )}
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-lg text-[#78350F] hover:text-[#0F172A] hover:bg-black/5 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Sub-header */}
          <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-[#0F766E] shadow-2xs border border-[#FCD34D]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isBangla ? 'সবগুলো' : 'All'} ({notifications.length})
              </button>

              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white text-[#0F766E] shadow-2xs border border-[#FCD34D]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isBangla ? 'অপঠিত' : 'Unread'} ({unreadCount})
              </button>
            </div>

            {notifications.some((n) => n.is_read) && (
              <button
                onClick={handleClearRead}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition"
                title={isBangla ? 'পঠিত নোটিফিকেশন তালিকা থেকে সরান' : 'Clear read notifications'}
              >
                <Trash2 className="w-3 h-3" />
                <span>{isBangla ? 'পঠিত সাফ করুন' : 'Clear read'}</span>
              </button>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mb-2" />
                <span>{isBangla ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {filter === 'unread'
                    ? (isBangla ? 'কোনো অপঠিত নোটিফিকেশন নেই' : 'No unread notifications')
                    : (isBangla ? 'নোটিফিকেশন তালিকা ফাঁকা' : 'No notifications yet')}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isBangla ? 'ক্লাস, হেল্প রিকোয়েস্ট ও গুরুত্বপূর্ণ সব আপডেট এখানে আসবে' : 'All activity and help request alerts will appear here'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const meta = getTypeMetadata(item.notification_type);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left group relative ${
                      item.is_read
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-[#FFFBEB] hover:bg-[#FEF3C7]/60 border-l-4 border-[#B45309]'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {meta.icon}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${meta.bgColor}`}>
                          {isBangla ? meta.labelBn : meta.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <p
                        className={`text-xs mt-1 leading-snug line-clamp-1 ${
                          item.is_read ? 'font-semibold text-[#0F172A]' : 'font-extrabold text-[#B45309]'
                        }`}
                      >
                        {item.title}
                      </p>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    {/* Right Hover Actions (Quick Mark Read & Delete) */}
                    <div className="absolute right-3 top-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id, undefined, false);
                          }}
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition shadow-2xs"
                          title={isBangla ? 'পঠিত হিসেবে মার্ক করুন' : 'Mark as read'}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(e, item.id)}
                        className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition shadow-2xs"
                        title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2 absolute right-3.5 top-3.5 group-hover:hidden" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <Link
              href="/announcements"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-[#0F766E] hover:text-[#115E59] hover:underline inline-flex items-center gap-1"
            >
              <span>{isBangla ? 'সকল নোটিশ ও ঘোষণা দেখুন' : 'View all announcements'}</span>
              <ExternalLink className="w-3 h-3 text-[#C5A059]" />
            </Link>

            <span className="text-[10px] text-slate-400 font-mono">
              ASSDI Alert Hub
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
