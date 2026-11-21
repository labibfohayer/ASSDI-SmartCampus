import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

export default function NotificationsScreen() {
  const { t, isBangla } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'notifications' | 'announcements'>('notifications');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, annRes] = await Promise.all([
        api.get('/notifications/').catch(() => ({ data: { results: [] } })),
        api.get('/announcements/').catch(() => ({ data: { results: [] } })),
      ]);

      setNotifications(notifRes.data.results || notifRes.data || []);
      setAnnouncements(annRes.data.results || annRes.data || []);
    } catch (err) {
      console.warn('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'help_reply':
        return <Ionicons name="checkmark-circle" size={20} color="#059669" />;
      case 'announcement':
        return <Ionicons name="megaphone" size={20} color="#0284C7" />;
      case 'attendance_alert':
        return <Ionicons name="alert-circle" size={20} color="#EA580C" />;
      default:
        return <Ionicons name="notifications" size={20} color={colors.primary} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.notifications.title}</Text>
        {viewTab === 'notifications' && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>{t.notifications.markAllRead}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setViewTab('notifications')}
          style={[styles.tab, viewTab === 'notifications' && styles.tabActive]}
        >
          <Text style={[styles.tabText, viewTab === 'notifications' && styles.tabTextActive]}>
            {isBangla ? 'বিজ্ঞপ্তি' : 'Alerts'} ({notifications.filter(n => !n.is_read).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewTab('announcements')}
          style={[styles.tab, viewTab === 'announcements' && styles.tabActive]}
        >
          <Text style={[styles.tabText, viewTab === 'announcements' && styles.tabTextActive]}>
            {isBangla ? 'নোটিশ বোর্ড' : 'Notices'} ({announcements.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            colors={[colors.primary]}
          />
        }
      >
        {viewTab === 'notifications' ? (
          notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{t.notifications.empty}</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleMarkAsRead(item.id)}
                style={[
                  styles.notifCard,
                  !item.is_read && styles.notifCardUnread,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.notifIconWrapper}>
                  {getNotificationIcon(item.notification_type)}
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifHeaderRow}>
                    <Text
                      style={[
                        styles.notifTitle,
                        !item.is_read && { fontWeight: '900', color: '#0F172A' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifBody}>{item.body}</Text>
                  <Text style={styles.notifDate}>
                    {new Date(item.created_at).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          announcements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="megaphone-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {isBangla ? 'কোনো নোটিশ পাওয়া যায়নি।' : 'No announcements.'}
              </Text>
            </View>
          ) : (
            announcements.map((ann) => (
              <View key={ann.id} style={styles.announcementCard}>
                <View style={styles.annHeader}>
                  <View style={styles.scopeBadge}>
                    <Text style={styles.scopeBadgeText}>
                      {ann.scope === 'Global'
                        ? (isBangla ? 'সার্বজনীন নোটিশ' : 'Global')
                        : ann.scope === 'Course'
                        ? (isBangla ? 'কোর্স নোটিশ' : 'Course')
                        : (isBangla ? 'ব্যাচ নোটিশ' : 'Batch')}
                    </Text>
                  </View>
                  <Text style={styles.annDate}>
                    {new Date(ann.published_at).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={styles.annTitle}>{ann.title}</Text>
                <Text style={styles.annBody}>{ann.content}</Text>
                <Text style={styles.annAuthor}>
                  {isBangla ? 'প্রচারক:' : 'Published by:'} {ann.author_name}
                </Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    backgroundColor: colors.white,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 12,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  notifIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  notifDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scopeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  annDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  annTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  annBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  annAuthor: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
