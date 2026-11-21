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
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

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
  });

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
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>{isBangla ? 'শিক্ষার্থী ব্যবস্থাপনা ও ভর্তি পোর্টাল' : 'Student Management & Admissions'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isBangla
              ? 'শিক্ষার্থীদের তালিকা, রোল নম্বর, শিক্ষাগত পটভূমি ও ব্যাচ অন্তর্ভুক্তি ব্যবস্থাপনা করুন।'
              : 'View student directory, enrollment details, and register new students.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#1B4D3E] hover:bg-[#153E32] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isBangla ? 'নতুন শিক্ষার্থী ভর্তি' : 'Enroll New Student'}</span>
        </button>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
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
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none"
            >
              <option value="">{isBangla ? 'সকল ব্যাচ' : 'All Batches'}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Background Filter */}
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none"
            >
              <option value="">{isBangla ? 'সকল পটভূমি' : 'All Backgrounds'}</option>
              <option value="General">General</option>
              <option value="Aliya">Aliya Madrasa</option>
              <option value="Qawmi">Qawmi Madrasa</option>
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
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'রোল আইডি' : 'Student ID'}</th>
                  <th className="py-3 px-4">{isBangla ? 'শিক্ষার্থীর নাম' : 'Full Name'}</th>
                  <th className="py-3 px-4">{isBangla ? 'রেজিস্ট্রেশন নম্বর' : 'Reg No'}</th>
                  <th className="py-3 px-4">{isBangla ? 'বর্তমান ব্যাচ' : 'Enrolled Batch'}</th>
                  <th className="py-3 px-4">{isBangla ? 'পটভূমি' : 'Background'}</th>
                  <th className="py-3 px-4">{isBangla ? 'মোবাইল নম্বর' : 'Phone'}</th>
                  <th className="py-3 px-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-emerald-50/30 transition">
                    <td className="py-3 px-4 font-bold font-mono text-gray-900">
                      {st.student_id_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {st.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {st.registration_no}
                    </td>
                    <td className="py-3 px-4">
                      {st.current_batch_name ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                          {st.current_batch_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.education_background === 'General'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {st.education_background}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600">
                      {st.phone || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {st.status || 'Active'}
                      </span>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <span>{isBangla ? 'নতুন শিক্ষার্থী নিবন্ধন' : 'Enroll New Student'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
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
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#153E32] text-white font-bold rounded-xl shadow-xs transition"
                >
                  {submitting ? (isBangla ? 'নিবন্ধন হচ্ছে...' : 'Saving...') : (isBangla ? 'ভর্তি সম্পন্ন করুন' : 'Confirm Enrollment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
