# Sampark Admin Console (`apps/admin`)

Internal operations console for support/ops/fraud/security staff. A
separate deployable from the scanner portal, with its own auth model.

## How auth works here

The admin's bearer token from `POST /v1/admin/auth/login` is **never**
exposed to browser JavaScript. `app/api/session/login/route.ts` exchanges
credentials for that token and stores it in an httpOnly, SameSite=Strict
cookie; every subsequent admin API call goes through
`app/api/admin/[...path]/route.ts`, which reads the cookie server-side and
forwards `Authorization: Bearer <token>` upstream. Mutating requests also
require a matching `x-csrf-token` header against a separate (non-httpOnly)
CSRF cookie set at login — the standard double-submit pattern. See
`docs/SECURITY.md`.

## Running

```bash
cp .env.example .env.local
npm run dev   # http://localhost:3002
```

Dev login: use the seeded demo admin email
(`demo-admin@example-dev.local` — see `services/api` seed script output)
and any 6-digit MFA code (mock SSO, `ADMIN_MOCK_SSO_ENABLED=true` in the
API's dev config).

## Testing

```bash
npm run typecheck
npm run test:e2e
```
