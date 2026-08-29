# Sampark — Local Development

## Prerequisites

- Node.js 20+ and npm 10+
- Docker + Docker Compose
- Flutter SDK 3.22+ (for the mobile app) with Android Studio / Xcode set up
  per Flutter's normal platform setup
- (Optional) `psql`, `redis-cli` for manual inspection

## One-command startup (backend + infra)

```bash
cp services/api/.env.example services/api/.env
cp services/worker/.env.example services/worker/.env
cp apps/scanner-portal/.env.example apps/scanner-portal/.env.local
cp apps/admin/.env.example apps/admin/.env.local

docker compose -f infra/docker/docker-compose.yml up -d   # postgres, redis, minio, mock-providers

npm install
npm run --workspace services/api migration:run
npm run dev:api        # http://localhost:3001
npm run dev:worker      # background jobs
npm run dev:scanner     # http://localhost:3000
npm run dev:admin       # http://localhost:3002
```

Or use the helper script that does all of the above:

```bash
./scripts/dev-up.sh
```

## Mobile app

```bash
cd apps/mobile
flutter pub get
flutter run   # pick a connected device/emulator; API_BASE_URL defaults to
               # http://10.0.2.2:3001 on Android emulator, override via
               # --dart-define=API_BASE_URL=... for a physical device
```

## Seed data

`npm run --workspace services/api seed` loads fictional, clearly-marked
development-only data: a handful of owners, vehicles, tags in various
lifecycle states, and sample alert history, so the scanner portal and
admin console have something to show immediately. See
`services/api/src/database/seeds/`.

## Testing tag activation without a physical tag

`npm run dev:tag` (API must be running) creates one development tag —
`status: issued`, PIN `123456`, opaque ID `deadbeefdeadbeefdeadbeefdeadbeef`
— and prints its real, correctly-signed scanner QR straight to the
terminal. Scan it with the owner app's own Activate Tag camera (not a
generic QR app) and enter `123456` when prompted; it goes through the
exact same `POST /owner/tags/activate` the real activation flow uses —
this is not a shortcut or a parallel code path. Refuses to run at all
when `NODE_ENV=production`. Re-running it resets the tag back to
`issued` (clearing any previous activation), so it's safe to activate
against it repeatedly while testing. See
`services/api/src/database/seeds/dev-tag-qr.ts`.

### Testing on a physical device

By default the printed QR points at `http://localhost:3000` — correct
only when the thing scanning it (a browser, an emulator) runs on the
same machine as the API. A physical phone resolves "localhost" as
*itself*, not your computer, so scanning the default QR from a phone
fails to load (e.g. Safari's "localhost:3000 is not available").

To generate a QR a phone on the same Wi-Fi/LAN can actually reach, set
`SCANNER_BASE_URL` to your machine's LAN IP before running the script:

```bash
# find your LAN IP first:
#   macOS:   ipconfig getifaddr en0
#   Linux:   hostname -I
#   Windows: ipconfig  (look for "IPv4 Address")

SCANNER_BASE_URL=http://192.168.1.8:3000 npm run dev:tag
```

Make sure the scanner portal (`npm run dev:scanner`) is also reachable
at that address (Next.js's dev server listens on all interfaces by
default) and that your phone is on the same network. `SCANNER_BASE_URL`
only affects this one script's printed QR — it is not part of the app's
environment schema (`packages/shared-config/src/env.ts`), so no
production code path reads it, and omitting it keeps the exact same
`localhost` behavior as before.

Getting the phone to *open* the scanner portal is only half of it — the
portal itself then needs to reach the API from the phone's browser. Two
more settings need to point at your LAN IP too:

1. **`apps/scanner-portal/.env.local`** — set
   `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.8:3001/v1` (same LAN IP,
   API's port). Like `SCANNER_BASE_URL` above, Next.js inlines this into
   the client bundle at server-*start* time — after changing it, restart
   `npm run dev:scanner` (or rebuild, for a production build); a browser
   refresh alone keeps serving the old value.
2. **`services/api/.env`** — add the LAN scanner-portal origin to
   `CORS_ALLOWED_ORIGINS`, e.g.
   `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002,http://192.168.1.8:3000`,
   and restart the API. **This step is easy to miss and its failure is
   easy to misread as "the app isn't calling the API at all":** without
   it, the phone's browser blocks the request via CORS — silently, with
   no error on the API's own terminal (there's no access log for a
   rejected preflight). A CORS rejection and a genuinely unreachable API
   produce the exact same `TypeError: Failed to fetch` in JavaScript, by
   browser design, so the scanner portal shows both as "Unable to
   connect to Sampark" with a retry button (see "Error states" below) —
   it cannot tell you which one it was, only that the fetch never
   completed. If you've set `NEXT_PUBLIC_API_BASE_URL` correctly and the
   API terminal shows nothing when you scan, check this setting before
   anything else. `services/api/.env` is loaded automatically (via
   `dotenv`, in `main.ts` and `database/data-source.ts`) — you only need
   to restart the API process after editing it, not export the
   variables into your shell yourself.

### Location sharing over a LAN IP (physical-device testing)

The scanner portal's "Share my location" option (`components/AlertFlow.tsx`) uses the
browser's Geolocation API, which every major browser — including iOS Safari — restricts to
**secure contexts**: pages served over `https://`, plus the special-cased `localhost`/
`127.0.0.1`/`::1` loopback origins. **A page loaded over plain `http://` from a LAN IP (exactly
the `http://192.168.1.8:3000` setup above) is NOT a secure context.** On that origin,
`navigator.geolocation.getCurrentPosition()` fails without ever showing the native permission
prompt at all — this is a browser platform restriction, not an app bug, and no application code
can work around it. `lib/geolocation.ts`'s `isSecureContextForGeolocation()` detects this and the
scanner shows "Location unavailable — send without location" immediately rather than pretending
to ask; the alert can still be sent without a location. To actually test location sharing (and
see the real permission prompt) on a physical device, either serve the scanner portal over HTTPS,
or test from a browser/emulator on the same machine as the API (where `localhost` applies).

### Error states, and reading them without a devtools console

The tag lookup classifies a failure instead of showing "Tag not found"
for everything: a real 404 (an invalid/expired link) says so; a 401/403
shows a distinct "can't be used right now" state; a 5xx says "Sampark is
temporarily unavailable"; a network/CORS failure says "Unable to connect
to Sampark" and offers a retry button; a URL that doesn't even parse into
an opaqueId + signature shows "Invalid link" without ever calling the
API. See `lib/api-client.ts`'s `ApiErrorKind` and
`components/TagScanScreen.tsx`'s `ERROR_COPY` map.

Every screen also renders a **dev-only diagnostics panel** directly on
the page (never in a production build — see
`components/DevDiagnostics.tsx`) showing the configured API base URL,
the exact request URL, whether the lookup started/the fetch was
attempted, the response status, any fetch exception message, and the
final classification. This is meant to make a physical-device failure
observable by just looking at the phone's screen, without needing
Safari's Web Inspector (Settings → Safari → Advanced → Web Inspector,
then a cabled Mac's Develop menu) at all — though that remains available
too, and `lib/api-client.ts` also logs the same information plus a
console warning naming which of the two settings above to check. The
"Send Alert" flow (`components/AlertFlow.tsx`) has its own equivalent
panel with the same idea, plus the HTTP method, and never shows "Alert
sent securely" unless `submitAlert()` actually resolved — a rejected or
unreachable request always renders the same classified error state
instead (see `e2e/alert-submission.spec.ts`).

### "The alert seemed to send, but nothing showed up anywhere" — reading this correctly

A successful `POST /public/tags/:id/alerts` produces **zero terminal
output on the API**, for the same reason a successful tag-lookup `GET`
does (see above): there is no access-log middleware in this codebase at
all, only a logged line for a *thrown* exception. So an empty API
terminal after tapping "Send Alert" is not, by itself, evidence the
request never arrived — check the scanner portal's own on-page
diagnostics panel first (previous section); it distinguishes a real
`network_error`/CORS rejection (fetch never got a response) from a
successful `201`.

If the alert genuinely was created (confirm via `GET
/v1/owner/alerts` once logged in, or `SELECT * FROM alert_events ORDER
BY "createdAt" DESC` in dev), two more things commonly look broken but
aren't:

- **No push/SMS/WhatsApp notification arrived**: every alert queues one
  `AlertDeliveryEntity` row per channel with `status: 'queued'` — moving
  them past "queued" is the **worker** process's job
  (`services/worker`), not the API's. If `npm run dev:worker` isn't
  running, deliveries sit queued forever; this is expected, not a bug.
  With mock providers (the default), check
  `GET http://localhost:3001/v1/dev/simulator` once the worker has run.
- **The alert doesn't show up in the Flutter owner app**: `GET
  /v1/owner/alerts` reads directly from the database and has no
  dependency on the worker or on notification delivery at all — if it's
  missing there too, the far more likely cause is the same class of bug
  as "Testing on a physical device" above, but on the mobile side: the
  owner app defaults to `http://10.0.2.2:3001` (Android emulator only)
  and needs `--dart-define=API_BASE_URL=http://192.168.1.8:3001` (your
  LAN IP) to reach the same API instance a physical-device scanner
  portal is using. An owner app pointed at a different API instance (or
  none reachable at all) will never see an alert created against this
  one, no matter how many times it's retried.

## Test commands

```bash
npm run test                          # unit tests, all TS workspaces
npm run --workspace services/api test:integration   # needs docker (testcontainers)
npm run --workspace services/api test:e2e
npm run --workspace apps/scanner-portal test:e2e     # Playwright, against a production build
npm run --workspace apps/scanner-portal test:e2e:dev # Playwright, against a real `next dev` server —
                                                      # catches dev-only regressions (e.g. a CSP that
                                                      # blocks next dev's own Fast Refresh runtime) that
                                                      # test:e2e can never see
npm run --workspace apps/scanner-portal test:e2e:cors # Playwright, against a real (non-mocked) HTTP
                                                       # response — catches a CORS_ALLOWED_ORIGINS gap
                                                       # like "Testing on a physical device" above;
                                                       # page.route() interception can't test this since
                                                       # it never touches a real response, so CORS is
                                                       # never actually enforced
npm run --workspace apps/scanner-portal test:e2e:alert # Playwright, against a real HTTP response —
                                                        # same idea as test:e2e:cors but for the
                                                        # alert-submission POST specifically: reproduces
                                                        # "the tag lookup GET works but Send Alert
                                                        # silently doesn't reach the backend" and asserts
                                                        # the scanner never shows "Alert sent" for it
npm run --workspace apps/scanner-portal test:e2e:location # Playwright — the "Share my location"
                                                            # checkbox → real Geolocation permission
                                                            # (Playwright's grantPermissions/setGeolocation
                                                            # mocking) → POST body chain, against a real
                                                            # HTTP mock server. Chromium only, not
                                                            # Safari/iOS — see its header comment
npm run --workspace apps/admin test:e2e              # Playwright
cd apps/mobile && flutter test
```

### Diagnosing a failed acknowledge/archive/unarchive on the owner app

Each alert card's Acknowledge/Archive/Unarchive buttons never optimistically update — success is
only ever shown after the real POST resolves and the list is refetched (see
`AlertsController.acknowledge`/`archive`/`unarchive` in
`apps/mobile/lib/features/alerts/providers/alerts_controller.dart`). If one of these shows
"Something went wrong" on a physical device, two things now make the actual cause observable
without a connected debugger:

1. **The `flutter run`/DevTools console** — every caught error goes through `logApiError`
   (`core/network/api_error_logger.dart`), which prints the HTTP method/path, Dio failure type,
   status code, and redacted response body (never a raw phone/token). This used to be silently
   discarded by a bare `catch (_) { ... }`, the same class of bug already fixed for the OTP screens.
2. **An on-card dev diagnostics panel** (debug builds only — `kDebugMode`, never in a release
   build) showing the exact method, URL, whether the request was attempted, response status,
   exception, and classification (`network_error`, `unauthorized`, `server_error`, `client_error`,
   `session_expired`, or `unknown`) for the most recent action on that card. This is the same idea
   as the scanner portal's `DevDiagnostics`/`AlertDevDiagnostics` panels, for the same reason: a
   physical device often has no accessible devtools console.

## Notification simulator (and where OTP codes go in development)

`OTP_PROVIDER=mock` (the `.env.example` default) never sends a real SMS —
there is no telecom account behind it. Instead, every OTP it "sends" goes
to two places, both dev-only:

1. **The API process's own terminal** — `services/api`'s stdout prints a
   line like `[DEV ONLY — mock OTP] code 123456 for +977 98•••••678 (not a
   real SMS)` for every code generated. If you started the API with
   `npm run dev:api` in a terminal tab, this is right there in that tab's
   scrollback.
2. **`GET http://localhost:3001/v1/dev/simulator`** — note the `/v1`
   prefix (the whole API is mounted under it except `/health`). Open that
   URL in a browser or `curl` it; the response lists the most recent mock
   events (OTP, push, SMS, WhatsApp, voice), newest first, so it also
   works if the terminal output already scrolled past.

Both are hard-disabled when `NODE_ENV=production` — this is a
development convenience, not something reachable in a real deployment,
and OTP codes are never included in any other log line or API response
(see `docs/SECURITY.md`).

## Common issues

- **Port already in use**: the compose file uses 5432/6379/9000/9001;
  stop any local Postgres/Redis/MinIO first.
- **Migrations fail on first run**: make sure `docker compose ps` shows
  `postgres` as healthy before running `migration:run`.
- **Flutter can't reach the API from an emulator**: Android emulators
  reach the host via `10.0.2.2`, not `localhost`; iOS simulators can use
  `localhost` directly.
