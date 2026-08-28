'use client';
/**
 * Purpose: Admin login screen — mock SSO email + 6-digit MFA code.
 * Security: Posts to this app's own /api/session/login BFF route, which
 * is the only place the admin's bearer token is ever handled — this
 * component never sees it (docs/SECURITY.md "Admin break-glass").
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo-admin@example-dev.local');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, mfaCode }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Login failed' }));
        setError(body.message ?? 'Login failed');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Could not reach the API. Is it running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 style={{ fontSize: '1.15rem', marginTop: 0 }}>Sampark Admin</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Development mock SSO — any 6-digit code is accepted for a seeded admin account.
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="mfa">MFA code</label>
          <input
            id="mfa"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="button" style={{ width: '100%' }} disabled={submitting || mfaCode.length !== 6}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
