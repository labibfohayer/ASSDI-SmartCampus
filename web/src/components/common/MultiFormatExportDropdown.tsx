'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Presentation,
  Printer,
  RefreshCw,
  Check,
  FileCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';

export type ExportFileType = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'print';

interface ExportFormatOption {
  format: ExportFileType;
  extension: string;
  labelBn: string;
  labelEn: string;
  descBn: string;
  descEn: string;
  badge: string;
  badgeColor: string;
  icon: any;
}

const EXPORT_OPTIONS: ExportFormatOption[] = [
  {
    format: 'pdf',
    extension: '.pdf',
    labelBn: 'পিডিএফ ডকুমেন্ট (.pdf)',
    labelEn: 'PDF Document (.pdf)',
    descBn: 'অফিসিয়াল প্রিন্ট-রেডি প্রতিবেদন (Adobe PDF)',
    descEn: 'Official print-ready PDF document',
    badge: 'PDF',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: FileText,
  },
  {
    format: 'docx',
    extension: '.docx',
    labelBn: 'ওয়ার্ড ডকুমেন্ট (.docx)',
    labelEn: 'Word Document (.docx)',
    descBn: 'সম্পাদনাযোগ্য প্রাতিষ্ঠানিক ডকুমেন্ট (Microsoft Word)',
    descEn: 'Editable Microsoft Word document',
    badge: 'DOCX',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: FileText,
  },
  {
    format: 'pptx',
    extension: '.pptx',
    labelBn: 'পাওয়ারপয়েন্ট স্লাইড (.pptx)',
    labelEn: 'PowerPoint Slide (.pptx)',
    descBn: 'মিটিং ও প্রেজেন্টেশনের জন্য স্লাইড (Microsoft PowerPoint)',
    descEn: 'Executive Presentation Slides (16:9)',
    badge: 'PPTX',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Presentation,
  },
  {
    format: 'xlsx',
    extension: '.xlsx',
    labelBn: 'এক্সেল স্প্রেডশিট (.xlsx)',
    labelEn: 'Excel Spreadsheet (.xlsx)',
    descBn: 'পূর্ণাঙ্গ সেল ও ফর্মুলা ওয়ার্কবুক (Microsoft Excel)',
    descEn: 'Full calculation spreadsheet with formatting',
    badge: 'XLSX',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: FileSpreadsheet,
  },
  {
    format: 'csv',
    extension: '.csv',
    labelBn: 'সিএসভি স্প্রেডশিট (.csv)',
    labelEn: 'CSV Spreadsheet (.csv)',
    descBn: 'ইউনিভার্সাল র ডেটা ফাইল (UTF-8 BOM)',
    descEn: 'Universal comma-separated data',
    badge: 'CSV',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: FileCode,
  },
  {
    format: 'print',
    extension: '',
    labelBn: 'সরাসরি প্রিন্ট (Print)',
    labelEn: 'Direct Print (Printer View)',
    descBn: 'ব্রাউজার প্রিন্টার উইন্ডো দিয়ে সরাসরি প্রিন্ট',
    descEn: 'Open browser print dialogue directly',
    badge: 'PRINT',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Printer,
  },
];

interface MultiFormatExportDropdownProps {
  endpoint: string; // e.g. 'reports/daily-attendance/'
  queryParams?: Record<string, any>;
  baseFilename: string; // e.g. 'daily_attendance_report'
  disabled?: boolean;
  className?: string;
}

export default function MultiFormatExportDropdown({
  endpoint,
  queryParams = {},
  baseFilename,
  disabled = false,
  className = '',
}: MultiFormatExportDropdownProps) {
  const { isBangla } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFileType | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFileType) => {
    if (format === 'print') {
      setDropdownOpen(false);
      window.print();
      return;
    }

    setDownloadingFormat(format);
    setDropdownOpen(false);

    try {
      const token = getAccessToken();
      const params = { ...queryParams, export: format };
      const queryString = new URLSearchParams(params).toString();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      const downloadUrl = `${baseUrl}/api/v1/${cleanEndpoint}?${queryString}`;

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Detect filename from content-disposition
      const disposition = response.headers.get('content-disposition');
      let filename = `${baseFilename}.${format}`;
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(
        isBangla
          ? `সফলভাবে ${format.toUpperCase()} ফাইল ডাউনলোড হয়েছে!`
          : `Successfully downloaded ${format.toUpperCase()} file!`
      );
    } catch (err: any) {
      toast.error(
        isBangla
          ? 'ফাইল ডাউনলোড ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
          : 'Failed to download file. Please try again.'
      );
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled || downloadingFormat !== null}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-[#0B2A21] text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        {downloadingFormat ? (
          <RefreshCw className="w-4 h-4 animate-spin text-[#0B2A21]" />
        ) : (
          <Download className="w-4 h-4 text-[#0B2A21]" />
        )}
        <span>
          {downloadingFormat
            ? (isBangla ? `${downloadingFormat.toUpperCase()} প্রস্তুত হচ্ছে...` : `Exporting ${downloadingFormat.toUpperCase()}...`)
            : (isBangla ? 'রিপোর্ট ডাউনলোড করুন' : 'Export Report')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#0B2A21] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Options */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200/90 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B2A21]">
              {isBangla ? 'ডাউনলোড ফরম্যাট নির্বাচন করুন:' : 'Choose Download Format:'}
            </p>
          </div>

          <div className="py-1">
            {EXPORT_OPTIONS.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.format}
                  type="button"
                  onClick={() => handleExport(opt.format)}
                  className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/60 transition flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-white text-gray-700 group-hover:text-emerald-800 flex items-center justify-center shrink-0 border border-gray-200 transition">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900 truncate">
                        {isBangla ? opt.labelBn : opt.labelEn}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {isBangla ? opt.descBn : opt.descEn}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <p className="text-[10px] text-gray-400 italic">
              {isBangla
                ? 'ওয়ার্ড, পাওয়ারপয়েন্ট, এক্সেল ও পিডিএফ সকল ফরম্যাট প্রাতিষ্ঠানিকভাবে ভেরিফাইড।'
                : 'All formats generated with institutional ASSDI headers.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
