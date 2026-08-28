'use client';
/**
 * Purpose: Append-only audit log viewer.
 */
import { useEffect, useState } from 'react';
import { adminGet } from '../../lib/admin-client';

interface AuditRow {
  id: string;
  actorType: string;
  actorIdMasked: string | null;
  action: string;
  targetType: string;
  targetIdMasked: string | null;
  reason: string | null;
  createdAt: string;
}

export function AuditPanel() {
  const [events, setEvents] = useState<AuditRow[]>([]);
  useEffect(() => {
    adminGet<AuditRow[]>('audit-events').then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <div className="panel">
      <h2>Audit log</h2>
      <table>
        <thead>
          <tr>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Reason</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>
                {e.actorType}
                {e.actorIdMasked ? ` (${e.actorIdMasked})` : ''}
              </td>
              <td>{e.action}</td>
              <td>
                {e.targetType}
                {e.targetIdMasked ? ` (${e.targetIdMasked})` : ''}
              </td>
              <td>{e.reason ?? '—'}</td>
              <td>{new Date(e.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={5}>No audit events yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
