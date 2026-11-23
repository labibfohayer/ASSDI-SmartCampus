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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border shadow-xs cursor-pointer ${
        language === 'bn'
          ? 'bg-[#FFFBEB] text-[#B45309] border-[#FCD34D] hover:bg-[#FEF3C7]'
          : 'bg-[#B45309] text-white border-[#D97706] hover:bg-[#92400E]'
      } ${className}`}
      title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      <Globe className="w-3.5 h-3.5 text-[#B45309]" />
      <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
    </button>
  );
}
