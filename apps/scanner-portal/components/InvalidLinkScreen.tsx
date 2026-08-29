'use client';
/**
 * Purpose: Shown when a scanned /t/{slug} URL doesn't even parse into an
 * opaqueId + signature pair — distinct from "tag not found" (a real,
 * signature-verified 404 from the API): this case never reaches the API
 * at all, so it's a different failure and gets different copy.
 * Related: app/t/[slug]/page.tsx, components/TagScanScreen.tsx.
 */
import { useLocale } from './LocaleProvider';

export function InvalidLinkScreen() {
  const { t } = useLocale();
  return (
    <main>
      <div className="card">
        <h1>{t('invalidLinkTitle')}</h1>
        <p>{t('invalidLinkBody')}</p>
      </div>
    </main>
  );
}
