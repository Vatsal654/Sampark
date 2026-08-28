'use client';
import { useLocale } from './LocaleProvider';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="locale-toggle" role="group" aria-label="Language / भाषा">
      <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
        English
      </button>
      <button type="button" aria-pressed={locale === 'ne'} onClick={() => setLocale('ne')}>
        नेपाली
      </button>
    </div>
  );
}
