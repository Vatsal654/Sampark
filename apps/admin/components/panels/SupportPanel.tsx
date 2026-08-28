'use client';
/**
 * Purpose: Support ticket queue (read-only listing in this reference
 * implementation — assignment/resolution workflow is a natural next
 * addition once real support volume exists).
 */
import { useEffect, useState } from 'react';
import { adminGet } from '../../lib/admin-client';

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

export function SupportPanel() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  useEffect(() => {
    adminGet<TicketRow[]>('support-tickets').then(setTickets).catch(() => setTickets([]));
  }, []);

  return (
    <div className="panel">
      <h2>Support tickets</h2>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.subject}</td>
              <td><span className="badge">{t.status}</span></td>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={3}>No support tickets yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
