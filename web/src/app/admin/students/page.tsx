'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  X,
  UserCheck,
  GraduationCap,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertTriangle,
  RefreshCw,
  Edit3,
  UserX,
  Ban,
  ShieldAlert,
  CreditCard,
  Award,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import MultiFormatExportDropdown from '@/components/common/MultiFormatExportDropdown';
import StudentIdCardModal from '@/components/student/StudentIdCardModal';
import { GraduationCertificateModal, GraduationData } from '@/components/student/GraduationCertificateModal';

interface StudentItem {
  id: number;
  student_id_number: string;
  registration_no: string;
  full_name: string;
  education_background: string;
  phone?: string;
  email?: string;
  guardian_phone?: string;
  status: string;
  status_reason?: string;
  photo?: string;
  current_batch_name?: string;
  current_batch_id?: number;
  campus_name?: string;
  campus?: number;
}

interface BatchOption {
  id: number;
  name: string;
  batch_number: number;
  campus?: number;
}

export default function AdminStudentsPage() {
  const { t, d, isBangla } = useLanguage();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_id_number: '',
    registration_no: '',
    full_name: '',
    education_background: 'General',
    phone: '',
    email: '',
    guardian_phone: '',
    batch_id: '',
    campus_id: '1',
    photo: '',
  });

  // Bulk import modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkBatchId, setBulkBatchId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Edit student modal state
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    guardian_phone: '',
    registration_no: '',
    education_background: 'General',
    status: 'active',
    status_reason: '',
    campus_id: '1',
    batch_id: '',
    photo: '',
  });
  const [updating, setUpdating] = useState(false);
  const [selectedStudentForIdCard, setSelectedStudentForIdCard] = useState<StudentItem | null>(null);
  const [selectedStudentForGraduation, setSelectedStudentForGraduation] = useState<GraduationData | null>(null);
  const [loadingGraduationId, setLoadingGraduationId] = useState<number | null>(null);

  const handleOpenGraduation = async (st: StudentItem) => {
    setLoadingGraduationId(st.id);
    try {
      const res = await api.get(`/api/v1/students/${st.id}/graduation-eligibility/`);
      setSelectedStudentForGraduation(res.data);
    } catch (err: any) {
      toast.error(isBangla ? 'গ্র্যাজুয়েশন তথ্য লোড করা যায়নি।' : 'Failed to load graduation info.');
    } finally {
      setLoadingGraduationId(null);
    }
  };

  const openEditModal = (st: StudentItem) => {
    setEditingStudent(st);
    setEditFormData({
      full_name: st.full_name || '',
      phone: st.phone || '',
      guardian_phone: st.guardian_phone || '',
      registration_no: st.registration_no || '',
      education_background: st.education_background || 'General',
      status: st.status || 'active',
      status_reason: st.status_reason || '',
      campus_id: String(st.campus || '1'),
      batch_id: st.current_batch_id ? String(st.current_batch_id) : '',
      photo: st.photo || '',
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setUpdating(true);

    try {
      const payload: any = {
        full_name: editFormData.full_name.trim(),
        phone: editFormData.phone.trim(),
        guardian_phone: editFormData.guardian_phone.trim(),
        registration_no: editFormData.registration_no.trim(),
        education_background: editFormData.education_background,
        status: editFormData.status,
        status_reason: editFormData.status_reason.trim(),
        photo: editFormData.photo,
      };

      await api.patch(`/api/v1/students/${editingStudent.id}/`, payload);

      // Handle batch transfer if batch changed
      if (
        editFormData.batch_id &&
        Number(editFormData.batch_id) !== editingStudent.current_batch_id
      ) {
        await api.post(`/api/v1/students/${editingStudent.id}/transfer/`, {
          new_batch_id: Number(editFormData.batch_id),
          reason: 'Admin updated student batch allocation',
        });
      }

      toast.success(
        isBangla
          ? 'শিক্ষার্থীর তথ্য ও স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!'
          : 'Student profile & status updated successfully!'
      );
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      const errData = err.response?.data;
      const msg =
        errData?.detail ||
        errData?.error?.message ||
        errData?.registration_no?.[0] ||
        (isBangla ? 'শিক্ষার্থীর তথ্য আপডেট করা সম্ভব হয়নি।' : 'Failed to update student');
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  // Student Offboarding with Reason Modal state
  const [studentToOffboard, setStudentToOffboard] = useState<StudentItem | null>(null);
  const [offboardStatus, setOffboardStatus] = useState<string>('dropped');
  const [offboardReason, setOffboardReason] = useState<string>('');
  const [offboardCustomReason, setOffboardCustomReason] = useState<string>('');
  const [offboarding, setOffboarding] = useState(false);

  const handleOffboardStudent = async () => {
    if (!studentToOffboard) return;
    setOffboarding(true);
    try {
      const finalReason =
        offboardReason === 'other'
          ? offboardCustomReason.trim()
          : offboardReason || 'Administrative dismissal';
      await api.post(`/api/v1/students/${studentToOffboard.id}/offboard/`, {
        status: offboardStatus,
        reason: finalReason,
      });
      toast.success(
        isBangla
          ? `${studentToOffboard.full_name}-কে সফলভাবে অপসরণ / স্ট্যাটাস পরিবর্তন করা হয়েছে।`
          : `Student ${studentToOffboard.full_name} status updated successfully.`
      );
      setStudentToOffboard(null);
      setOffboardReason('');
      setOffboardCustomReason('');
      fetchStudents();
    } catch (err: any) {
      console.error('Failed to offboard student:', err);
      toast.error(isBangla ? 'শিক্ষার্থী অপসরণ ব্যর্থ হয়েছে।' : 'Failed to offboard student.');
    } finally {
      setOffboarding(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [studRes, batchRes] = await Promise.all([
        api.get('/api/v1/students/'),
        api.get('/api/v1/batches/'),
      ]);

      const studList = Array.isArray(studRes.data)
        ? studRes.data
        : studRes.data?.results || [];
      const batchList = Array.isArray(batchRes.data)
        ? batchRes.data
        : batchRes.data?.results || [];

      setStudents(studList);
      setBatches(batchList);
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error(isBangla ? 'শিক্ষার্থী তালিকা লোড করা যায়নি' : 'Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        student_id_number: formData.student_id_number.trim(),
        registration_no: formData.registration_no.trim(),
        full_name: formData.full_name.trim(),
        education_background: formData.education_background,
        campus_id: Number(formData.campus_id),
        phone: formData.phone.trim(),
        guardian_phone: formData.guardian_phone.trim(),
      };
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.batch_id) payload.batch_id = Number(formData.batch_id);
      if (formData.photo) payload.photo = formData.photo;

      await api.post('/api/v1/students/', payload);
      toast.success(isBangla ? 'শিক্ষার্থী সফলভাবে নিবন্ধিত হয়েছে!' : 'Student registered successfully!');
      setShowAddModal(false);
      setFormData({
        student_id_number: '',
        registration_no: '',
        full_name: '',
        education_background: 'General',
        phone: '',
        email: '',
        guardian_phone: '',
        batch_id: '',
        campus_id: '1',
        photo: '',
      });
      fetchStudents();
    } catch (err: any) {
      const errData = err.response?.data;
      const msg =
        errData?.student_id_number?.[0] ||
        errData?.registration_no?.[0] ||
        errData?.error?.message ||
        'Failed to create student';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async (templateFormat: 'xlsx' | 'csv' = 'xlsx') => {
    setDownloadingTemplate(true);
    try {
      const token = getAccessToken();
      const baseUrl = API_BASE;
      const endpoint = templateFormat === 'csv'
        ? `${baseUrl}/api/v1/students/import-template/?template_format=csv`
        : `${baseUrl}/api/v1/students/import-template/`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = templateFormat === 'csv'
        ? 'assdi_student_import_template.csv'
        : 'assdi_student_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        isBangla
          ? `${templateFormat.toUpperCase()} টেমপ্লেট ডাউনলোড সফল হয়েছে`
          : `${templateFormat.toUpperCase()} template downloaded`
      );
    } catch (err) {
      toast.error(isBangla ? 'টেমপ্লেট ডাউনলোড ব্যর্থ হয়েছে' : 'Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error(isBangla ? 'দয়া করে একটি এক্সেল ফাইল সিলেক্ট করুন' : 'Please select an Excel file');
      return;
    }
    if (!bulkBatchId) {
      toast.error(isBangla ? 'দয়া করে টার্গেট ব্যাচ নির্বাচন করুন' : 'Please select target batch');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', bulkFile);
      formDataUpload.append('batch_id', bulkBatchId);

      const res = await api.post('/api/v1/students/bulk-import/', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(res.data);
      if (res.data?.created_count > 0) {
        toast.success(
          isBangla
            ? `সফলভাবে ${res.data.created_count} জন শিক্ষার্থী অন্তর্ভুক্ত হয়েছে!`
            : `Successfully imported ${res.data.created_count} students!`
        );
        fetchStudents();
      } else {
        toast.error(isBangla ? 'কোনো শিক্ষার্থী যুক্ত করা যায়নি' : 'No students were imported');
      }
    } catch (err: any) {
      const msg = err.response?.data?.file?.[0] || err.response?.data?.message || 'Bulk import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const filteredStudents = students.filter((st) => {
    const matchesSearch =
      st.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.student_id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.registration_no?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedBatch && String(st.current_batch_id) !== selectedBatch) {
      return false;
    }

    if (selectedAudience && st.education_background?.toLowerCase() !== selectedAudience.toLowerCase()) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#FCD34D] rounded-full text-xs font-semibold text-[#92400E] mb-2.5 shadow-xs">
            <Users className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'ভর্তি ও এনরোলমেন্ট প্রশাসন' : 'Admissions & Enrollment'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'শিক্ষার্থী ব্যবস্থাপনা ও ভর্তি পোর্টাল' : 'Student Management & Admissions'}
          </h1>
          <p className="text-xs sm:text-sm text-[#78350F] mt-1 max-w-xl">
            {isBangla
              ? 'শিক্ষার্থীদের তালিকা, রোল নম্বর, শিক্ষাগত পটভূমি ও ব্যাচ অন্তর্ভুক্তি ব্যবস্থাপনা করুন।'
              : 'View student directory, enrollment details, and register new students.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 flex-wrap">
          <MultiFormatExportDropdown
            endpoint="reports/monthly-student-performance/"
            queryParams={{ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}
            baseFilename="student_roster_performance_report"
          />

          <button
            onClick={() => {
              setShowBulkModal(true);
              setImportResult(null);
              setBulkFile(null);
            }}
            className="px-3.5 py-2.5 bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" />
            <span>{isBangla ? 'বাল্ক ইমপোর্ট (এক্সেল/সিএসভি)' : 'Bulk Import (Excel/CSV)'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>{isBangla ? 'নতুন শিক্ষার্থী ভর্তি' : 'Enroll New Student'}</span>
          </button>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isBangla ? 'নাম বা আইডি নম্বর খুঁজুন...' : 'Search by name or ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Batch Filter */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-w-[150px]"
            >
              <option value="" className="bg-white text-[#0F172A]">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white text-[#0F172A]">
                  {b.name}
                </option>
              ))}
            </select>

            {/* Background Filter */}
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-w-[150px]"
            >
              <option value="" className="bg-white text-[#0F172A]">{isBangla ? 'সকল পটভূমি' : 'All Backgrounds'}</option>
              <option value="General" className="bg-white text-[#0F172A]">General</option>
              <option value="Aliya" className="bg-white text-[#0F172A]">Aliya Madrasa</option>
              <option value="Qawmi" className="bg-white text-[#0F172A]">Qawmi Madrasa</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            {isBangla ? 'মোট প্রদর্শিত:' : 'Total Showing:'}{' '}
            <span className="font-bold text-gray-800">{d(filteredStudents.length)}</span> জন
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">{t('common.loading')}</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            {isBangla ? 'কোনো শিক্ষার্থী পাওয়া যায়নি।' : 'No students found matching your criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/90 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'রোল আইডি' : 'Student ID'}</th>
                  <th className="py-3 px-4">{isBangla ? 'শিক্ষার্থীর নাম' : 'Full Name'}</th>
                  <th className="py-3 px-4">{isBangla ? 'রেজিস্ট্রেশন নম্বর' : 'Reg No'}</th>
                  <th className="py-3 px-4">{isBangla ? 'বর্তমান ব্যাচ' : 'Enrolled Batch'}</th>
                  <th className="py-3 px-4">{isBangla ? 'পটভূমি' : 'Background'}</th>
                  <th className="py-3 px-4">{isBangla ? 'মোবাইল নম্বর' : 'Phone'}</th>
                  <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F0FDFA] transition-colors">
                    <td className="py-3.5 px-4 font-bold font-mono text-[#0F172A]">
                      {st.student_id_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A] font-heading">
                      <div className="flex items-center gap-2.5">
                        {st.photo ? (
                          <img
                            src={st.photo}
                            alt={st.full_name}
                            className="w-8 h-8 rounded-full object-cover border border-amber-300 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-[#B45309] font-bold text-xs flex items-center justify-center shrink-0 border border-amber-300">
                            {st.full_name?.charAt(0) || 'S'}
                          </div>
                        )}
                        <span className="truncate">{st.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#475569]">
                      {st.registration_no}
                    </td>
                    <td className="py-3.5 px-4">
                      {st.current_batch_name ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0369A1] border border-[#CCFBF1] font-bold text-[10px]">
                          {st.current_batch_name}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        st.education_background === 'General'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      }`}>
                        {st.education_background}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#475569]">
                      {st.phone || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        {st.status === 'active' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] text-[10px] font-extrabold border border-[#DCFCE7] flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                            {isBangla ? 'সক্রিয়' : 'Active'}
                          </span>
                        ) : st.status === 'expelled' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200 flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3 text-rose-600" />
                            {isBangla ? 'বহিষ্কৃত' : 'Expelled'}
                          </span>
                        ) : st.status === 'dropped' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200 flex items-center gap-1 w-fit">
                            <UserX className="w-3 h-3 text-amber-600" />
                            {isBangla ? 'ড্রপ / বাদ' : 'Dropped'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold border border-slate-200 flex items-center gap-1 w-fit">
                            {isBangla ? 'নিষ্ক্রিয়' : 'Inactive'}
                          </span>
                        )}
                        {st.status_reason && (
                          <span className="text-[10px] text-slate-500 italic max-w-[140px] truncate" title={st.status_reason}>
                            {st.status_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenGraduation(st)}
                          disabled={loadingGraduationId === st.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-[#0F766E] text-[#0369A1] hover:text-white border border-[#CCFBF1] text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={isBangla ? 'সনদ ও গ্র্যাজুয়েশন যোগ্যতা পর্যালোচনা করুন' : 'View Graduation & Certificate'}
                        >
                          <Award className="w-3.5 h-3.5 text-[#C1982E]" />
                          <span>
                            {loadingGraduationId === st.id
                              ? isBangla
                                ? 'লোড হচ্ছে...'
                                : 'Loading...'
                              : isBangla
                              ? 'সনদ ও যোগ্যতা'
                              : 'Certificate'}
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedStudentForIdCard(st)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-[#0F766E] text-[#0369A1] hover:text-white border border-[#CCFBF1] text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={isBangla ? 'ডিজিটাল আইডি কার্ড ও এডমিট কার্ড দেখুন' : 'View ID Card & Admit Card'}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#C1982E]" />
                          <span>{isBangla ? 'আইডি কার্ড' : 'ID Card'}</span>
                        </button>
                        <button
                          onClick={() => openEditModal(st)}
                          className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#0F766E] hover:text-white text-[#0F172A] border border-[#E2E8F0] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                          title={isBangla ? 'শিক্ষার্থীর তথ্য ও স্ট্যাটাস সম্পাদনা করুন' : 'Edit Student'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'সম্পাদনা' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setStudentToOffboard(st);
                            setOffboardStatus('dropped');
                            setOffboardReason(isBangla ? 'স্বেচ্ছায় কোর্স ত্যাগ / ড্রপআউট' : 'Voluntary Withdrawal / Dropped Out');
                            setOffboardCustomReason('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={isBangla ? 'শিক্ষার্থী অপসরণ / বিদায় নিশ্চিতকরণ' : 'Offboard / Remove Student'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'রিমুভ' : 'Remove'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8F0] border-t-4 border-t-[#C1982E] space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2 font-heading">
                <PlusCircle className="w-5 h-5 text-[#0F766E]" />
                <span>{isBangla ? 'নতুন শিক্ষার্থী নিবন্ধন' : 'Enroll New Student'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'রোল আইডি নম্বর *' : 'Student ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="STD-2026-042-050"
                    value={formData.student_id_number}
                    onChange={(e) => setFormData({ ...formData, student_id_number: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'রেজিস্ট্রেশন নম্বর *' : 'Registration No *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="REG-2026-050"
                    value={formData.registration_no}
                    onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'শিক্ষার্থীর পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBangla ? 'যেমন: মোহাম্মদ আব্দুল্লাহ' : 'e.g., Mohammad Abdullah'}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'শিক্ষাগত পটভূমি' : 'Education Background'}
                  </label>
                  <select
                    value={formData.education_background}
                    onChange={(e) => setFormData({ ...formData, education_background: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="General">General</option>
                    <option value="Aliya">Aliya Madrasa</option>
                    <option value="Qawmi">Qawmi Madrasa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'ব্যাচে অন্তর্ভুক্তি' : 'Assign Batch'}
                  </label>
                  <select
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">{isBangla ? 'পরবর্তীতে নির্ধারণ' : 'Assign Later'}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'শিক্ষার্থীর মোবাইল নম্বর' : 'Student Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="01700000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'অভিভাবকের মোবাইল নম্বর' : 'Guardian Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="01800000000"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'ইমেইল অ্যাড্রেস (ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <input
                  type="email"
                  placeholder="student@assdi.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Student Photo for ID Card & Certificate */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>{isBangla ? 'শিক্ষার্থীর ছবি (আইডি কার্ড ও সনদের জন্য)' : 'Student Photo (for ID card & certificate)'}</span>
                  <span className="text-[10px] text-slate-500">{isBangla ? 'পাসপোর্ট সাইজ ছবি' : 'Passport size recommended'}</span>
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  {formData.photo ? (
                    <div className="relative group shrink-0">
                      <img
                        src={formData.photo}
                        alt="Student Preview"
                        className="w-14 h-16 object-cover rounded-lg border-2 border-emerald-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo: '' })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
                        title={isBangla ? 'ছবি মুছে ফেলুন' : 'Remove photo'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-16 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <UserIcon className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-[8px] font-bold mt-0.5">{isBangla ? 'ছবি নেই' : 'No Photo'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#FCD34D] text-[#B45309] hover:bg-amber-50 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{formData.photo ? (isBangla ? 'ছবি পরিবর্তন করুন' : 'Change Photo') : (isBangla ? 'ছবি আপলোড করুন' : 'Upload Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error(isBangla ? 'ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।' : 'Max image size is 2MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setFormData((prev) => ({ ...prev, photo: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isBangla ? 'JPG, PNG ফরম্যাট (আইডি কার্ড ও ডিজিটাল সনদে স্বয়ংক্রিয়ভাবে যুক্ত হবে)' : 'JPG, PNG format (will appear on official ID card & certificate)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {submitting ? (isBangla ? 'নিবন্ধন হচ্ছে...' : 'Saving...') : (isBangla ? 'ভর্তি সম্পন্ন করুন' : 'Confirm Enrollment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#0F766E] border border-[#FCD34D] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isBangla ? 'শিক্ষার্থী বাল্ক ইমপোর্ট (এক্সেল আপলোড)' : 'Bulk Import Students via Excel'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isBangla
                      ? 'এক্সেল শিট দিয়ে এক ক্লিকে বহু শিক্ষার্থীর ভর্তি সম্পন্ন করুন'
                      : 'Enroll multiple students at once using an Excel spreadsheet'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Template Download Banner */}
            <div className="p-4 bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" />
                  <span>{isBangla ? '১. নমুনা টেমপ্লেট ডাউনলোড করুন' : '1. Download Sample Template'}</span>
                </p>
                <p className="text-[11px] text-[#78350F] mt-0.5">
                  {isBangla
                    ? 'ফরম্যাট অনুযায়ী তথ্য পূরণের জন্য এক্সেল বা সিএসভি টেমপ্লেট সংগ্রহ করুন'
                    : 'Download pre-formatted Excel or CSV template with required headers'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  disabled={downloadingTemplate}
                  className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Download .XLSX"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>{isBangla ? 'এক্সেল (.xlsx)' : 'Excel (.xlsx)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  disabled={downloadingTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Download .CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>{isBangla ? 'সিএসভি (.csv)' : 'CSV (.csv)'}</span>
                </button>
              </div>
            </div>

            {/* Results Display if Import Completed */}
            {importResult && (
              <div className="mb-4 space-y-3">
                <div
                  className={`p-4 rounded-2xl border text-xs ${
                    importResult.created_count > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 font-bold">
                      {importResult.created_count > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {isBangla
                          ? `ব্যাচ "${importResult.batch_name}": ${importResult.created_count} জন শিক্ষার্থী সফলভাবে ভর্তি হয়েছে!`
                          : `Batch "${importResult.batch_name}": ${importResult.created_count} students enrolled!`}
                      </span>
                    </div>

                    {importResult.created_count > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatch(bulkBatchId);
                          setShowBulkModal(false);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer"
                      >
                        {isBangla ? 'তালিকায় দেখুন →' : 'View in List →'}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-600">
                    {isBangla
                      ? `মোট প্রসেস করা সারি: ${importResult.total_rows_processed} | সফল: ${importResult.created_count} | ত্রুটি / স্কিপ: ${importResult.error_count}`
                      : `Total rows processed: ${importResult.total_rows_processed} | Success: ${importResult.created_count} | Errors / Skipped: ${importResult.error_count}`}
                  </p>

                  {importResult.created_students?.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/80">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-1.5">
                        {isBangla ? 'নতুন ভর্তি হওয়া শিক্ষার্থীগণ:' : 'Newly Enrolled Students:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {importResult.created_students.map((st: any) => (
                          <span
                            key={st.id || st.student_id_number}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-[10px] font-semibold shadow-2xs"
                          >
                            <span>{st.full_name}</span>
                            <span className="font-mono text-emerald-600">({st.student_id_number})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {importResult.errors?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-[11px]">
                    <p className="font-bold text-rose-800 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isBangla ? 'যেসব সারি স্কিপ হয়েছে:' : 'Skipped rows:'}</span>
                    </p>
                    <ul className="space-y-1 text-rose-700">
                      {importResult.errors.map((errItem: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="font-mono font-bold shrink-0">[{isBangla ? 'সারি' : 'Row'} {errItem.row}]:</span>
                          <span>{errItem.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isBangla ? '২. ভর্তি করার টার্গেট ব্যাচ (বাধ্যতামূলক):' : '2. Target Enrollment Batch (Required):'}
                </label>
                <select
                  required
                  value={bulkBatchId}
                  onChange={(e) => setBulkBatchId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                >
                  <option value="">{isBangla ? '-- ব্যাচ নির্বাচন করুন --' : '-- Select Batch --'}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Batch #{b.batch_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isBangla ? '৩. এক্সেল বা সিএসভি ফাইল আপলোড (.xlsx, .csv):' : '3. Upload Filled Excel / CSV File (.xlsx, .csv):'}
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setBulkFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-5 text-center transition-colors bg-gray-50/60"
                >
                  <input
                    type="file"
                    id="excel_file_input"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBulkFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  {bulkFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                      </div>
                      <p className="text-xs font-bold text-emerald-900">{bulkFile.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(bulkFile.size / 1024).toFixed(1)} KB • {isBangla ? 'ফাইল রেডি' : 'Ready to import'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setBulkFile(null)}
                        className="mt-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>{isBangla ? 'ফাইল বাতিল করুন' : 'Remove File'}</span>
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="excel_file_input" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {isBangla ? 'ফাইল সিলেক্ট করতে এখানে ক্লিক করুন অথবা ড্র্যাগ করুন' : 'Click to select or drag and drop file'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">.XLSX, .XLS or .CSV format</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={importing || !bulkFile || !bulkBatchId}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isBangla ? 'ইমপোর্ট হচ্ছে...' : 'Importing...'}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-[#C1982E]" />
                      <span>{isBangla ? 'ইমপোর্ট শুরু করুন' : 'Start Import'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Profile & Status Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 border-t-4 border-t-[#C1982E] space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#0F766E]" />
                  <span>
                    {isBangla ? 'শিক্ষার্থীর তথ্য ও স্ট্যাটাস সম্পাদনা' : 'Edit Student Profile & Lifecycle'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {editingStudent.student_id_number} • {editingStudent.full_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'শিক্ষার্থীর পূর্ণ নাম *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, full_name: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'মোবাইল নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Reg No & Guardian Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'রেজিস্ট্রেশন নম্বর *' : 'Registration No *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.registration_no}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, registration_no: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'অভিভাবকের মোবাইল' : 'Guardian Phone'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.guardian_phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, guardian_phone: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Background & Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'শিক্ষাগত পটভূমি' : 'Education Background'}
                  </label>
                  <select
                    value={editFormData.education_background}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        education_background: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="General">General (জেনারেল)</option>
                    <option value="Aliya">Aliya Madrasa (আলিয়া মাদ্রাসা)</option>
                    <option value="Qawmi">Qawmi Madrasa (কওমি মাদ্রাসা)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'বর্তমান ব্যাচ স্থানান্তর' : 'Batch Allocation'}
                  </label>
                  <select
                    value={editFormData.batch_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, batch_id: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="">{isBangla ? '-- ব্যাচ নির্বাচন করুন --' : '-- Select Batch --'}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Batch #{b.batch_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Lifecycle Status (Crucial) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                <label className="block font-extrabold text-[#0F172A] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#C1982E]" />
                  <span>{isBangla ? 'শিক্ষার্থীর অবস্থা / স্ট্যাটাস (Status Lifecycle)' : 'Student Status'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      editFormData.status === 'active'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={editFormData.status === 'active'}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, status: e.target.value })
                      }
                      className="accent-[#0F766E]"
                    />
                    <span>{isBangla ? 'সক্রিয় (Active)' : 'Active'}</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      editFormData.status === 'inactive'
                        ? 'bg-slate-100 border-slate-500 text-slate-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={editFormData.status === 'inactive'}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, status: e.target.value })
                      }
                      className="accent-slate-700"
                    />
                    <span>{isBangla ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      editFormData.status === 'dropped'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="dropped"
                      checked={editFormData.status === 'dropped'}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, status: e.target.value })
                      }
                      className="accent-amber-600"
                    />
                    <span>{isBangla ? 'ড্রপ / বাদ (Dropped)' : 'Dropped'}</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      editFormData.status === 'expelled'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="expelled"
                      checked={editFormData.status === 'expelled'}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, status: e.target.value })
                      }
                      className="accent-rose-600"
                    />
                    <span>{isBangla ? 'বহিষ্কৃত (Expelled)' : 'Expelled'}</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isBangla
                    ? 'বহিষ্কৃত বা ড্রপ করা হলে শিক্ষার্থী সিস্টেমে লগইন করতে পারবে না।'
                    : 'Expelling or dropping a student suspends account login access.'}
                </p>
              </div>

              {/* Status Reason / Note */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isBangla ? 'স্ট্যাটাস পরিবর্তন বা প্রশাসনিক নোট / কারণ' : 'Status Reason / Administrative Note'}
                </label>
                <input
                  type="text"
                  placeholder={isBangla ? 'যেমন: নিয়মভঙ্গের কারণে সাময়িক অব্যাহতি বা কোর্স সমাপ্ত' : 'e.g. Course completed, disciplinary note, or transfer'}
                  value={editFormData.status_reason}
                  onChange={(e) => setEditFormData({ ...editFormData, status_reason: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                />
              </div>

              {/* Student Photo for ID Card & Certificate */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>{isBangla ? 'শিক্ষার্থীর ছবি (আইডি কার্ড ও সনদের জন্য)' : 'Student Photo (for ID card & certificate)'}</span>
                  <span className="text-[10px] text-slate-500">{isBangla ? 'পাসপোর্ট সাইজ ছবি' : 'Passport size recommended'}</span>
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  {editFormData.photo ? (
                    <div className="relative group shrink-0">
                      <img
                        src={editFormData.photo}
                        alt="Student Preview"
                        className="w-14 h-16 object-cover rounded-lg border-2 border-emerald-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, photo: '' })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
                        title={isBangla ? 'ছবি মুছে ফেলুন' : 'Remove photo'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-16 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <UserIcon className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-[8px] font-bold mt-0.5">{isBangla ? 'ছবি নেই' : 'No Photo'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#FCD34D] text-[#B45309] hover:bg-amber-50 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{editFormData.photo ? (isBangla ? 'ছবি পরিবর্তন করুন' : 'Change Photo') : (isBangla ? 'ছবি আপলোড করুন' : 'Upload Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error(isBangla ? 'ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।' : 'Max image size is 2MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setEditFormData((prev) => ({ ...prev, photo: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isBangla ? 'JPG, PNG ফরম্যাট (আইডি কার্ড ও ডিজিটাল সনদে স্বয়ংক্রিয়ভাবে আপডেট হবে)' : 'JPG, PNG format (will appear on official ID card & certificate)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C1982E]" />
                  )}
                  <span>
                    {updating
                      ? isBangla
                        ? 'আপডেট হচ্ছে...'
                        : 'Updating...'
                      : isBangla
                        ? 'পরিবর্তন সংরক্ষণ করুন'
                        : 'Save Changes'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Student ID Card and Admit Card Modal */}
      {selectedStudentForIdCard && (
        <StudentIdCardModal
          isOpen={!!selectedStudentForIdCard}
          onClose={() => setSelectedStudentForIdCard(null)}
          studentId={selectedStudentForIdCard.id}
          initialData={{
            student_id: selectedStudentForIdCard.id,
            student_id_number: selectedStudentForIdCard.student_id_number,
            registration_no: selectedStudentForIdCard.registration_no,
            full_name: selectedStudentForIdCard.full_name,
            phone: selectedStudentForIdCard.phone,
            guardian_phone: selectedStudentForIdCard.guardian_phone,
            education_background: selectedStudentForIdCard.education_background,
            status: selectedStudentForIdCard.status,
            photo_url: selectedStudentForIdCard.photo,
            batch_name: selectedStudentForIdCard.current_batch_name,
            campus_name: selectedStudentForIdCard.campus_name,
          }}
        />
      )}

      {/* Student Graduation & Certificate Modal */}
      {selectedStudentForGraduation && (
        <GraduationCertificateModal
          isOpen={!!selectedStudentForGraduation}
          onClose={() => setSelectedStudentForGraduation(null)}
          data={selectedStudentForGraduation}
        />
      )}

      {/* Student Offboarding & Dismissal with Reason Modal */}
      {studentToOffboard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 border-t-4 border-t-rose-600 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    {isBangla ? 'শিক্ষার্থী অপসরণ / বিদায় নিশ্চিতকরণ' : 'Student Offboarding & Dismissal'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {studentToOffboard.student_id_number} • {studentToOffboard.full_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentToOffboard(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">
                  {isBangla ? 'অপসরণ বা বাতিলের কারণ নির্ধারণ করুন *' : 'Select Offboarding / Removal Reason *'}
                </label>
                <div className="space-y-2">
                  {[
                    {
                      status: 'inactive',
                      reason: isBangla ? 'কোর্স সফলভাবে সম্পন্ন হয়েছে (গ্র্যাজুয়েট)' : 'Course Completed / Graduated',
                      label: isBangla ? 'কোর্স সম্পন্ন (গ্র্যাজুয়েট)' : 'Course Completed',
                      desc: isBangla ? 'শিক্ষার্থীর মেয়াদ ও সিলেবাস সফলভাবে সমাপ্ত' : 'Completed all academic requirements',
                      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
                      badge: 'bg-emerald-100 text-emerald-800',
                    },
                    {
                      status: 'expelled',
                      reason: isBangla ? 'শৃঙ্খলা ভঙ্গ / অসদাচরণের দায়ে বহিষ্কৃত' : 'Expelled for Disciplinary Violation',
                      label: isBangla ? 'শৃঙ্খলা ভঙ্গ / বহিষ্কৃত' : 'Expelled / Disciplinary',
                      desc: isBangla ? 'ইনস্টিটিউটের নিয়মভঙ্গ বা অশোভন আচরণের কারণে স্থায়ী বহিষ্কার' : 'Violated institute rules or policy',
                      color: 'border-rose-200 bg-rose-50/50 text-rose-900',
                      badge: 'bg-rose-100 text-rose-800',
                    },
                    {
                      status: 'dropped',
                      reason: isBangla ? 'স্বেচ্ছায় কোর্স ত্যাগ / ড্রপআউট' : 'Voluntary Withdrawal / Dropped Out',
                      label: isBangla ? 'স্বেচ্ছায় কোর্স ত্যাগ / ড্রপআউট' : 'Voluntary Withdrawal / Dropped',
                      desc: isBangla ? 'ব্যক্তিগত বা কর্মসংস্থানজনিত কারণে কোর্স ত্যাগ' : 'Left course voluntarily due to personal reasons',
                      color: 'border-amber-200 bg-amber-50/50 text-amber-900',
                      badge: 'bg-amber-100 text-amber-800',
                    },
                    {
                      status: 'inactive',
                      reason: isBangla ? 'দীর্ঘদিন ক্লাসে অনুপস্থিত / অনিয়মিত' : 'Prolonged Inactivity / Irregular',
                      label: isBangla ? 'অনুপস্থিত বা অনিয়মিত' : 'Prolonged Absence / Inactive',
                      desc: isBangla ? 'অনুমতি ব্যতীত একাধিক সেশনে অনুপস্থিতি' : 'Consecutive absences without prior leave',
                      color: 'border-slate-200 bg-slate-50 text-slate-900',
                      badge: 'bg-slate-200 text-slate-800',
                    },
                    {
                      status: 'dropped',
                      reason: 'other',
                      label: isBangla ? 'অন্যান্য নির্দিষ্ট কারণ...' : 'Other Custom Reason...',
                      desc: isBangla ? 'নিচে প্রশাসনিক বিবরণ লিখুন' : 'Specify custom reason below',
                      color: 'border-blue-200 bg-blue-50/50 text-blue-900',
                      badge: 'bg-blue-100 text-blue-800',
                    },
                  ].map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                        offboardReason === opt.reason
                          ? `${opt.color} ring-2 ring-[#0F766E]`
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="offboard_reason"
                        value={opt.reason}
                        checked={offboardReason === opt.reason}
                        onChange={() => {
                          setOffboardReason(opt.reason);
                          setOffboardStatus(opt.status);
                        }}
                        className="mt-1 text-[#0F766E] focus:ring-[#0F766E]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{opt.label}</span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${opt.badge}`}>
                            {opt.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {offboardReason === 'other' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isBangla ? 'অন্যান্য কারণের সুনির্দিষ্ট বিবরণ লিখুন *' : 'Specify Detailed Reason *'}
                  </label>
                  <textarea
                    rows={2}
                    value={offboardCustomReason}
                    onChange={(e) => setOffboardCustomReason(e.target.value)}
                    placeholder={isBangla ? 'বাতিলের কারণ বা প্রশাসনিক নোট লিখুন...' : 'Enter administrative offboarding remarks...'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {isBangla
                    ? 'সতর্কবার্তা: অপসরণের সাথে সাথেই শিক্ষার্থীর লগইন অ্যাক্সেস বন্ধ হয়ে যাবে এবং অডিট লগে প্রশাসনিক কারণসহ সংরক্ষিত থাকবে।'
                    : 'Notice: Student login access will be disabled immediately, and the action will be recorded in the institutional audit log.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToOffboard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleOffboardStudent}
                disabled={offboarding || !offboardReason || (offboardReason === 'other' && !offboardCustomReason.trim())}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {offboarding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <UserX className="w-3.5 h-3.5 text-white" />
                )}
                <span>
                  {offboarding
                    ? isBangla
                      ? 'কার্যকর হচ্ছে...'
                      : 'Processing...'
                    : isBangla
                    ? 'হ্যাঁ, অপসরণ নিশ্চিত করুন'
                    : 'Confirm Offboarding'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
