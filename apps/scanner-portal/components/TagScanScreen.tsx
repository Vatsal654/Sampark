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
 * Related: lib/api-client.ts, components/{Alert,Emergency,Callback,Report}Flow.tsx.
 */
import { useEffect, useState } from 'react';
import { useLocale } from './LocaleProvider';
import { LanguageToggle } from './LanguageToggle';
import { AlertFlow } from './AlertFlow';
import { EmergencyFlow } from './EmergencyFlow';
import { CallbackFlow } from './CallbackFlow';
import { ReportFlow } from './ReportFlow';
import { getTag, ApiError } from '../lib/api-client';
import type { TranslationKey } from '../lib/i18n';

type View = 'menu' | 'alert' | 'alert-sent' | 'emergency' | 'emergency-sent' | 'callback' | 'report' | 'report-sent';

interface TagView {
  opaqueId: string;
  status: string;
  vehicleDisplayLabel: string | null;
  callbackEnabled: boolean;
  emergencyEnabled: boolean;
}

export function TagScanScreen({ opaqueId, signature }: { opaqueId: string; signature: string }) {
  const { t } = useLocale();
  const [tag, setTag] = useState<TagView | null | 'not-found'>(null);
  const [view, setView] = useState<View>('menu');

  useEffect(() => {
    let cancelled = false;
    getTag(opaqueId, signature)
      .then((result) => {
        if (!cancelled) setTag(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setTag('not-found');
        else setTag('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [opaqueId, signature]);

  if (tag === null) {
    return (
      <main>
        <p>{t('loading')}</p>
      </main>
    );
  }

  if (tag === 'not-found') {
    return (
      <main>
        <div className="card">
          <h1>{t('tagNotFoundTitle')}</h1>
          <p>{t('tagNotFoundBody')}</p>
        </div>
      </main>
    );
  }

  if (tag.status === 'manufactured' || tag.status === 'issued' || tag.status === 'pending_activation') {
    return (
      <StatusScreen titleKey="tagUnactivatedTitle" bodyKey="tagUnactivatedBody" opaqueId={opaqueId} signature={signature} />
    );
  }
  if (tag.status === 'paused') {
    return <StatusScreen titleKey="tagPausedTitle" bodyKey="tagPausedBody" opaqueId={opaqueId} signature={signature} />;
  }
  if (tag.status === 'revoked' || tag.status === 'reported_lost' || tag.status === 'replaced') {
    return <StatusScreen titleKey="tagUnavailableTitle" bodyKey="tagUnavailableBody" opaqueId={opaqueId} signature={signature} />;
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
    </main>
  );
}

function StatusScreen({
  titleKey,
  bodyKey,
  opaqueId,
  signature,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  opaqueId: string;
  signature: string;
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
