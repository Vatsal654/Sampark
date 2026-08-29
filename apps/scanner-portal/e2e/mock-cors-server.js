/**
 * Purpose: A minimal, dependency-free HTTP server standing in for the
 * real Sampark API's CORS behavior, for e2e/cors.spec.ts.
 * Responsibilities: Mirrors exactly the CORS decision services/api's
 * main.ts makes (app.enableCors({ origin: CORS_ALLOWED_ORIGINS })) —
 * echoes Access-Control-Allow-Origin only when the request's Origin
 * header is in MOCK_CORS_ALLOWED_ORIGINS (comma-separated), otherwise
 * omits it entirely, which is exactly what makes a real browser block
 * the request. Playwright's page.route() intercepts requests at the
 * browser layer and can't reproduce this — CORS is enforced by the
 * browser against a REAL response's headers, so this test needs a real
 * server. Not a mock of tag data/business logic: only the one thing
 * this test needs to be real, the CORS header decision.
 * Related: e2e/cors.spec.ts, playwright.dev.config.ts,
 * services/api/src/main.ts.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS test fixture, run
   directly via `node e2e/mock-cors-server.js` with no build step */
const http = require('http');

const PORT = Number(process.env.MOCK_CORS_PORT || 3001);
const ALLOWED_ORIGINS = (process.env.MOCK_CORS_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const allowed = origin ? ALLOWED_ORIGINS.includes(origin) : false;

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('content-type', 'application/json');
  res.writeHead(200);
  res.end(
    JSON.stringify({
      opaqueId: 'deadbeefdeadbeefdeadbeefdeadbeef',
      status: 'issued',
      vehicleDisplayLabel: null,
      vehicleCategory: null,
      callbackEnabled: false,
      emergencyEnabled: false,
    }),
  );
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console -- test fixture process, stdout is the intended signal
  console.log(`mock-cors-server listening on :${PORT}, allowing origins: ${ALLOWED_ORIGINS.join(', ') || '(none)'}`);
});
