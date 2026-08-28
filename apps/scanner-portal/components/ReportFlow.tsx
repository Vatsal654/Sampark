'use client';
/**
 * Purpose: "Report a damaged or suspicious tag" flow — available even
 * for a tag in an unavailable/paused state, since a scanner should be
 * able to flag a physically cloned or damaged sticker regardless.
 * Related: lib/api-client.ts#reportTag.
 */
import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { reportTag } from '../lib/api-client';

export function ReportFlow({
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
  const [reason, setReason] = useState<'damaged' | 'suspicious_or_cloned' | 'other' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportTag(opaqueId, signature, { reason, note: note.trim() || undefined });
      onDone();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack">
      <h2>{t('reportTag')}</h2>
      <div className="stack" role="radiogroup" aria-label={t('reportTag')}>
        {(
          [
            ['damaged', 'reportReasonDamaged'],
            ['suspicious_or_cloned', 'reportReasonSuspicious'],
            ['other', 'reportReasonOther'],
          ] as const
        ).map(([value, key]) => (
          <button
            key={value}
            type="button"
            className="category-button"
            aria-pressed={reason === value}
            onClick={() => setReason(value)}
            style={{ width: '100%', textAlign: 'left' }}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <textarea maxLength={280} placeholder={t('optionalNote')} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <button type="button" className="button button-primary" disabled={!reason || submitting} onClick={handleSubmit}>
        {t('submit')}
      </button>
      <button type="button" className="button button-link" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
