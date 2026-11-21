import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';
import FeedbackModal from './FeedbackModal';
import QRScannerModal from './QRScannerModal';

interface ClassSessionItem {
  id: number;
  batch_name?: string;
  course_name?: string;
  subject_name?: string;
  topic_title?: string;
  teacher_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  attendance_status?: 'present' | 'late' | 'absent' | null;
  feedback_submitted?: boolean;
}

export default function HomeScreen() {
  const { user, profile, logout } = useAuth();
  const { t, isBangla, toggleLanguage } = useLanguage();

  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<ClassSessionItem | null>(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<ClassSessionItem | null>(null);

  const fetchTodaySessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/class-sessions/today/');
      const items = res.data.results || res.data || [];
      setSessions(items);
    } catch (err) {
      console.warn('Failed to load today sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySessions();
  }, []);

  const handleLogout = () => {
    Alert.alert(isBangla ? 'লগআউট' : 'Logout', t.login.logoutConfirm, [
      { text: isBangla ? 'বাতিল' : 'Cancel', style: 'cancel' },
      { text: isBangla ? 'হ্যাঁ, লগআউট' : 'Yes, Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const getAttendanceBadge = (status?: string | null) => {
    if (!status) {
      return (
        <View style={[styles.badge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
          <Ionicons name="time-outline" size={12} color="#64748B" />
          <Text style={[styles.badgeText, { color: '#64748B' }]}>{t.today.notMarked}</Text>
        </View>
      );
    }
    const s = status.toLowerCase();
    if (s === 'present') {
      return (
        <View style={[styles.badge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#059669" />
          <Text style={[styles.badgeText, { color: '#059669' }]}>{t.today.present}</Text>
        </View>
      );
    }
    if (s === 'late') {
      return (
        <View style={[styles.badge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="alert-circle" size={12} color="#D97706" />
          <Text style={[styles.badgeText, { color: '#D97706' }]}>{t.today.late}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
        <Ionicons name="close-circle" size={12} color="#DC2626" />
        <Text style={[styles.badgeText, { color: '#DC2626' }]}>{t.today.absent}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Card */}
      <View style={styles.topHeader}>
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || 'S'}
            </Text>
          </View>
          <View style={styles.userTextCol}>
            <Text style={styles.greetingText}>
              {isBangla ? 'আস-সালামু আলাইকুম' : 'Assalamu Alaikum'},
            </Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {user?.full_name || 'Student'}
            </Text>
            <Text style={styles.userMetaText}>
              {profile?.active_batch_name || user?.login_id}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn} activeOpacity={0.8}>
              <Text style={styles.langBtnText}>{isBangla ? 'EN' : 'বাংলা'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchTodaySessions}
            colors={[colors.primary]}
          />
        }
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.today.title}</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Sessions List */}
        {sessions.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{t.today.noClasses}</Text>
            <Text style={styles.emptySubtitle}>
              {isBangla
                ? 'আজকে কোনো ক্লাসের শিডিউল নেই। পরবর্তী ক্লাসের জন্য প্রস্তুত থাকুন।'
                : 'No scheduled classes today. Enjoy your self-study time.'}
            </Text>
          </View>
        ) : (
          sessions.map((item) => (
            <View key={item.id} style={styles.sessionCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time" size={13} color={colors.primary} />
                  <Text style={styles.timeBadgeText}>
                    {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                  </Text>
                </View>
                {getAttendanceBadge(item.attendance_status)}
              </View>

              {/* Subject & Topic */}
              <Text style={styles.subjectText}>{item.subject_name || 'Subject'}</Text>
              <Text style={styles.topicText}>
                {item.topic_title || (isBangla ? 'আজকের আলোচ্য বিষয়' : 'Today Topic')}
              </Text>

              {/* Meta details */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={14} color="#64748B" />
                  <Text style={styles.metaText}>{item.teacher_name || 'Teacher'}</Text>
                </View>

                {item.room && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text style={styles.metaText}>{t.today.room}: {item.room}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                {/* QR Scanner button */}
                <TouchableOpacity
                  onPress={() => setSelectedSessionForQR(item)}
                  style={styles.qrButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
                  <Text style={styles.qrButtonText}>{t.today.scanQR}</Text>
                </TouchableOpacity>

                {/* 10s Feedback Button */}
                <TouchableOpacity
                  onPress={() => setSelectedSessionForFeedback(item)}
                  disabled={item.feedback_submitted}
                  style={[
                    styles.feedbackButton,
                    item.feedback_submitted && styles.feedbackButtonDone,
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.feedback_submitted ? 'checkmark-circle' : 'star'}
                    size={16}
                    color={item.feedback_submitted ? '#059669' : colors.white}
                  />
                  <Text
                    style={[
                      styles.feedbackButtonText,
                      item.feedback_submitted && styles.feedbackButtonTextDone,
                    ]}
                  >
                    {item.feedback_submitted
                      ? t.today.feedbackGiven
                      : t.today.giveFeedback}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <FeedbackModal
        visible={!!selectedSessionForFeedback}
        session={selectedSessionForFeedback}
        onClose={() => setSelectedSessionForFeedback(null)}
        onSuccess={fetchTodaySessions}
      />

      <QRScannerModal
        visible={!!selectedSessionForQR}
        session={selectedSessionForQR}
        onClose={() => setSelectedSessionForQR(null)}
        onSuccess={fetchTodaySessions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topHeader: {
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  userTextCol: {
    flex: 1,
  },
  greetingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userMetaText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  logoutBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  sessionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  topicText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FAFAF9',
  },
  qrButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  feedbackButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  feedbackButtonDone: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  feedbackButtonTextDone: {
    color: '#059669',
  },
});
