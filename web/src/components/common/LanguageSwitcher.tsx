'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shadow-sm ${
        language === 'bn'
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          : 'bg-emerald-800 text-emerald-100 border-emerald-700 hover:bg-emerald-700'
      } ${className}`}
      title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
      <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
    </button>
  );
}
