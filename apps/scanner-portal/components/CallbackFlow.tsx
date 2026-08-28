'use client';
/**
 * Purpose: Masked-callback request flow — the only scanner action that
 * requires the scanner's own phone number, and only after OTP
 * verification and explicit consent (product spec §5D).
 * Security: The scanner's phone number lives only in this component's
 * local state and the request bodies sent to the API — never written to
 * localStorage, never logged, never included in a URL.
 * Related: lib/api-client.ts (requestCallOtp/verifyCallOtp/requestMaskedCall).
 */
import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { requestCallOtp, verifyCallOtp, requestMaskedCall, ApiError } from '../lib/api-client';

type Step = 'phone' | 'otp' | 'consent' | 'done';

function normalizeNepaliPhoneClientSide(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, '');
  let candidate: string;
  if (stripped.startsWith('+977')) candidate = stripped;
  else if (stripped.startsWith('977')) candidate = `+${stripped}`;
  else if (stripped.startsWith('0')) candidate = `+977${stripped.slice(1)}`;
  else if (/^9\d{9}$/.test(stripped)) candidate = `+977${stripped}`;
  else return null;
  return /^\+977[9]\d{9}$/.test(candidate) ? candidate : null;
}

export function CallbackFlow({
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
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [scanSessionToken, setScanSessionToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = normalizeNepaliPhoneClientSide(phoneInput);

  async function handleSendCode() {
    if (!normalizedPhone) return;
    setBusy(true);
    setError(null);
    try {
      await requestCallOtp(opaqueId, signature, normalizedPhone);
      setStep('otp');
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!normalizedPhone || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyCallOtp(opaqueId, signature, normalizedPhone, code);
      setScanSessionToken(result.scanSessionToken);
      setStep('consent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestCall() {
    if (!scanSessionToken || !consent) return;
    setBusy(true);
    setError(null);
    try {
      await requestMaskedCall(opaqueId, signature, scanSessionToken);
      setStep('done');
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="card stack">
        <h2>{t('callRequested')}</h2>
        <p>{t('callRequestedBody')}</p>
        <button type="button" className="button button-secondary" onClick={onDone}>
          {t('backHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="card stack">
      <h2>{t('requestCallback')}</h2>

      {step === 'phone' && (
        <>
          <div>
            <label htmlFor="scanner-phone">{t('phoneNumberLabel')}</label>
            <input
              id="scanner-phone"
              type="tel"
              inputMode="tel"
              placeholder="98XXXXXXXX"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <p className="help-text">{t('phoneNumberHelp')}</p>
          </div>
          {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="button" className="button button-primary" disabled={!normalizedPhone || busy} onClick={handleSendCode}>
            {t('sendCode')}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <div>
            <label htmlFor="otp-code">{t('enterCode')}</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="button" className="button button-primary" disabled={code.length !== 6 || busy} onClick={handleVerify}>
            {t('submit')}
          </button>
        </>
      )}

      {step === 'consent' && (
        <>
          <div className="checkbox-row">
            <input id="call-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <label htmlFor="call-consent">{t('callConsent')}</label>
          </div>
          {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="button" className="button button-primary" disabled={!consent || busy} onClick={handleRequestCall}>
            {t('requestCallback')}
          </button>
        </>
      )}

      <button type="button" className="button button-link" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}
