/**
 * Purpose: A minimal, dependency-free HTTP server standing in for the
 * real Sampark API's tag-lookup and alert-submission routes, for
 * e2e/alert-submission.spec.ts.
 * Responsibilities: Serves an "active" tag for GET
 * /v1/public/tags/:id (allowed for every origin in
 * MOCK_ALERT_LOOKUP_ALLOWED_ORIGINS, so the tag page always loads and
 * "Send Alert" is reachable), but only allows POST
 * /v1/public/tags/:id/alerts for origins in the narrower
 * MOCK_ALERT_SUBMIT_ALLOWED_ORIGINS — reproducing, with a real browser
 * and a real HTTP response (not page.route() interception, which never
 * touches CORS enforcement at all), the exact bug this regresses: the
 * scanner portal's tag lookup succeeds and the page loads normally, but
 * the alert-submission POST from the same page is silently blocked by
 * CORS with no server-side trace. See e2e/alert-submission.spec.ts for
 * which origin exercises which case.
 * Related: playwright.alert.config.ts, services/api/src/main.ts,
 * services/api/src/modules/public-tag.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS test fixture, run
   directly via `node e2e/mock-alert-server.js` with no build step */
const http = require('http');

const PORT = Number(process.env.MOCK_ALERT_PORT || 3001);
const LOOKUP_ALLOWED = (process.env.MOCK_ALERT_LOOKUP_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const SUBMIT_ALLOWED = (process.env.MOCK_ALERT_SUBMIT_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const isAlertsRoute = /\/alerts(\?|$)/.test(req.url || '');
  const allowList = isAlertsRoute ? SUBMIT_ALLOWED : LOOKUP_ALLOWED;
  const allowed = origin ? allowList.includes(origin) : false;

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
  }

  if (req.method === 'OPTIONS') {
    // A real, unconfigured-CORS backend still answers the preflight OPTIONS itself (NestJS's
    // `cors` middleware always sends 204) — it just omits Access-Control-Allow-Origin when the
    // origin isn't allowed, which is what the browser actually acts on.
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('content-type', 'application/json');

  if (req.method === 'POST' && isAlertsRoute) {
    res.writeHead(201);
    res.end(JSON.stringify({ alertId: 'mock-alert-id-0001', acknowledged: true }));
    return;
  }

  res.writeHead(200);
  res.end(
    JSON.stringify({
      opaqueId: 'deadbeefdeadbeefdeadbeefdeadbeef',
      status: 'active',
      vehicleDisplayLabel: 'Mock Test Vehicle',
      vehicleCategory: 'car',
      callbackEnabled: false,
      emergencyEnabled: false,
    }),
  );
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console -- test fixture process, stdout is the intended signal
  console.log(
    `mock-alert-server listening on :${PORT}, lookup origins: ${LOOKUP_ALLOWED.join(', ') || '(none)'}, submit origins: ${SUBMIT_ALLOWED.join(', ') || '(none)'}`,
  );
});
