'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getTranslation, formatNumberByLang } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  d: (num: number | string) => string;
  isBangla: boolean;
  mounted: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  d: (num: number | string) => String(num),
  isBangla: true,
  mounted: false,
});

const LANG_STORAGE_KEY = 'assdi_language';

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('bn');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedLang = (localStorage.getItem(LANG_STORAGE_KEY) as Language) || 'bn';
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
      if (savedLang === 'bn') {
        document.documentElement.classList.add('lang-bn');
        document.documentElement.classList.remove('lang-en');
      } else {
        document.documentElement.classList.add('lang-en');
        document.documentElement.classList.remove('lang-bn');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      if (lang === 'bn') {
        document.documentElement.classList.add('lang-bn');
        document.documentElement.classList.remove('lang-en');
      } else {
        document.documentElement.classList.add('lang-en');
        document.documentElement.classList.remove('lang-bn');
      }
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'bn' ? 'en' : 'bn';
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    return getTranslation(key, language, fallback);
  };

  const d = (num: number | string): string => {
    return formatNumberByLang(num, language);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        d,
        isBangla: language === 'bn',
        mounted,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
