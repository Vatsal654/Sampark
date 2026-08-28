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

## Test commands

```bash
npm run test                          # unit tests, all TS workspaces
npm run --workspace services/api test:integration   # needs docker (testcontainers)
npm run --workspace services/api test:e2e
npm run --workspace apps/scanner-portal test:e2e     # Playwright
npm run --workspace apps/admin test:e2e              # Playwright
cd apps/mobile && flutter test
```

## Notification simulator

With the stack running, open `http://localhost:3001/dev/simulator` (dev
builds only, disabled when `NODE_ENV=production`) to see every mock
push/SMS/WhatsApp/voice event the worker "sends", useful for demoing the
masked-call and alert-delivery flows without real phones.

## Common issues

- **Port already in use**: the compose file uses 5432/6379/9000/9001;
  stop any local Postgres/Redis/MinIO first.
- **Migrations fail on first run**: make sure `docker compose ps` shows
  `postgres` as healthy before running `migration:run`.
- **Flutter can't reach the API from an emulator**: Android emulators
  reach the host via `10.0.2.2`, not `localhost`; iOS simulators can use
  `localhost` directly.
