'use client';
/**
 * Purpose: Feature-flag control panel. Toggling a flag on requires both
 * the underlying provider capability (env-level) to be configured AND a
 * typed reason — see services/api admin.service.ts#updateFeatureFlag.
 */
import { useEffect, useState } from 'react';
import { adminGet, adminPost, AdminApiError } from '../../lib/admin-client';

interface FlagRow {
  key: string;
  enabled: boolean;
  envCapabilityEnabled: boolean;
  updatedAt: string;
  updatedByAdminId: string | null;
}

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  function refresh() {
    adminGet<FlagRow[]>('feature-flags').then(setFlags).catch(() => setFlags([]));
  }
  useEffect(refresh, []);

  async function handleToggle(key: string, nextEnabled: boolean) {
    if (!reason || reason.length < 10) {
      setError('Enter a reason (min 10 characters) before changing a flag.');
      setPendingKey(key);
      return;
    }
    setError(null);
    try {
      await adminPost(`feature-flags/${key}`, { enabled: nextEnabled, reason });
      setReason('');
      setPendingKey(null);
      refresh();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to update flag');
    }
  }

  return (
    <div className="panel">
      <h2>Feature flags</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
        A flag can only be enabled if its underlying provider capability is configured for this
        deployment (the "Capability" column) — see docs/DECISIONS.md.
      </p>
      <div className="field">
        <label htmlFor="flag-reason">Reason for next change</label>
        <input id="flag-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Enabling for pilot cohort per ops review" />
      </div>
      {error && <p className="error-text">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Enabled</th>
            <th>Capability</th>
            <th>Last updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.key}>
              <td>{flag.key}</td>
              <td><span className={flag.enabled ? 'badge' : 'badge badge-danger'}>{flag.enabled ? 'on' : 'off'}</span></td>
              <td>{flag.envCapabilityEnabled ? 'configured' : 'not configured'}</td>
              <td>{flag.updatedByAdminId ? new Date(flag.updatedAt).toLocaleString() : '—'}</td>
              <td>
                <button
                  type="button"
                  className="button"
                  disabled={!flag.envCapabilityEnabled && !flag.enabled}
                  onClick={() => handleToggle(flag.key, !flag.enabled)}
                >
                  {flag.enabled ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
