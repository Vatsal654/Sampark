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

## Test commands

```bash
npm run test                          # unit tests, all TS workspaces
npm run --workspace services/api test:integration   # needs docker (testcontainers)
npm run --workspace services/api test:e2e
npm run --workspace apps/scanner-portal test:e2e     # Playwright
npm run --workspace apps/admin test:e2e              # Playwright
cd apps/mobile && flutter test
```

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
