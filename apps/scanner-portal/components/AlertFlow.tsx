'use client';
/**
 * Purpose: The "send a predefined alert" sub-flow — category selection,
 * optional note/location, submit.
 * Responsibilities: Classifies a failed submission by ApiErrorKind, the
 * same system TagScanScreen uses for the tag lookup — never collapses a
 * network/CORS failure, a rejected 4xx, and a 5xx into one generic
 * message, since only the first of those is actually worth a retry
 * button. onDone() (which the parent uses to show the "Alert sent"
 * confirmation screen) is called strictly after submitAlert() resolves
 * without throwing, i.e. only after the backend has actually created the
 * AlertEvent — this component has no code path that can show a success
 * state before that.
 * Related: lib/api-client.ts, components/TagScanScreen.tsx,
 * components/DevDiagnostics.tsx.
 */
import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { submitAlert, buildAlertPath, ApiError, API_BASE_URL, type ApiErrorKind } from '../lib/api-client';
import { AlertDevDiagnostics, type SubmissionDiagnostics } from './DevDiagnostics';
import {
  isSecureContextForGeolocation,
  captureLocation,
  type LocationCaptureState,
  type LocationUnavailableReason,
} from '../lib/geolocation';
import type { TranslationKey } from '../lib/i18n';

const LOCATION_REASON_COPY: Record<LocationUnavailableReason, TranslationKey> = {
  insecure_context: 'locationReasonInsecureContext',
  unsupported: 'locationReasonUnsupported',
  permission_denied: 'locationReasonPermissionDenied',
  position_unavailable: 'locationReasonPositionUnavailable',
  timeout: 'locationReasonTimeout',
};

const CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'blocking_access', labelKey: 'categoryBlockingAccess' },
  { value: 'lights_on', labelKey: 'categoryLightsOn' },
  { value: 'window_or_door_open', labelKey: 'categoryWindowOpen' },
  { value: 'being_towed', labelKey: 'categoryBeingTowed' },
  { value: 'parking_concern', labelKey: 'categoryParkingConcern' },
  { value: 'other', labelKey: 'categoryOther' },
];

/** Same classification a failed tag lookup uses, plus a distinct copy for a 400 (rate-limited) —
 * classifyStatus() in lib/api-client.ts maps every non-404/401/403 status to 'server_error', so
 * "too many requests" needs its own check on the raw status rather than the coarse kind alone. */
const ERROR_COPY: Record<ApiErrorKind, { titleKey: TranslationKey; bodyKey: TranslationKey }> = {
  not_found: { titleKey: 'tagNotFoundTitle', bodyKey: 'tagNotFoundBody' },
  unauthorized: { titleKey: 'unauthorizedTitle', bodyKey: 'unauthorizedBody' },
  server_error: { titleKey: 'serverErrorTitle', bodyKey: 'serverErrorBody' },
  network_error: { titleKey: 'networkErrorTitle', bodyKey: 'networkErrorBody' },
};

function initialDiagnostics(opaqueId: string, signature: string): SubmissionDiagnostics {
  return {
    method: 'POST',
    requestUrl: `${API_BASE_URL}${buildAlertPath(opaqueId, signature)}`,
    submissionStarted: false,
    fetchAttempted: false,
    responseStatus: null,
    fetchException: null,
    classification: null,
  };
}

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
  const [locationState, setLocationState] = useState<LocationCaptureState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ titleKey: TranslationKey; bodyKey: TranslationKey; kind: ApiErrorKind | 'client' } | null>(null);
  const [diagnostics, setDiagnostics] = useState<SubmissionDiagnostics>(() => initialDiagnostics(opaqueId, signature));

  // The ONLY place location capture is ever initiated — a direct response to the user checking
  // this specific box, never on page load, tag lookup, or any other trigger. Unchecking discards
  // any location already captured (never resurrected by re-checking without a fresh capture), so
  // opting out is always a hard "no location" rather than a stale cached one.
  async function handleShareLocationChange(checked: boolean) {
    setShareLocation(checked);
    if (!checked) {
      setLocationState({ status: 'idle' });
      return;
    }
    if (typeof window === 'undefined' || !isSecureContextForGeolocation(window)) {
      setLocationState({ status: 'unavailable', reason: 'insecure_context' });
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationState({ status: 'unavailable', reason: 'unsupported' });
      return;
    }
    setLocationState({ status: 'requesting' });
    const result = await captureLocation(navigator.geolocation);
    setLocationState(result);
  }

  async function handleSubmit() {
    if (!category) return;
    setSubmitting(true);
    setError(null);
    setDiagnostics((prev) => ({
      ...prev,
      requestUrl: `${API_BASE_URL}${buildAlertPath(opaqueId, signature)}`,
      submissionStarted: true,
      fetchAttempted: true,
      responseStatus: null,
      fetchException: null,
      classification: null,
    }));

    try {
      // Only ever attached when the user opted in AND capture actually succeeded — never a
      // stale/leftover value from before the checkbox was toggled off, and never something this
      // function tries to (re-)request itself; capture already happened (or failed, or is still
      // in flight, in which case the submit button is disabled — see the JSX below) the moment
      // the checkbox was checked.
      const location = shareLocation && locationState.status === 'ready' ? locationState.location : undefined;
      // Only reached once the backend has responded 2xx and returned a real alertId — this is
      // the sole path to onDone(), so the confirmation screen can never show before the API has
      // actually created the AlertEvent.
      await submitAlert(opaqueId, signature, { category, note: note.trim() || undefined, location });
      setDiagnostics((prev) => ({ ...prev, responseStatus: 201, classification: 'success' }));
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setDiagnostics((prev) => ({
          ...prev,
          responseStatus: err.status || null,
          fetchException: err.kind === 'network_error' ? err.message : null,
          classification: err.kind,
        }));
        if (err.status === 400) {
          setError({ titleKey: 'rateLimitedTitle', bodyKey: 'errorRateLimited', kind: err.kind });
        } else {
          const copy = ERROR_COPY[err.kind];
          setError({ titleKey: copy.titleKey, bodyKey: copy.bodyKey, kind: err.kind });
        }
      } else {
        // Not an ApiError at all — a genuine bug elsewhere (e.g. a thrown error before fetch was
        // even reached). Never silently reuse a network/CORS message for something unexpected.
        const message = err instanceof Error ? err.message : String(err);
        setDiagnostics((prev) => ({ ...prev, fetchException: message, classification: 'unexpected_exception' }));
        setError({ titleKey: 'serverErrorTitle', bodyKey: 'errorGeneric', kind: 'client' });
      }
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
          disabled={locationState.status === 'requesting'}
          onChange={(e) => void handleShareLocationChange(e.target.checked)}
        />
        <label htmlFor="share-location">{t('shareLocation')}</label>
      </div>
      {shareLocation && locationState.status === 'requesting' && <p className="help-text">{t('locationRequesting')}</p>}
      {shareLocation && locationState.status === 'ready' && <p className="help-text">{t('locationReady')}</p>}
      {shareLocation && locationState.status === 'unavailable' && (
        <p className="help-text" role="status">
          {t('locationUnavailable')} — {t(LOCATION_REASON_COPY[locationState.reason])}
        </p>
      )}
      {error && (
        <div role="alert" className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--color-danger)' }}>{t(error.titleKey)}</p>
          <p style={{ margin: '4px 0 0' }}>{t(error.bodyKey)}</p>
          {error.kind === 'network_error' && (
            <button type="button" className="button button-primary" style={{ marginTop: 8 }} onClick={handleSubmit}>
              {t('retry')}
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className="button button-primary"
        disabled={!category || submitting || locationState.status === 'requesting'}
        onClick={handleSubmit}
      >
        {t('submit')}
      </button>
      <button type="button" className="button button-link" onClick={onCancel}>
        {t('cancel')}
      </button>
      <AlertDevDiagnostics data={diagnostics} />
    </div>
  );
}
