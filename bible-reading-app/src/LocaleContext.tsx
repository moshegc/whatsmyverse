// src/LocaleContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Locale } from './i18n';

interface LocaleContextType {
  locale: Locale;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  toggleLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'he' : 'en'));
  };

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
