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

export default function ProgressScreen() {
  const { t, isBangla } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'help'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progRes, attRes, helpRes] = await Promise.all([
        api.get('/students/me/progress/').catch(() => ({ data: null })),
        api.get('/attendance/mine/').catch(() => ({ data: { records: [] } })),
        api.get('/help-requests/mine/').catch(() => ({ data: [] })),
      ]);

      setProgressData(progRes?.data);
      setAttendanceRecords(attRes?.data?.records || []);
      setHelpRequests(helpRes?.data || []);
    } catch (err) {
      console.warn('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const attendancePercentage = progressData?.attendance_percentage || 0;
  const avgUnderstanding = progressData?.average_understanding_percentage || 0;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.progress.title}</Text>
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
        {/* KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          {/* Attendance KPI */}
          <View style={[styles.kpiCard, { borderColor: '#A7F3D0' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>{t.progress.attendanceRate}</Text>
              <View style={[styles.kpiIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-done" size={16} color="#059669" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>
              {attendancePercentage}%
            </Text>
            <Text style={styles.kpiSubtext}>
              {t.progress.classesAttended}: {progressData?.present_sessions_count || 0} / {progressData?.total_sessions_count || 0}
            </Text>
          </View>

          {/* Understanding KPI */}
          <View style={[styles.kpiCard, { borderColor: '#BAE6FD' }]}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>{t.progress.avgUnderstanding}</Text>
              <View style={[styles.kpiIcon, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="star" size={16} color="#0284C7" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#0284C7' }]}>
              {avgUnderstanding}%
            </Text>
            <Text style={styles.kpiSubtext}>
              {isBangla ? 'গড় রেটিং:' : 'Avg Rating:'} {((avgUnderstanding / 100) * 5).toFixed(1)} / 5.0
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={[styles.subTab, activeTab === 'overview' && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, activeTab === 'overview' && styles.subTabTextActive]}>
              {t.progress.attendanceHistory}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('help')}
            style={[styles.subTab, activeTab === 'help' && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, activeTab === 'help' && styles.subTabTextActive]}>
              {t.progress.teacherReplies} ({helpRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Attendance History */}
        {activeTab === 'overview' && (
          <View style={styles.sectionCard}>
            {attendanceRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {isBangla ? 'কোনো পূর্ববর্তী হাজিরা রেকর্ড পাওয়া যায়নি।' : 'No attendance history yet.'}
                </Text>
              </View>
            ) : (
              attendanceRecords.slice(0, 10).map((record, idx) => (
                <View key={idx} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historySubject}>
                      {record.session?.subject_name || 'Class Session'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {record.session?.session_date} • {record.method || 'QR Scan'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      record.status === 'present'
                        ? styles.pillPresent
                        : record.status === 'late'
                        ? styles.pillLate
                        : styles.pillAbsent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        record.status === 'present'
                          ? { color: '#059669' }
                          : record.status === 'late'
                          ? { color: '#D97706' }
                          : { color: '#DC2626' },
                      ]}
                    >
                      {record.status === 'present'
                        ? t.today.present
                        : record.status === 'late'
                        ? t.today.late
                        : t.today.absent}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Help Requests & Teacher Replies */}
        {activeTab === 'help' && (
          <View style={styles.sectionCard}>
            {helpRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubbles-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {isBangla ? 'কোনো হেল্প রিকোয়েস্ট জমা দেওয়া হয়নি।' : 'No help requests submitted yet.'}
                </Text>
              </View>
            ) : (
              helpRequests.map((req) => (
                <View key={req.id} style={styles.helpCard}>
                  <View style={styles.helpHeader}>
                    <Text style={styles.helpTopic}>{req.topic?.title || 'Topic'}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        req.status === 'resolved'
                          ? styles.pillPresent
                          : styles.pillLate,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          req.status === 'resolved'
                            ? { color: '#059669' }
                            : { color: '#D97706' },
                        ]}
                      >
                        {req.status === 'resolved' ? t.progress.resolved : t.progress.pending}
                      </Text>
                    </View>
                  </View>

                  {/* Student Question */}
                  <View style={styles.studentMessageBox}>
                    <Text style={styles.msgLabel}>{isBangla ? 'আমার প্রশ্ন:' : 'My Query:'}</Text>
                    <Text style={styles.msgBody}>
                      {req.student_message || (isBangla ? 'টপিকটি পুনরায় বুঝতে চাই।' : 'Need further clarification.')}
                    </Text>
                  </View>

                  {/* Teacher Answer if any */}
                  {req.teacher_note ? (
                    <View style={styles.teacherAnswerBox}>
                      <View style={styles.teacherLabelRow}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                        <Text style={styles.teacherLabel}>
                          {isBangla ? 'শিক্ষকের সমাধান ও নোট:' : 'Teacher Reply:'}
                        </Text>
                      </View>
                      <Text style={styles.teacherAnswerBody}>{req.teacher_note}</Text>
                    </View>
                  ) : (
                    <Text style={styles.waitingText}>
                      {isBangla
                        ? '⏳ শিক্ষক খুব শীঘ্রই আপনার প্রশ্নটি দেখে সমাধান নোট প্রদান করবেন।'
                        : '⏳ Teacher has not replied yet. They will review it soon.'}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  kpiSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyInfo: {
    flex: 1,
    paddingRight: 10,
  },
  historySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pillLate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pillAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  helpCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 14,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpTopic: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    paddingRight: 8,
  },
  studentMessageBox: {
    backgroundColor: '#F8FAF9',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  msgLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  msgBody: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
  },
  teacherAnswerBox: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  teacherLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  teacherLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  teacherAnswerBody: {
    fontSize: 12,
    color: '#064E3B',
    lineHeight: 18,
    fontWeight: '600',
  },
  waitingText: {
    fontSize: 11,
    color: '#D97706',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
