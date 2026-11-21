import React, { createContext, useContext, useState } from 'react';
import { bn } from '../translations/bn';
import { en } from '../translations/en';

type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  isBangla: boolean;
  toggleLanguage: () => void;
  t: typeof bn;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  isBangla: true,
  toggleLanguage: () => {},
  t: bn,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('bn');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const currentTranslations = language === 'bn' ? bn : en;

  return (
    <LanguageContext.Provider
      value={{
        language,
        isBangla: language === 'bn',
        toggleLanguage,
        t: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
