'use client';
/**
 * Purpose: Tag inventory view + issuance form (product spec §11).
 * Related: services/api admin.controller.ts tags routes.
 */
import { useEffect, useState } from 'react';
import { adminGet, adminPost, AdminApiError } from '../../lib/admin-client';

interface TagRow {
  id: string;
  opaqueId: string;
  status: string;
  ownerIdMasked: string | null;
  createdAt: string;
}

export function TagsPanel() {
  const [tags, setTags] = useState<TagRow[] | null>(null);
  const [batchReference, setBatchReference] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [issued, setIssued] = useState<Array<{ opaqueId: string; activationPin: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    adminGet<TagRow[]>('tags').then(setTags).catch(() => setTags([]));
  }

  useEffect(refresh, []);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await adminPost<{ issued: Array<{ opaqueId: string; activationPin: string }> }>('tags/issue', {
        batchReference,
        quantity,
      });
      setIssued(result.issued);
      refresh();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to issue tags');
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Issue a new batch</h2>
        <form onSubmit={handleIssue} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="batch">Batch reference</label>
            <input id="batch" value={batchReference} onChange={(e) => setBatchReference(e.target.value)} required />
          </div>
          <div className="field" style={{ width: 100 }}>
            <label htmlFor="qty">Quantity</label>
            <input id="qty" type="number" min={1} max={1000} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <button type="submit" className="button">Issue</button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {issued && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Issued {issued.length} tag(s). Activation PINs are shown once here and must be shipped with the
            physical tag — they are not retrievable later.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Tag inventory</h2>
        <table>
          <thead>
            <tr>
              <th>Opaque ID</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {(tags ?? []).map((tag) => (
              <tr key={tag.id}>
                <td>{tag.opaqueId}</td>
                <td><span className="badge">{tag.status}</span></td>
                <td>{tag.ownerIdMasked ?? '—'}</td>
                <td>{new Date(tag.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {tags?.length === 0 && (
              <tr>
                <td colSpan={4}>No tags yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
