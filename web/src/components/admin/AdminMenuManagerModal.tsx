'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Archive,
  RotateCcw,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkles,
  ShieldCheck,
  Users,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  Megaphone,
  BookOpen,
  Award,
  Bookmark,
  Globe,
  Settings,
  Star,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface CustomNavItem {
  id: string;
  href: string;
  labelBn: string;
  labelEn: string;
  iconName: string;
  section: 'main' | 'analytics';
  isArchived: boolean;
  isSystemDefault?: boolean;
}

export const AVAILABLE_ICONS: { [key: string]: any } = {
  ShieldCheck,
  Users,
  Layers,
  Calendar,
  FileText,
  BarChart3,
  Megaphone,
  BookOpen,
  Award,
  Bookmark,
  Globe,
  Settings,
  Star,
  HelpCircle,
};

interface AdminMenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  menus: CustomNavItem[];
  onSaveMenus: (updated: CustomNavItem[]) => void;
  onResetDefaults: () => void;
}

export default function AdminMenuManagerModal({
  isOpen,
  onClose,
  menus,
  onSaveMenus,
  onResetDefaults,
}: AdminMenuManagerModalProps) {
  const { isBangla } = useLanguage();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Adding / Editing state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form inputs
  const [formLabelBn, setFormLabelBn] = useState('');
  const [formLabelEn, setFormLabelEn] = useState('');
  const [formHref, setFormHref] = useState('');
  const [formIcon, setFormIcon] = useState('Bookmark');
  const [formSection, setFormSection] = useState<'main' | 'analytics'>('main');

  if (!isOpen) return null;

  const activeMenus = menus.filter((m) => !m.isArchived);
  const archivedMenus = menus.filter((m) => m.isArchived);

  const startEdit = (item: CustomNavItem) => {
    setEditingItemId(item.id);
    setFormLabelBn(item.labelBn);
    setFormLabelEn(item.labelEn);
    setFormHref(item.href);
    setFormIcon(item.iconName);
    setFormSection(item.section);
    setIsAddingNew(false);
  };

  const cancelForm = () => {
    setEditingItemId(null);
    setIsAddingNew(false);
    setFormLabelBn('');
    setFormLabelEn('');
    setFormHref('');
    setFormIcon('Bookmark');
    setFormSection('main');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabelBn.trim() || !formHref.trim()) {
      toast.error(isBangla ? 'মেনু নাম এবং লিংক প্রদান করুন' : 'Label and Link are required');
      return;
    }

    if (editingItemId) {
      // Update existing
      const updated = menus.map((m) => {
        if (m.id === editingItemId) {
          return {
            ...m,
            labelBn: formLabelBn.trim(),
            labelEn: formLabelEn.trim() || formLabelBn.trim(),
            href: formHref.trim(),
            iconName: formIcon,
            section: formSection,
          };
        }
        return m;
      });
      onSaveMenus(updated);
      toast.success(isBangla ? 'মেনু সফলভাবে আপডেট করা হয়েছে' : 'Menu updated successfully');
    } else {
      // Add new
      const newItem: CustomNavItem = {
        id: `custom_${Date.now()}`,
        labelBn: formLabelBn.trim(),
        labelEn: formLabelEn.trim() || formLabelBn.trim(),
        href: formHref.trim(),
        iconName: formIcon,
        section: formSection,
        isArchived: false,
        isSystemDefault: false,
      };
      onSaveMenus([...menus, newItem]);
      toast.success(isBangla ? 'নতুন মেনু সফলভাবে যুক্ত হয়েছে' : 'New menu added successfully');
    }

    cancelForm();
  };

  // Toggle archive
  const handleToggleArchive = (id: string, archive: boolean) => {
    const updated = menus.map((m) => {
      if (m.id === id) {
        return { ...m, isArchived: archive };
      }
      return m;
    });
    onSaveMenus(updated);
    toast.success(
      archive
        ? (isBangla ? 'মেনুটি সফলভাবে আর্কাইভ করা হয়েছে (হাইড থাকবে)' : 'Menu item archived (hidden)')
        : (isBangla ? 'মেনুটি রিস্টোর করা হয়েছে (সামনে আনা হয়েছে)' : 'Menu item restored to sidebar')
    );
  };

  // Move Up / Down
  const handleMove = (indexInActive: number, direction: 'up' | 'down') => {
    const active = [...activeMenus];
    const targetIdx = direction === 'up' ? indexInActive - 1 : indexInActive + 1;
    if (targetIdx < 0 || targetIdx >= active.length) return;

    const temp = active[indexInActive];
    active[indexInActive] = active[targetIdx];
    active[targetIdx] = temp;

    // Merge with archived to preserve all
    const merged = [...active, ...archivedMenus];
    onSaveMenus(merged);
  };

  // Delete custom menu permanently
  const handleDeleteCustom = (id: string) => {
    if (confirm(isBangla ? 'আপনি কি এই কাস্টম মেনুটি স্থায়ীভাবে ডিলিট করতে চান?' : 'Delete this custom menu permanently?')) {
      const updated = menus.filter((m) => m.id !== id);
      onSaveMenus(updated);
      toast.success(isBangla ? 'মেনুটি মুছে ফেলা হয়েছে' : 'Menu deleted');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-[#FFFBEB] text-[#0F172A] flex items-center justify-between border-b border-[#FCD34D] border-l-4 border-l-[#D97706]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/90 border border-[#FCD34D] flex items-center justify-center text-[#0F766E] shadow-xs">
              <Settings className="w-5 h-5 text-[#0F766E]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight font-heading">
                {isBangla ? 'কোর্স কোঅর্ডিনেটর মেনু ম্যানেজার ও আর্কাইভ কন্ট্রোল' : 'Sidebar Navigation Menu & Archive Manager'}
              </h2>
              <p className="text-xs text-[#78350F]">
                {isBangla
                  ? 'বাম পাশের সাইডবার মেনু সহজে এডিট করুন, নতুন মেনু যোগ করুন বা প্রয়োজন অনুযায়ী আর্কাইভ/হাইড করুন'
                  : 'Customize, edit, reorder, and archive navigation items on the left sidebar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#78350F] hover:text-[#0F172A] hover:bg-black/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('active');
                cancelForm();
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#E2E8F0]'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{isBangla ? 'সক্রিয় মেনুসমূহ' : 'Active Menus'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
                {activeMenus.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('archived');
                cancelForm();
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'archived'
                  ? 'bg-amber-900 text-amber-200 shadow-xs'
                  : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#E2E8F0]'
              }`}
            >
              <Archive className="w-4 h-4 text-amber-500" />
              <span>{isBangla ? 'আর্কাইভকৃত মেনু (হাইড)' : 'Archived Menus'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-800 font-extrabold">
                {archivedMenus.length}
              </span>
            </button>
          </div>

          {activeTab === 'active' && !isAddingNew && !editingItemId && (
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingItemId(null);
                setFormLabelBn('');
                setFormLabelEn('');
                setFormHref('');
                setFormIcon('Bookmark');
                setFormSection('main');
              }}
              className="px-3.5 py-2 text-xs font-bold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBangla ? 'নতুন মেনু যোগ করুন' : 'Add New Menu'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Add / Edit Form Drawer */}
          {(isAddingNew || editingItemId) && (
            <form onSubmit={handleSaveForm} className="bg-[#FFFBEB] border-2 border-[#FCD34D] rounded-2xl p-4 sm:p-5 space-y-4 mb-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#FCD34D]">
                <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] flex items-center gap-2 font-heading">
                  <Sparkles className="w-4 h-4 text-[#0F766E]" />
                  <span>
                    {editingItemId
                      ? (isBangla ? 'মেনু তথ্য সম্পাদনা করুন' : 'Edit Menu Item')
                      : (isBangla ? 'নতুন কাস্টম মেনু যুক্ত করুন' : 'Add New Custom Menu Item')}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="p-1 rounded-lg text-[#92400E] hover:bg-[#FEF3C7] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    {isBangla ? 'মেনু নাম (বাংলা) *' : 'Menu Label (Bangla) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabelBn}
                    onChange={(e) => setFormLabelBn(e.target.value)}
                    placeholder="যেমন: পরীক্ষার ফলাফল / লাইব্রেরি"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    {isBangla ? 'মেনু নাম (English)' : 'Menu Label (English)'}
                  </label>
                  <input
                    type="text"
                    value={formLabelEn}
                    onChange={(e) => setFormLabelEn(e.target.value)}
                    placeholder="e.g. Exam Results / Library"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    {isBangla ? 'পাথ বা লিংক (URL / Route) *' : 'Link / URL Path *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formHref}
                    onChange={(e) => setFormHref(e.target.value)}
                    placeholder="যেমন: /admin/exams বা /reports?tab=kpi"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    {isBangla ? 'সেকশন নির্ধারণ' : 'Sidebar Section'}
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  >
                    <option value="main">{isBangla ? 'প্রধান অ্যাডমিন মেনু' : 'Main Admin Menu'}</option>
                    <option value="analytics">{isBangla ? 'অ্যানালিটিক্স ও রিপোর্টস' : 'Analytics & Reports'}</option>
                  </select>
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-2">
                  {isBangla ? 'আইকন নির্বাচন করুন:' : 'Choose Icon:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(AVAILABLE_ICONS).map((iconKey) => {
                    const IconComp = AVAILABLE_ICONS[iconKey];
                    const selected = formIcon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setFormIcon(iconKey)}
                        className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                          selected
                            ? 'bg-[#0F766E] text-white border-[#B45309] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px]">{iconKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{editingItemId ? (isBangla ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Menu') : (isBangla ? 'মেনু সংরক্ষণ করুন' : 'Save Menu')}</span>
                </button>
              </div>
            </form>
          )}

          {/* ACTIVE MENUS TAB */}
          {activeTab === 'active' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 pb-1">
                {isBangla
                  ? 'নিচের মেনুগুলো বর্তমানে সাইডবারে সরাসরি দেখা যাচ্ছে। আপনি যেকোনো মেনুর নাম, আইকন বা লিংক পরিবর্তন করতে পারবেন অথবা সাময়িকভাবে সাইডবার থেকে লুকাতে (আর্কাইভ করতে) পারবেন।'
                  : 'The items below are currently visible in the sidebar. You can edit their labels, links, or archive them.'}
              </p>

              {activeMenus.map((item, idx) => {
                const IconComp = AVAILABLE_ICONS[item.iconName] || Bookmark;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between gap-3 hover:border-[#0D9488]/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0369A1] flex items-center justify-center shrink-0 border border-[#CCFBF1]">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] truncate font-heading">
                            {isBangla ? item.labelBn : item.labelEn}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8FAFC] text-[#475569] font-medium font-mono border border-[#E2E8F0]">
                            {item.href}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#0369A1] font-semibold border border-[#CCFBF1]">
                            {item.section === 'main' ? (isBangla ? 'প্রধান' : 'Main') : (isBangla ? 'অ্যানালিটিক্স' : 'Analytics')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] mt-0.5">
                          {item.labelEn} • {item.iconName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          title={isBangla ? 'উপরে নিন' : 'Move Up'}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === activeMenus.length - 1}
                          title={isBangla ? 'নিচে নিন' : 'Move Down'}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        title={isBangla ? 'সম্পাদনা করুন' : 'Edit'}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">{isBangla ? 'এডিট' : 'Edit'}</span>
                      </button>

                      {/* Archive Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(item.id, true)}
                        title={isBangla ? 'আর্কাইভ করুন (হাইড থাকবে)' : 'Archive (Hide from Sidebar)'}
                        className="px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isBangla ? 'আর্কাইভ' : 'Archive'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ARCHIVED MENUS TAB */}
          {activeTab === 'archived' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {isBangla
                    ? 'আর্কাইভ করা মেনুগুলো বর্তমানে সাইডবারে লুকানো রয়েছে। শিক্ষার্থীরা বা অন্যান্য শিক্ষকরা এটি দেখতে পাবে না। আপনি চাইলে যেকোনো সময় "রিস্টোর করুন / সামনে আনুন" বাটনে ক্লিক করে আবার সাইডবারে ফেরত আনতে পারবেন।'
                    : 'These archived menu items are currently hidden from the left navigation. Click Restore to make them visible again.'}
                </p>
              </div>

              {archivedMenus.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Archive className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                  <p className="text-xs font-semibold">
                    {isBangla ? 'বর্তমানে কোনো মেনু আর্কাইভ করা নেই।' : 'No menus currently archived.'}
                  </p>
                </div>
              ) : (
                archivedMenus.map((item) => {
                  const IconComp = AVAILABLE_ICONS[item.iconName] || Bookmark;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 opacity-90 hover:opacity-100 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-through">
                              {isBangla ? item.labelBn : item.labelEn}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                              {isBangla ? 'আর্কাইভকৃত' : 'Archived'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            {item.href}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(item.id, false)}
                          className="px-3 py-1.5 text-xs font-bold text-[#0369A1] bg-[#F0FDFA] hover:bg-[#0F766E] hover:text-white border border-[#CCFBF1] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs group"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#0369A1] group-hover:text-white" />
                          <span>{isBangla ? 'রিস্টোর করুন / সামনে আনুন' : 'Restore to Sidebar'}</span>
                        </button>

                        {!item.isSystemDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(item.id)}
                            title={isBangla ? 'স্থায়ীভাবে মুছুন' : 'Delete Permanently'}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm(isBangla ? 'আপনি কি সাইডবার মেনুগুলোকে ডিফল্ট অবস্থায় রিসেট করতে চান?' : 'Reset navigation menus to system default?')) {
                onResetDefaults();
                toast.success(isBangla ? 'ডিফল্ট মেনু রিস্টোর করা হয়েছে' : 'Default menus restored');
              }
            }}
            className="px-3.5 py-2 text-xs font-bold text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ডিফল্ট মেনু রিসেট করুন' : 'Reset to System Defaults'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-xl shadow-xs transition cursor-pointer"
          >
            {isBangla ? 'সম্পন্ন' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
