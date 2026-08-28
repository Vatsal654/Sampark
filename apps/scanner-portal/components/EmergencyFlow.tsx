'use client';
/**
 * Purpose: Emergency alert flow — separated from the normal alert flow
 * with its own explicit confirmation step and a life-safety warning,
 * per product spec §5E.
 * Security: Location permission is requested separately here too, never
 * silently collected; medical/emergency-card data is fetched only by the
 * caller after this flow completes (see TagScanScreen), never bundled
 * into this submission.
 * Related: lib/api-client.ts#submitEmergency.
 */
import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { submitEmergency, ApiError } from '../lib/api-client';

export function EmergencyFlow({
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
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!confirmed) return;
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
      await submitEmergency(opaqueId, signature, { note: note.trim() || undefined, location, confirmedEmergency: true });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t('errorRateLimited') : t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack">
      <span className="badge badge-warning">{t('emergency')}</span>
      <p role="alert">{t('emergencyWarning')}</p>

      <div>
        <label htmlFor="emergency-note">{t('optionalNote')}</label>
        <textarea id="emergency-note" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="checkbox-row">
        <input id="emergency-location" type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
        <label htmlFor="emergency-location">{t('shareLocation')}</label>
      </div>

      <div className="checkbox-row">
        <input id="emergency-confirm" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <label htmlFor="emergency-confirm">{t('emergencyConfirm')}</label>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <button type="button" className="button button-danger" disabled={!confirmed || submitting} onClick={handleSubmit}>
        {t('submit')}
      </button>
      <button type="button" className="button button-link" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
