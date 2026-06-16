import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode, LANGUAGES, TRANSLATIONS } from './translations';

interface LanguageContextProps {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('toolmitra_lang') as LanguageCode;
    if (savedLang && TRANSLATIONS[savedLang]) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (code: LanguageCode) => {
    if (TRANSLATIONS[code]) {
      setLanguageState(code);
      localStorage.setItem('toolmitra_lang', code);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const translationSet = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return translationSet[key] || TRANSLATIONS['en'][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
