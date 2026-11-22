'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Save,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  ShieldCheck,
  Users,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCertificateModal, GraduationData } from '@/components/student/GraduationCertificateModal';

interface StudentRosterItem {
  student_id: number;
  student_id_number: string;
  full_name: string;
  status: 'present' | 'late' | 'absent' | 'approved_leave' | 'unmarked';
  original_status: string;
  method?: string;
  reason?: string;
}

interface SessionInfo {
  id: number;
  subject_name?: string;
  topic_title?: string;
  batch: number;
  batch_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  audience: string;
}

export default function ManualAttendancePage() {
  const searchParams = useSearchParams();
  const preselectedSession = searchParams.get('sessionId');
  const { t, d, isBangla } = useLanguage();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    preselectedSession ? Number(preselectedSession) : null
  );

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [selectedStudentForGraduation, setSelectedStudentForGraduation] = useState<GraduationData | null>(null);
  const [loadingGraduationId, setLoadingGraduationId] = useState<number | null>(null);

  const handleOpenGraduation = async (studentId: number) => {
    setLoadingGraduationId(studentId);
    try {
      const res = await api.get(`/api/v1/students/${studentId}/graduation-eligibility/`);
      setSelectedStudentForGraduation(res.data);
    } catch (err: any) {
      toast.error(isBangla ? 'গ্র্যাজুয়েশন তথ্য লোড করা যায়নি।' : 'Failed to load graduation info.');
    } finally {
      setLoadingGraduationId(null);
    }
  };

  // 1. Fetch Teacher's Sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/api/v1/class-sessions/?status=published');
        let list: SessionInfo[] = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (res.data?.results) list = res.data.results;
        else if (res.data?.data) list = res.data.data;

        setSessions(list);
        if (!selectedSessionId && list.length > 0) {
          setSelectedSessionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    fetchSessions();
  }, []);

  // 2. Fetch Attendance Records for selected session
  const fetchAttendanceRoster = async () => {
    if (!selectedSessionId) return;
    setLoading(true);

    try {
      const res = await api.get(`/api/v1/class-sessions/${selectedSessionId}/attendance/`);
      const records = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.data || [];

      // Transform records into interactive roster items
      const items: StudentRosterItem[] = records.map((r: any) => ({
        student_id: r.student?.id || r.student_id || r.student,
        student_id_number: r.student?.student_id_number || r.student_id_number || `STD-${r.student}`,
        full_name: r.student?.full_name || r.student_name || 'Student',
        status: r.status || 'unmarked',
        original_status: r.status || 'unmarked',
        method: r.method,
        reason: r.reason || '',
      }));

      setRoster(items);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      toast.error(isBangla ? 'হাজিরা রেকর্ড লোড করা যায়নি' : 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendanceRoster();
    }
  }, [selectedSessionId]);

  // Update single student status
  const setStudentStatus = (studentId: number, newStatus: 'present' | 'late' | 'absent' | 'approved_leave') => {
    setRoster((prev) =>
      prev.map((item) =>
        item.student_id === studentId ? { ...item, status: newStatus } : item
      )
    );
  };

  // Update reason for correction
  const setStudentReason = (studentId: number, reason: string) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.student_id === studentId ? { ...item, reason } : item
      )
    );
  };

  // Bulk Save Manual Attendance Changes
  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;

    // Filter only changed items
    const changed = roster.filter((r) => r.status !== r.original_status || r.reason);
    if (changed.length === 0) {
      toast(isBangla ? 'কোনো পরিবর্তন করা হয়নি' : 'No changes to save', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: changed.map((item) => ({
          student_id: item.student_id,
          status: item.status,
          reason: item.reason || (isBangla ? 'শিক্ষক কর্তৃক ম্যানুয়াল সংশোধন' : 'Manual teacher correction'),
        })),
        updates: changed.map((item) => ({
          student_id: item.student_id,
          status: item.status,
          reason: item.reason || (isBangla ? 'শিক্ষক কর্তৃক ম্যানুয়াল সংশোধন' : 'Manual teacher correction'),
        })),
      };

      await api.post(`/api/v1/class-sessions/${selectedSessionId}/attendance/manual/?force=true`, payload);
      toast.success(isBangla ? 'হাজিরা সফলভাবে সংরক্ষিত হয়েছে!' : 'Attendance updated successfully!');
      fetchAttendanceRoster();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to save attendance';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Finalize attendance (mark unscanned students as auto_absent)
  const handleFinalizeAttendance = async () => {
    if (!selectedSessionId) return;

    if (
      !confirm(
        isBangla
          ? 'আপনি কি নিশ্চিত যে এই সেশনের হাজিরা ফাইনাল করতে চান? অবশিষ্ট অনিবন্ধিত শিক্ষার্থীদের স্বয়ংক্রিয়ভাবে অনুপস্থিত মার্ক করা হবে।'
          : 'Finalize attendance? Any unscanned students will be automatically marked absent.'
      )
    ) {
      return;
    }

    setFinalizing(true);
    try {
      await api.post(`/api/v1/class-sessions/${selectedSessionId}/attendance/finalize/`);
      toast.success(isBangla ? 'হাজিরা ফাইনাল করা হয়েছে!' : 'Attendance finalized successfully!');
      fetchAttendanceRoster();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to finalize attendance';
      toast.error(msg);
    } finally {
      setFinalizing(false);
    }
  };

  // Attendance metrics calculation
  const presentCount = roster.filter((r) => r.status === 'present').length;
  const lateCount = roster.filter((r) => r.status === 'late').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const leaveCount = roster.filter((r) => r.status === 'approved_leave').length;
  const totalEnrolled = roster.length;
  const effectiveDenominator = totalEnrolled - leaveCount;
  const attendancePercentage =
    effectiveDenominator > 0
      ? (((presentCount + lateCount) / effectiveDenominator) * 100).toFixed(1)
      : '0.0';

  const filteredRoster = roster.filter(
    (item) =>
      item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student_id_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6">
      {/* Top Header & Session Selector */}
      <div className="bg-[#0F766E] p-6 sm:p-7 rounded-2xl border border-[#0D9488] text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(#14B8A6_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-white mb-2.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#C1982E]" />
            <span>{isBangla ? 'হাজিরা কারেকশন উইন্ডো (৪৮ ঘণ্টা)' : '48h Correction Window'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading">
            {isBangla ? 'ম্যানুয়াল হাজিরা ও সংশোধন শীট' : 'Manual Attendance & Correction'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-50 mt-1 max-w-xl">
            {isBangla
              ? 'ক্লাস চলাকালীন কিউআর স্ক্যান না করা শিক্ষার্থীদের ম্যানুয়াল হাজিরা দিন অথবা ৪৮ ঘণ্টার মধ্যে সংশোধন করুন।'
              : 'Manually mark or correct attendance within the 48-hour post-session window.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-[#0D9488] border border-teal-500/30 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#C1982E]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.subject_name || `Session #${s.id}`} - {d(s.session_date)} ({d(s.start_time.slice(0, 5))})
              </option>
            ))}
          </select>

          <button
            onClick={handleFinalizeAttendance}
            disabled={finalizing || loading}
            className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isBangla ? 'হাজিরা ফাইনাল' : 'Finalize Roster'}</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading}
            className="px-4 py-2.5 bg-[#C1982E] hover:bg-[#A88224] text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save className="w-3.5 h-3.5 text-white" />
            <span>{saving ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'সংরক্ষণ করুন' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* Attendance Bento Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs text-center">
          <p className="text-[11px] text-[#475569] font-bold uppercase tracking-wider">{isBangla ? 'মোট শিক্ষার্থী' : 'Enrolled'}</p>
          <h3 className="text-xl font-extrabold text-[#0F172A] font-heading mt-1">{d(totalEnrolled)}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] border-t-2 border-t-[#16A34A] shadow-xs text-center">
          <p className="text-[11px] text-[#16A34A] font-bold uppercase tracking-wider">{isBangla ? 'উপস্থিত' : 'Present'}</p>
          <h3 className="text-xl font-extrabold text-[#16A34A] font-heading mt-1">{d(presentCount)}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] border-t-2 border-t-[#D97706] shadow-xs text-center">
          <p className="text-[11px] text-[#D97706] font-bold uppercase tracking-wider">{isBangla ? 'দেরিতে উপস্থিত' : 'Late'}</p>
          <h3 className="text-xl font-extrabold text-[#D97706] font-heading mt-1">{d(lateCount)}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] border-t-2 border-t-[#DC2626] shadow-xs text-center">
          <p className="text-[11px] text-[#DC2626] font-bold uppercase tracking-wider">{isBangla ? 'অনুপস্থিত' : 'Absent'}</p>
          <h3 className="text-xl font-extrabold text-[#DC2626] font-heading mt-1">{d(absentCount)}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] border-t-2 border-t-[#016C90] shadow-xs text-center">
          <p className="text-[11px] text-[#016C90] font-bold uppercase tracking-wider">{isBangla ? 'ছুটি মঞ্জুর' : 'Leave'}</p>
          <h3 className="text-xl font-extrabold text-[#016C90] font-heading mt-1">{d(leaveCount)}</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] border-t-2 border-t-[#0F766E] shadow-xs text-center">
          <p className="text-[11px] text-[#0F766E] font-bold uppercase tracking-wider">{isBangla ? 'উপস্থিতির হার' : 'Attendance'}</p>
          <h3 className="text-xl font-extrabold text-[#0F766E] font-heading mt-1">{d(attendancePercentage)}%</h3>
        </div>
      </div>

      {/* Student Roster Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন...' : 'Search by name or ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="text-xs text-[#475569] font-medium">
            {isBangla ? 'প্রদর্শিত শিক্ষার্থী:' : 'Showing Students:'} <span className="font-bold text-[#0F172A]">{d(filteredRoster.length)}</span>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#475569]">{t('common.loading')}</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="py-16 text-center text-[#475569] text-xs">
            {isBangla ? 'কোনো শিক্ষার্থী পাওয়া যায়নি।' : 'No student attendance records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">{isBangla ? 'রোল / আইডি' : 'Student ID'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'শিক্ষার্থীর নাম' : 'Student Name'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'হাজিরার মাধ্যম' : 'Method'}</th>
                  <th className="py-3.5 px-4 text-center">{isBangla ? 'হাজিরা স্ট্যাটাস' : 'Attendance Status'}</th>
                  <th className="py-3.5 px-4">{isBangla ? 'মন্তব্য / কারণ' : 'Reason / Note'}</th>
                  <th className="py-3.5 px-4 text-center">{isBangla ? 'সনদ ও যোগ্যতা' : 'Graduation & Cert'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRoster.map((item, idx) => (
                  <tr key={item.student_id} className="hover:bg-[#F0FDFA] transition">
                    <td className="py-3 px-4 font-mono text-[#94A3B8]">{d(idx + 1)}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A] font-mono">
                      {item.student_id_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A] font-heading">
                      {item.full_name}
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] uppercase font-bold text-[#475569]">
                        {item.method || 'manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(item.student_id, 'present')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            item.status === 'present'
                              ? 'bg-[#16A34A] text-white shadow-xs'
                              : 'bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]'
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(item.student_id, 'late')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            item.status === 'late'
                              ? 'bg-[#D97706] text-white shadow-xs'
                              : 'bg-[#FFFBEB] text-[#D97706] hover:bg-[#FEF3C7]'
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(item.student_id, 'absent')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            item.status === 'absent'
                              ? 'bg-[#DC2626] text-white shadow-xs'
                              : 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(item.student_id, 'approved_leave')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            item.status === 'approved_leave'
                              ? 'bg-[#016C90] text-white shadow-xs'
                              : 'bg-[#F0FDFA] text-[#016C90] hover:bg-[#CCFBF1]'
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.reason || ''}
                        onChange={(e) => setStudentReason(item.student_id, e.target.value)}
                        placeholder={isBangla ? 'সংশোধনের কারণ লিখুন...' : 'Correction note...'}
                        className="w-full px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenGraduation(item.student_id)}
                        disabled={loadingGraduationId === item.student_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#0F766E] text-[#0F766E] hover:text-white border border-[#CCFBF1] text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                        title={isBangla ? 'গ্র্যাজুয়েশন ও সনদপত্র ট্র্যাকার দেখুন' : 'View Graduation & Certificate'}
                      >
                        <Award className="w-3.5 h-3.5 text-[#C1982E]" />
                        <span>
                          {loadingGraduationId === item.student_id
                            ? (isBangla ? 'লোড হচ্ছে...' : 'Loading...')
                            : (isBangla ? 'সনদ যোগ্যতা' : 'Eligibility')}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Graduation & Certificate Modal */}
      {selectedStudentForGraduation && (
        <GraduationCertificateModal
          isOpen={!!selectedStudentForGraduation}
          onClose={() => setSelectedStudentForGraduation(null)}
          data={selectedStudentForGraduation}
        />
      )}
    </div>
  );
}
