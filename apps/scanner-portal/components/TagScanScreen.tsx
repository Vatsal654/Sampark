'use client';
/**
 * Purpose: Orchestrates the scanner portal's entire experience for one
 * scanned tag — resolves the tag, renders the correct unavailable/paused/
 * unactivated state, and switches between the alert/emergency/callback/
 * report sub-flows.
 * Security: Every branch here reflects only the public-safe fields the
 * API returned (packages/api-contracts/src/public.ts) — this component
 * has no code path that could render owner PII because none is ever
 * fetched.
 * Responsibilities: Classifies a failed lookup by ApiErrorKind rather
 * than collapsing every failure into "tag not found" — a 404 (an
 * invalid/expired link, routine and expected), a 401/403, a 5xx, and a
 * network/CORS failure (the browser reports these last two identically,
 * by design) are meaningfully different situations and get different
 * copy; a network failure additionally gets a retry button, since it's
 * the one case actually worth re-attempting without a fresh scan.
 * Related: lib/api-client.ts, components/DevDiagnostics.tsx,
 * components/{Alert,Emergency,Callback,Report}Flow.tsx.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useLocale } from './LocaleProvider';
import { LanguageToggle } from './LanguageToggle';
import { AlertFlow } from './AlertFlow';
import { EmergencyFlow } from './EmergencyFlow';
import { CallbackFlow } from './CallbackFlow';
import { ReportFlow } from './ReportFlow';
import { DevDiagnostics, type LookupDiagnostics } from './DevDiagnostics';
import { getTag, buildPublicTagPath, ApiError, API_BASE_URL, type ApiErrorKind } from '../lib/api-client';
import type { TranslationKey } from '../lib/i18n';

type View = 'menu' | 'alert' | 'alert-sent' | 'emergency' | 'emergency-sent' | 'callback' | 'report' | 'report-sent';

interface TagView {
  opaqueId: string;
  status: string;
  vehicleDisplayLabel: string | null;
  callbackEnabled: boolean;
  emergencyEnabled: boolean;
}

type LookupState = { phase: 'loading' } | { phase: 'success'; tag: TagView } | { phase: 'error'; kind: ApiErrorKind };

const ERROR_COPY: Record<ApiErrorKind, { titleKey: TranslationKey; bodyKey: TranslationKey }> = {
  not_found: { titleKey: 'tagNotFoundTitle', bodyKey: 'tagNotFoundBody' },
  unauthorized: { titleKey: 'unauthorizedTitle', bodyKey: 'unauthorizedBody' },
  server_error: { titleKey: 'serverErrorTitle', bodyKey: 'serverErrorBody' },
  network_error: { titleKey: 'networkErrorTitle', bodyKey: 'networkErrorBody' },
};

export function TagScanScreen({ opaqueId, signature }: { opaqueId: string; signature: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<LookupState>({ phase: 'loading' });
  const [view, setView] = useState<View>('menu');
  const [retryCount, setRetryCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<LookupDiagnostics>(() => ({
    apiBaseUrl: API_BASE_URL,
    requestUrl: `${API_BASE_URL}${buildPublicTagPath(opaqueId, signature)}`,
    opaqueId,
    signature,
    lookupStarted: false,
    fetchAttempted: false,
    responseStatus: null,
    fetchException: null,
    classification: null,
  }));

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    setDiagnostics((prev) => ({
      ...prev,
      requestUrl: `${API_BASE_URL}${buildPublicTagPath(opaqueId, signature)}`,
      lookupStarted: true,
      fetchAttempted: true,
      responseStatus: null,
      fetchException: null,
      classification: null,
    }));

    getTag(opaqueId, signature)
      .then((result) => {
        if (cancelled) return;
        setState({ phase: 'success', tag: result });
        setDiagnostics((prev) => ({ ...prev, responseStatus: 200, classification: 'success' }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setState({ phase: 'error', kind: err.kind });
          setDiagnostics((prev) => ({
            ...prev,
            responseStatus: err.status || null,
            fetchException: err.kind === 'network_error' ? err.message : null,
            classification: err.kind,
          }));
        } else {
          // Not an ApiError at all — a genuine bug elsewhere (e.g. a thrown error before fetch
          // was even reached). Never silently reuse "not found" for something unexpected.
          const message = err instanceof Error ? err.message : String(err);
          setState({ phase: 'error', kind: 'server_error' });
          setDiagnostics((prev) => ({ ...prev, fetchException: message, classification: 'unexpected_exception' }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [opaqueId, signature, retryCount]);

  const diagnosticsPanel = <DevDiagnostics data={diagnostics} />;

  if (state.phase === 'loading') {
    return (
      <main>
        <p>{t('loading')}</p>
        {diagnosticsPanel}
      </main>
    );
  }

  if (state.phase === 'error') {
    const { titleKey, bodyKey } = ERROR_COPY[state.kind];
    return (
      <main>
        <div className="card">
          <h1>{t(titleKey)}</h1>
          <p>{t(bodyKey)}</p>
        </div>
        {state.kind === 'network_error' && (
          <button type="button" className="button button-primary" onClick={() => setRetryCount((n) => n + 1)}>
            {t('retry')}
          </button>
        )}
        {diagnosticsPanel}
      </main>
    );
  }

  const tag = state.tag;

  if (tag.status === 'manufactured' || tag.status === 'issued' || tag.status === 'pending_activation') {
    return (
      <StatusScreen titleKey="tagUnactivatedTitle" bodyKey="tagUnactivatedBody" opaqueId={opaqueId} signature={signature} diagnostics={diagnosticsPanel} />
    );
  }
  if (tag.status === 'paused') {
    return <StatusScreen titleKey="tagPausedTitle" bodyKey="tagPausedBody" opaqueId={opaqueId} signature={signature} diagnostics={diagnosticsPanel} />;
  }
  if (tag.status === 'revoked' || tag.status === 'reported_lost' || tag.status === 'replaced') {
    return <StatusScreen titleKey="tagUnavailableTitle" bodyKey="tagUnavailableBody" opaqueId={opaqueId} signature={signature} diagnostics={diagnosticsPanel} />;
  }

  return (
    <main>
      <LanguageToggle />
      <h1>Sampark</h1>
      <p>{t('appIntro')}</p>

      {view === 'menu' && (
        <>
          <div className="card">
            <h2>{tag.vehicleDisplayLabel ?? t('vehicleLabelFallback')}</h2>
            <p className="help-text">{t('privacyExplainer')}</p>
          </div>

          <div className="stack">
            <button type="button" className="button button-primary" onClick={() => setView('alert')}>
              {t('sendAlert')}
            </button>
            {tag.callbackEnabled && (
              <button type="button" className="button button-secondary" onClick={() => setView('callback')}>
                {t('requestCallback')}
              </button>
            )}
            {tag.emergencyEnabled && (
              <button type="button" className="button button-danger" onClick={() => setView('emergency')}>
                {t('emergency')}
              </button>
            )}
            <button type="button" className="button button-link" onClick={() => setView('report')}>
              {t('reportTag')}
            </button>
          </div>
        </>
      )}

      {view === 'alert' && (
        <AlertFlow opaqueId={opaqueId} signature={signature} onDone={() => setView('alert-sent')} onCancel={() => setView('menu')} />
      )}
      {view === 'alert-sent' && <SentScreen titleKey="alertSentTitle" bodyKey="alertSentBody" onBack={() => setView('menu')} />}

      {view === 'emergency' && (
        <EmergencyFlow opaqueId={opaqueId} signature={signature} onDone={() => setView('emergency-sent')} onCancel={() => setView('menu')} />
      )}
      {view === 'emergency-sent' && <SentScreen titleKey="alertSentTitle" bodyKey="alertSentBody" onBack={() => setView('menu')} />}

      {view === 'callback' && (
        <CallbackFlow opaqueId={opaqueId} signature={signature} onDone={() => setView('menu')} onCancel={() => setView('menu')} />
      )}

      {view === 'report' && (
        <ReportFlow opaqueId={opaqueId} signature={signature} onDone={() => setView('report-sent')} onCancel={() => setView('menu')} />
      )}
      {view === 'report-sent' && <SentScreen titleKey="reportSent" bodyKey="reportSent" onBack={() => setView('menu')} />}
      {diagnosticsPanel}
    </main>
  );
}

function StatusScreen({
  titleKey,
  bodyKey,
  opaqueId,
  signature,
  diagnostics,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  opaqueId: string;
  signature: string;
  diagnostics?: ReactNode;
}) {
  const { t } = useLocale();
  const [reporting, setReporting] = useState(false);
  return (
    <main>
      <LanguageToggle />
      <div className="card">
        <h1>{t(titleKey)}</h1>
        <p>{t(bodyKey)}</p>
      </div>
      {!reporting ? (
        <button type="button" className="button button-link" onClick={() => setReporting(true)}>
          {t('reportTag')}
        </button>
      ) : (
        <ReportFlow opaqueId={opaqueId} signature={signature} onDone={() => setReporting(false)} onCancel={() => setReporting(false)} />
      )}
      {diagnostics}
    </main>
  );
}

function SentScreen({
  titleKey,
  bodyKey,
  onBack,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  onBack: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="card stack">
      <h2>{t(titleKey)}</h2>
      <p>{t(bodyKey)}</p>
      <button type="button" className="button button-secondary" onClick={onBack}>
        {t('backHome')}
      </button>
    </div>
  );
}
