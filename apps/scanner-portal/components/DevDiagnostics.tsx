'use client';
/**
 * Purpose: On-page (not devtools-console) diagnostics panels, visible
 * directly on a physical device's screen, for the two request lifecycles
 * that need one: tag lookup (DevDiagnostics) and alert submission
 * (AlertDevDiagnostics).
 * Responsibilities: Both render nothing at all when NODE_ENV ===
 * 'production' — neither ever ships to a real scanner. They exist
 * specifically because a physical phone has no accessible devtools
 * console for most people testing this app, so a bug in either lifecycle
 * (wrong API base URL, a CORS rejection, an unexpected status) needs to
 * be observable by just looking at the screen.
 * Security: Every field here is already public/non-sensitive by the time
 * it reaches these components — the API base URL and the opaqueId/
 * signature pair are all already visible in the page's own address bar
 * (that's what the user scanned); the alert category/note/location are
 * never rendered here at all. Neither component must ever be passed an
 * owner phone number, PIN, token, cookie, or any other secret — there is
 * no code path today that has one available at this point in either
 * lifecycle to accidentally pass in.
 * Related: components/TagScanScreen.tsx, components/AlertFlow.tsx,
 * lib/api-client.ts.
 */

function DiagnosticsPanel({ testId, title, rows }: { testId: string; title: string; rows: Array<[string, string]> }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div
      data-testid={testId}
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
      <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>{title}</p>
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
  return (
    <DiagnosticsPanel
      testId="dev-diagnostics"
      title="Dev diagnostics (development only, never shown in production)"
      rows={[
        ['API base URL', data.apiBaseUrl],
        ['Request URL', data.requestUrl],
        ['Opaque ID', data.opaqueId],
        ['Signature', data.signature],
        ['Lookup started', String(data.lookupStarted)],
        ['Fetch attempted', String(data.fetchAttempted)],
        ['Response status', data.responseStatus === null ? '(none)' : String(data.responseStatus)],
        ['Fetch exception', data.fetchException ?? '(none)'],
        ['Classification', data.classification ?? '(pending)'],
      ]}
    />
  );
}

/** Diagnostics for a POST request (alert/emergency submission) — same idea as
 * LookupDiagnostics above but with an HTTP method and "submission started" instead of
 * "lookup started", per the exact fields requested for debugging a physical-device alert
 * submission that appears to do nothing. */
export interface SubmissionDiagnostics {
  method: string;
  requestUrl: string;
  submissionStarted: boolean;
  fetchAttempted: boolean;
  responseStatus: number | null;
  fetchException: string | null;
  classification: string | null;
}

export function AlertDevDiagnostics({ data }: { data: SubmissionDiagnostics }) {
  return (
    <DiagnosticsPanel
      testId="dev-diagnostics-alert"
      title="Alert submission diagnostics (development only, never shown in production)"
      rows={[
        ['HTTP method', data.method],
        ['Request URL', data.requestUrl],
        ['Submission started', String(data.submissionStarted)],
        ['Fetch attempted', String(data.fetchAttempted)],
        ['Response status', data.responseStatus === null ? '(none)' : String(data.responseStatus)],
        ['Fetch exception', data.fetchException ?? '(none)'],
        ['Classification', data.classification ?? '(pending)'],
      ]}
    />
  );
}
