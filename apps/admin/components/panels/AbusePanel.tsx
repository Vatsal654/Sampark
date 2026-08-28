'use client';
/**
 * Purpose: Abuse-report review queue and block-list management.
 */
import { useEffect, useState } from 'react';
import { adminGet, adminPost, AdminApiError } from '../../lib/admin-client';

interface AbuseReport {
  id: string;
  reason: string;
  note: string | null;
  reviewStatus: string;
  createdAt: string;
}

export function AbusePanel() {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [identityType, setIdentityType] = useState<'phone' | 'device_fingerprint' | 'ip_range'>('phone');
  const [identity, setIdentity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    adminGet<AbuseReport[]>('abuse-reports').then(setReports).catch(() => setReports([]));
  }, []);

  async function handleBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      await adminPost('block-list', { identityType, identity, reason });
      setSuccess(true);
      setIdentity('');
      setReason('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to block identity');
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Block an identity</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Stored as a keyed hash — the raw value you enter here is never persisted in plaintext.
        </p>
        <form onSubmit={handleBlock} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field">
            <label htmlFor="identity-type">Type</label>
            <select id="identity-type" value={identityType} onChange={(e) => setIdentityType(e.target.value as typeof identityType)}>
              <option value="phone">Phone number</option>
              <option value="device_fingerprint">Device fingerprint</option>
              <option value="ip_range">IP range</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="identity-value">Value</label>
            <input id="identity-value" value={identity} onChange={(e) => setIdentity(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="block-reason">Reason (min 10 chars)</label>
            <input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} />
          </div>
          <button type="submit" className="button button-danger">Block</button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {success && <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Blocked.</p>}
      </div>

      <div className="panel">
        <h2>Abuse reports</h2>
        <table>
          <thead>
            <tr>
              <th>Reason</th>
              <th>Note</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.reason}</td>
                <td>{r.note ?? '—'}</td>
                <td><span className="badge">{r.reviewStatus}</span></td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={4}>No abuse reports yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
