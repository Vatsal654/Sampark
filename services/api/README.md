# Sampark API (`services/api`)

NestJS backend — the system of record for every domain entity, and the
only process that holds provider credentials, encryption keys, and
database access.

## Layout

```
src/
  main.ts, app.module.ts        bootstrap + module wiring
  config/                       env config provider (APP_CONFIG)
  database/
    entities/                   TypeORM entities (one file per domain group)
    migrations/                 hand-written, reviewable SQL migrations
    seeds/                      fictional dev-only seed data
    data-source.ts               CLI data source for migrations
  common/
    guards/                     JwtAuthGuard, AdminAuthGuard, PermissionsGuard
    decorators/                 CurrentUser, CurrentAdmin, RequirePermission
    pipes/                      ZodValidationPipe
    filters/                    RedactedExceptionFilter
    rate-limit/                 Redis sliding-window limiter
    audit/                      append-only AuditService
    queue/                      BullMQ queue registration
    redis/                      shared ioredis client
  modules/
    auth/                       owner phone-OTP auth + sessions
    vehicles/, tags/             owner vehicle + tag lifecycle
    public-tag/                  unauthenticated scanner-facing endpoints
    alerts/                      owner alert inbox
    emergency/                   emergency profile/contacts + scanner card
    documents/                   secure document vault
    privacy/                     consents, data export, account deletion
    no-tag-lookup/               disabled-by-default lookup scaffold
    providers/                   OtpProvider interface + mock/unimplemented
    admin/                       admin console API (RBAC, flags, audit, break-glass)
    webhooks/                    signed provider webhook intake
    health/                      liveness/readiness
```

## Running

See `docs/LOCAL_DEVELOPMENT.md` for the full stack. In isolation:

```bash
cp .env.example .env
npm run migration:run
npm run start:dev
```

OpenAPI docs at `http://localhost:3001/docs` (dev only).

## Testing

```bash
npm run test               # unit tests (no external deps)
npm run test:integration   # Postgres + Redis via testcontainers
npm run test:e2e           # full HTTP flows against a real DB
```
