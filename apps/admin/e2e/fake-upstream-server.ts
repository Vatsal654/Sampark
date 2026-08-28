/**
 * Purpose: Minimal in-memory stand-in for the real Sampark API, used only
 * by the admin console's Playwright suite. The admin's `/api/admin/*`
 * proxy route runs real server-side `fetch()` calls (Playwright's
 * page.route cannot intercept those — it only sees browser requests), so
 * a real HTTP server is needed here rather than network mocking.
 * Responsibilities: Implements just enough of the `/v1/admin/*` surface
 * (see docs/API.md) to exercise the dashboard panels and the mock-SSO
 * login flow.
 */
import { createServer, type Server } from 'node:http';

export function startFakeUpstream(port: number): Server {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      const url = req.url ?? '';
      const method = req.method ?? 'GET';

      if (method === 'POST' && url === '/v1/admin/auth/login') {
        res.writeHead(201);
        res.end(JSON.stringify({ accessToken: 'fake-admin-access-token', expiresAt: new Date(Date.now() + 1800_000).toISOString() }));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/tags') {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 't1', opaqueId: 'aaaa1111', status: 'active', ownerIdMasked: '1234abcd…', createdAt: new Date().toISOString() }]));
        return;
      }
      if (method === 'POST' && url === '/v1/admin/tags/issue') {
        res.writeHead(201);
        res.end(JSON.stringify({ issued: [{ opaqueId: 'newtag123', activationPin: '654321' }] }));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/alerts') {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'a1', tagId: 't1', category: 'lights_on', severity: 'normal', reportedAsAbuse: false, createdAt: new Date().toISOString() }]));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/calls') {
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/abuse-reports') {
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }
      if (method === 'POST' && url === '/v1/admin/block-list') {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'block1' }));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/feature-flags') {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            { key: 'document_vault', enabled: true, envCapabilityEnabled: true, updatedAt: new Date().toISOString(), updatedByAdminId: null },
            { key: 'live_call_bridging', enabled: false, envCapabilityEnabled: false, updatedAt: new Date().toISOString(), updatedByAdminId: null },
          ]),
        );
        return;
      }
      if (method === 'POST' && url?.startsWith('/v1/admin/feature-flags/')) {
        res.writeHead(201);
        res.end(JSON.stringify({ key: 'document_vault', enabled: true }));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/audit-events') {
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }
      if (method === 'GET' && url === '/v1/admin/support-tickets') {
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ message: 'not found in fake upstream' }));
    });
  });
  server.listen(port);
  return server;
}
