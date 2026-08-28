'use client';
/**
 * Purpose: Admin console shell — sidebar navigation between the
 * operational panels, all data-fetched through this app's own
 * `/api/admin/*` proxy (never directly against the backend).
 * Related: components/panels/*, middleware.ts.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TagsPanel } from '../../components/panels/TagsPanel';
import { OperationsPanel } from '../../components/panels/OperationsPanel';
import { AbusePanel } from '../../components/panels/AbusePanel';
import { FeatureFlagsPanel } from '../../components/panels/FeatureFlagsPanel';
import { AuditPanel } from '../../components/panels/AuditPanel';
import { SupportPanel } from '../../components/panels/SupportPanel';

const SECTIONS = [
  { key: 'tags', label: 'Tags', Component: TagsPanel },
  { key: 'operations', label: 'Alerts & calls', Component: OperationsPanel },
  { key: 'abuse', label: 'Abuse & block list', Component: AbusePanel },
  { key: 'flags', label: 'Feature flags', Component: FeatureFlagsPanel },
  { key: 'audit', label: 'Audit log', Component: AuditPanel },
  { key: 'support', label: 'Support tickets', Component: SupportPanel },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('tags');
  const ActiveComponent = SECTIONS.find((s) => s.key === active)?.Component ?? TagsPanel;

  async function handleLogout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Sampark Admin</h1>
        <nav>
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              aria-current={active === section.key}
              onClick={() => setActive(section.key)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <button type="button" onClick={handleLogout} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '10px 8px' }}>
          Sign out
        </button>
      </aside>
      <main className="content">
        <ActiveComponent />
      </main>
    </div>
  );
}
