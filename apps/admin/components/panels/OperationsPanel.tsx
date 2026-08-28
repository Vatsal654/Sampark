'use client';
/**
 * Purpose: Read-only monitoring of recent alerts and masked-call
 * sessions, without exposing scanner/owner PII (only IDs and statuses).
 */
import { useEffect, useState } from 'react';
import { adminGet } from '../../lib/admin-client';

interface AlertRow {
  id: string;
  tagId: string;
  category: string;
  severity: string;
  reportedAsAbuse: boolean;
  createdAt: string;
}
interface CallRow {
  id: string;
  tagId: string;
  status: string;
  createdAt: string;
}

export function OperationsPanel() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);

  useEffect(() => {
    adminGet<AlertRow[]>('alerts').then(setAlerts).catch(() => setAlerts([]));
    adminGet<CallRow[]>('calls').then(setCalls).catch(() => setCalls([]));
  }, []);

  return (
    <div className="stack">
      <div className="panel">
        <h2>Recent alerts</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Severity</th>
              <th>Flagged abuse</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.category}</td>
                <td>
                  <span className={a.severity === 'emergency' ? 'badge badge-danger' : 'badge'}>{a.severity}</span>
                </td>
                <td>{a.reportedAsAbuse ? 'Yes' : ''}</td>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={4}>No alerts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Recent masked-call sessions</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>{new Date(c.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={2}>No call sessions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
