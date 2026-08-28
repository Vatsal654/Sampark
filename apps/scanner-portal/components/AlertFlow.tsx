'use client';
/**
 * Purpose: Predefined-category alert submission flow — the primary,
 * no-login scanner action.
 * Security: Location is only attached if the scanner explicitly checks
 * the box, which triggers the browser's native geolocation permission
 * prompt at that moment (never on page load). Declining still lets the
 * alert send.
 * Related: lib/api-client.ts#submitAlert.
 */
import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { submitAlert, ApiError } from '../lib/api-client';
import type { TranslationKey } from '../lib/i18n';

const CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'blocking_access', labelKey: 'categoryBlockingAccess' },
  { value: 'lights_on', labelKey: 'categoryLightsOn' },
  { value: 'window_or_door_open', labelKey: 'categoryWindowOpen' },
  { value: 'being_towed', labelKey: 'categoryBeingTowed' },
  { value: 'parking_concern', labelKey: 'categoryParkingConcern' },
  { value: 'other', labelKey: 'categoryOther' },
];

export function AlertFlow({
  opaqueId,
  signature,
  onDone,
  onCancel,
}: {
  opaqueId: string;
  signature: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [shareLocation, setShareLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!category) return;
    setSubmitting(true);
    setError(null);
    try {
      let location: { latitude: number; longitude: number } | undefined;
      if (shareLocation && 'geolocation' in navigator) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(undefined),
            { timeout: 5000 },
          );
        });
      }
      await submitAlert(opaqueId, signature, { category, note: note.trim() || undefined, location });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t('errorRateLimited') : t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack">
      <h2>{t('sendAlert')}</h2>
      <div className="category-grid" role="radiogroup" aria-label={t('sendAlert')}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className="category-button"
            role="radio"
            aria-checked={category === c.value}
            aria-pressed={category === c.value}
            onClick={() => setCategory(c.value)}
          >
            {t(c.labelKey)}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="alert-note">{t('optionalNote')}</label>
        <textarea id="alert-note" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="checkbox-row">
        <input
          id="share-location"
          type="checkbox"
          checked={shareLocation}
          onChange={(e) => setShareLocation(e.target.checked)}
        />
        <label htmlFor="share-location">{t('shareLocation')}</label>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <button type="button" className="button button-primary" disabled={!category || submitting} onClick={handleSubmit}>
        {t('submit')}
      </button>
      <button type="button" className="button button-link" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
