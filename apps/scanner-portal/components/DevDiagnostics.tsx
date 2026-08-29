'use client';
/**
 * Purpose: An on-page (not devtools-console) diagnostics panel for the
 * tag-lookup lifecycle, visible directly on a physical device's screen.
 * Responsibilities: Renders nothing at all when NODE_ENV === 'production'
 * — this never ships to a real scanner. It exists specifically because a
 * physical phone has no accessible devtools console for most people
 * testing this app, so a bug in the lookup (wrong API base URL, a CORS
 * rejection, an unexpected status) needs to be observable by just
 * looking at the screen.
 * Security: Every field here is already public/non-sensitive by the time
 * it reaches this component — the API base URL and the opaqueId/
 * signature pair are all already visible in the page's own address bar
 * (that's what the user scanned). This component must never be passed
 * an owner phone number, PIN, token, cookie, or any other secret — there
 * is no code path today that has one available at this point in the
 * lifecycle to accidentally pass in.
 * Related: components/TagScanScreen.tsx, lib/api-client.ts.
 */

export interface LookupDiagnostics {
  apiBaseUrl: string;
  requestUrl: string;
  opaqueId: string;
  signature: string;
  lookupStarted: boolean;
  fetchAttempted: boolean;
  responseStatus: number | null;
  fetchException: string | null;
  classification: string | null;
}

export function DevDiagnostics({ data }: { data: LookupDiagnostics }) {
  if (process.env.NODE_ENV === 'production') return null;

  const rows: Array<[string, string]> = [
    ['API base URL', data.apiBaseUrl],
    ['Request URL', data.requestUrl],
    ['Opaque ID', data.opaqueId],
    ['Signature', data.signature],
    ['Lookup started', String(data.lookupStarted)],
    ['Fetch attempted', String(data.fetchAttempted)],
    ['Response status', data.responseStatus === null ? '(none)' : String(data.responseStatus)],
    ['Fetch exception', data.fetchException ?? '(none)'],
    ['Classification', data.classification ?? '(pending)'],
  ];

  return (
    <div
      data-testid="dev-diagnostics"
      style={{
        marginTop: 24,
        padding: 12,
        border: '1px dashed #999',
        borderRadius: 8,
        background: '#fafafa',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#333',
        wordBreak: 'break-all',
      }}
    >
      <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>Dev diagnostics (development only, never shown in production)</p>
      <dl style={{ margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <dt style={{ flex: '0 0 140px', fontWeight: 'bold' }}>{label}</dt>
            <dd style={{ margin: 0, flex: 1 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
