'use client';
/**
 * Purpose: Lightweight locale context — no i18n framework, just React
 * state persisted to localStorage, per the "very lightweight" scanner
 * portal requirement.
 * Related: lib/i18n.ts.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Locale, type TranslationKey } from '../lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('sampark-locale');
      if (stored === 'en' || stored === 'ne') setLocaleState(stored);
    } catch {
      // localStorage unavailable (private browsing) — default to English silently.
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem('sampark-locale', next);
    } catch {
      // Best-effort persistence only.
    }
  };

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key: TranslationKey) => translate(locale, key) }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside a LocaleProvider');
  return ctx;
}
