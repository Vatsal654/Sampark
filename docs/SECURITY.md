# Sampark — Security Controls

This document lists the concrete controls implemented (or explicitly
stubbed with a documented gap) across the stack. Cross-reference
`docs/THREAT_MODEL.md` for the abuse cases these controls answer.

## Authentication & sessions

- **Owners**: phone-number OTP only (no passwords). Access tokens are JWTs
  signed with an API-held secret (env `JWT_ACCESS_SECRET`), 15-minute TTL.
  Refresh tokens are opaque, stored hashed in `user_sessions`, rotated on
  every use, and revocable individually or all-at-once ("sign out of all
  devices").
- **Admins**: SSO (OIDC, adapter interface with a dev-mode mock IdP) +
  mandatory TOTP MFA. Admin session TTL is 30 minutes with silent refresh;
  sensitive actions require step-up re-authentication within the last 5
  minutes.
- **Scanners**: no account. A scanner who requests a masked call verifies
  their number via OTP and receives a single-use, short-lived
  `scan_session` token scoped to exactly one tag + action.

## Authorization

- Every API route declares an explicit `@Roles()`/ownership guard; there is
  no implicit "authenticated therefore allowed" access. Ownership checks
  (e.g. "this vehicle belongs to this user") happen in a service-layer
  guard, not just at the controller.
- Admin RBAC roles: `support_agent`, `operations_agent`, `fraud_reviewer`,
  `security_admin`, `super_admin`. Permissions are enumerated in
  `services/api/src/modules/admin/rbac/permissions.ts` and checked via a
  `PermissionsGuard`, never inferred from role name string matching alone.

## Transport & headers

- TLS enforced at the edge (Cloudflare/Cloud Run) in every deployed
  environment; local dev may use plain HTTP behind `localhost` only.
- HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a strict CSP
  (`default-src 'self'`, no `unsafe-inline` scripts) are set via
  `helmet()` in the API and Next.js `headers()` config in both web apps.
- CORS allowlists are explicit per environment (`CORS_ALLOWED_ORIGINS`);
  wildcard origins are never used for authenticated routes.
- Admin console uses `SameSite=Strict` session cookies plus a
  double-submit CSRF token on all state-changing requests.

## Secrets & keys

- All provider credentials, JWT signing secrets, and encryption keys are
  environment-injected server-side only; see each `.env.example`.
- Sensitive field encryption (plate numbers, document metadata, medical
  notes) uses envelope encryption: a per-record data key encrypted by a
  root key from `shared-security/crypto.ts`, which in production resolves
  to a KMS-backed key (adapter interface; local dev uses a file-based key
  clearly marked development-only).
- Values needed for equality lookups only (e.g. "does this plate already
  exist") are stored as HMAC-keyed hashes, never reversible without the
  server-held key, so the plaintext is not derivable from the index.

## Rate limiting & abuse controls

- Redis-backed sliding-window limiters at: IP, device fingerprint, tag ID,
  verified phone number, and account level. Configured per-route in
  `services/api/src/common/rate-limit/*`.
- CAPTCHA (interface + dev no-op provider) escalates only when a risk score
  crosses a threshold, never on the default path, to keep the scanner flow
  frictionless for legitimate use.
- `blocked_identities` supports blocking by hashed phone, device
  fingerprint, or IP range, enforced at the guard layer before any business
  logic runs.

## Data protection

- PII classification table lives in `docs/PRIVACY_DATA_MAP.md`.
- Structured logging (`shared-security/logger.ts`) runs every log line
  through a redaction transform that strips phone numbers, OTP codes,
  tokens, and document identifiers before they reach any sink (console in
  dev, structured JSON to the platform's log collector in prod).
- A retention worker (`services/worker/src/jobs/retention.job.ts`) purges
  or anonymizes scan sessions, alert events, and OTP challenges per
  configurable TTLs (`RETENTION_*` env vars).

## Mobile-specific (MASVS-informed)

- Refresh tokens and biometric-unlock keys are stored only in
  `flutter_secure_storage` (Keychain / Android Keystore-backed), never in
  `SharedPreferences`/plain files.
- Biometric app-lock is optional and never the sole account-recovery path;
  phone-OTP re-auth is always available.
- No provider secrets or signing keys are bundled in the app; the app only
  ever calls the backend API.
- Certificate pinning hook point is provided in `apps/mobile/lib/core/network/`
  (documented as a production hardening step — pinning is disabled in dev
  builds so the mock stack works without custom certs).

## Admin break-glass

Documented in `docs/OPERATIONS_RUNBOOK.md` §"Break-glass access". Requires
a typed reason, `security_admin`-or-above approval, a 1-hour access grant,
and generates an immutable `audit_events` entry visible to every
`security_admin` on next login.

## CI security gates

`.github/workflows/ci.yml` runs, on every PR: lint, typecheck, unit +
integration tests, `npm audit --audit-level=high`, a secret-scan step
(gitleaks-style pattern scan), and a production build. A failing security
gate blocks merge.
