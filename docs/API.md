# Sampark — API Overview

Full machine-readable OpenAPI spec is served by the running API at
`GET /docs-json` (Swagger UI at `GET /docs`, dev/staging only — disabled by
default in production via `SWAGGER_ENABLED=false`).

Base URL (local dev): `http://localhost:3001/v1`

All request/response shapes are additionally defined as zod schemas + TS
types in `packages/api-contracts/src`, imported by the API, the scanner
portal, and the admin console so client and server never drift.

## Auth model summary

| Audience | Mechanism | Token lifetime |
|---|---|---|
| Owner (mobile app) | Phone OTP → JWT access + rotating refresh | Access 15 min, refresh 30 days |
| Scanner (public portal) | None for alerts; OTP-issued `scan_session` for calls | `scan_session` 10 min, single action |
| Admin (console) | SSO + TOTP MFA → session cookie | 30 min, step-up for sensitive actions |
| Provider webhooks | HMAC signature + timestamp + idempotency key | N/A (per-request) |

## Endpoint groups

### Public / scanner (`/v1/public/*`) — no auth required
- `GET /public/tags/:opaqueId?sig=...` — resolve a scanned tag to its
  public-safe display payload (label, status, available actions). Never
  returns owner PII. 404-shaped response for both "unknown" and
  "invalid signature".
- `POST /public/tags/:opaqueId/alerts` — submit a predefined-category alert.
  Body: `{ category, note?, location? }`. Rate-limited, no auth.
- `POST /public/tags/:opaqueId/emergency` — submit an emergency alert.
- `POST /public/tags/:opaqueId/call/otp` — request OTP to a scanner-provided
  number before requesting a masked call.
- `POST /public/tags/:opaqueId/call/verify` — verify the OTP, receive a
  `scan_session` token.
- `POST /public/tags/:opaqueId/call/request` — start a masked call session
  (requires `scan_session`).
- `POST /public/tags/:opaqueId/report` — report a damaged/suspicious tag.

### Owner auth (`/v1/auth/*`)
- `POST /auth/otp/request` — `{ phoneE164 }`, always returns a generic
  acknowledgement regardless of registration status.
- `POST /auth/otp/verify` — `{ phoneE164, code }` → access + refresh token
  pair, creates the user record on first successful verification.
- `POST /auth/refresh` — rotate a refresh token.
- `POST /auth/logout` — revoke the current session.
- `POST /auth/logout-all` — revoke every session for the authenticated user.
- `GET /auth/sessions` — list active sessions/devices.

### Owner (`/v1/owner/*`) — JWT required, ownership-scoped
- `GET/POST /owner/vehicles`, `GET/PATCH/DELETE /owner/vehicles/:id`
- `POST /owner/tags/activate`, `POST /owner/tags/:id/pause`,
  `POST /owner/tags/:id/resume`, `POST /owner/tags/:id/report-lost`,
  `POST /owner/tags/:id/replace`, `POST /owner/tags/:id/reassign`
- `GET/PUT /owner/notification-preferences`
- `GET /owner/alerts`, `POST /owner/alerts/:id/acknowledge`,
  `POST /owner/alerts/:id/archive`, `POST /owner/alerts/:id/report-abuse`
- `GET/PUT /owner/emergency-profile`, `GET/POST/DELETE /owner/emergency-contacts`
- `GET/POST /owner/documents`, `DELETE /owner/documents/:id`,
  `GET /owner/documents/:id/url` (short-lived signed URL),
  `POST /owner/documents/:id/share` (inspector share code)
- `GET /owner/privacy/export`, `POST /owner/privacy/delete-account`
- `POST /owner/consents`
- `GET/POST /owner/orders` — tag orders, payment behind a mocked adapter
  (`FEATURE_REAL_PAYMENTS`, off by default)
- `GET/POST /owner/support-tickets` — report-a-problem / support requests

### Admin (`/v1/admin/*`) — staff session + RBAC required
- `GET /admin/tags`, `POST /admin/tags/issue`, `POST /admin/tags/:id/suspend`
- `GET /admin/alerts`, `GET /admin/calls`
- `GET /admin/abuse-reports`, `POST /admin/block-list`
- `GET /admin/feature-flags`, `PATCH /admin/feature-flags/:key`
- `GET /admin/audit-events`
- `POST /admin/break-glass/request`, `POST /admin/break-glass/:id/approve`
- `GET /admin/support-tickets`

### Webhooks (`/v1/webhooks/*`) — signature-verified, no user auth
- `POST /webhooks/sms`, `POST /webhooks/whatsapp`, `POST /webhooks/voice`,
  `POST /webhooks/push`

### System
- `GET /health` — liveness/readiness (DB + Redis ping)
- `GET /metrics` — Prometheus-format metrics (internal network only)

See `packages/api-contracts/src` for exact field-level types, and
`services/api/src/**/*.controller.ts` for authoritative per-route
authorization decorators.
