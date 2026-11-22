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
  ExternalLink,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/api/v1/notifications/unread-count/');
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Ignore background poll errors silently
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/notifications/');
      const items = res.data.results || res.data || [];
      setNotifications(items.slice(0, 15));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

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

  const handleMarkAsRead = async (id: number, payload?: Record<string, any>) => {
    try {
      await api.post(`/api/v1/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      // Optional smart navigation based on notification payload
      if (payload) {
        if (payload.help_request_id) {
          router.push('/student?tab=help');
        } else if (payload.announcement_id) {
          router.push('/announcements');
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
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'help_request':
        return <HelpCircle className="w-4 h-4 text-amber-600" />;
      case 'help_reply':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-blue-600" />;
      case 'class_reminder':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'attendance_alert':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        title={isBangla ? 'বিজ্ঞপ্তি' : 'Notifications'}
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                {isBangla ? 'বিজ্ঞপ্তি ও নোটিফিকেশন' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  {unreadCount} {isBangla ? 'নতুন' : 'new'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#1B4D3E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>{isBangla ? 'সব পঠিত' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {isBangla ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  {isBangla ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No notifications'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isBangla ? 'সব নোটিফিকেশন আপডেট এখানে দেখা যাবে' : 'All updates will appear here'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id, item.data_payload)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                    item.is_read
                      ? 'bg-white hover:bg-slate-50/70'
                      : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(item.notification_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs leading-snug line-clamp-1 ${
                          item.is_read ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
            <Link
              href="/announcements"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#1B4D3E] hover:underline inline-flex items-center gap-1.5"
            >
              <span>{isBangla ? 'সকল নোটিশ ও ঘোষণা দেখুন' : 'View all announcements'}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
