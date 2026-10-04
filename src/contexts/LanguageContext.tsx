import { createContext, useContext, useState, type ReactNode } from 'react';
import i18n, { supportedLanguages } from '@/services/i18n';

interface LanguageContextValue { lang: string; changeLanguage: (lang: string) => void; languages: typeof supportedLanguages }

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(i18n.language || 'fr');
  const changeLanguage = (next: string) => {
    void i18n.changeLanguage(next);
    setLang(next);
    localStorage.setItem('lang', next);
    document.documentElement.lang = next;
  };
  return <LanguageContext.Provider value={{ lang, changeLanguage, languages: supportedLanguages }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
