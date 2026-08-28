# Sampark (सम्पर्क)

Sampark ("contact" in Nepali) is a Nepal-first platform that lets a
passerby safely contact a vehicle owner — without either party's phone
number ever being revealed to the other — when a vehicle is blocking
access, has lights on, is being towed, or is involved in an emergency.

This is an original product built for the general problem of "safely
contacting a vehicle owner." It is not affiliated with, and does not
reuse any code, branding, or copy from, any existing commercial product.

> **Status**: local-development-complete reference implementation. Real
> SMS/WhatsApp/voice calling, document uploads, and no-tag vehicle lookup
> are implemented as full provider-adapter interfaces with working mocks,
> gated behind feature flags that default to **off** until the
> legal/telecom prerequisites in §7 below are met. See
> `docs/DECISIONS.md` for why.

## What's in this repo

```
/apps/mobile            Flutter owner app (Android/iOS, phone + tablet)
/apps/scanner-portal     Next.js public scanner web app (no install/login)
/apps/admin              Next.js internal admin console (staff-only)
/services/api            NestJS backend API + OpenAPI docs
/services/worker         BullMQ background workers (notifications, retention)
/packages/api-contracts  Shared TS types/zod schemas for every API call
/packages/shared-security Crypto, phone/plate normalization, redaction, tag signing
/packages/shared-config   Typed env/config loader
/docs                     Architecture, security, threat model, ops, API docs
/infra                    Docker Compose (local) + Terraform (pilot deploy templates)
/scripts                  Dev/ops helper scripts
```

Full architecture diagram and rationale: `docs/ARCHITECTURE.md`.
Security posture: `docs/SECURITY.md`. Abuse-case analysis:
`docs/THREAT_MODEL.md`. Data classification: `docs/PRIVACY_DATA_MAP.md`.

## Quick start (local, everything mocked, zero paid services)

```bash
git clone <this-repo>
cd sampark
./scripts/dev-up.sh          # starts Postgres, Redis, MinIO, mock providers,
                              # runs migrations + seed data, starts API + worker
npm run dev:scanner          # http://localhost:3000  (in a second terminal)
npm run dev:admin            # http://localhost:3002  (in a third terminal)
```

Try it: the seed script prints an exact scanner URL for a demo tag (e.g.
`http://localhost:3000/t/<opaqueId>.<signature>`) — see
`docs/LOCAL_DEVELOPMENT.md` for the full seed catalogue, including admin
login credentials for dev.

Mobile app:

```bash
cd apps/mobile && flutter pub get && flutter run
```

Full prerequisites and troubleshooting: `docs/LOCAL_DEVELOPMENT.md`.

## Running tests

```bash
npm run test                                          # all TS unit tests
npm run --workspace services/api test:integration      # Postgres/Redis testcontainers
npm run --workspace services/api test:e2e               # full API e2e flows
npm run --workspace apps/scanner-portal test:e2e         # Playwright
npm run --workspace apps/admin test:e2e                  # Playwright
cd apps/mobile && flutter test                            # widget/unit tests
```

CI (`.github/workflows/ci.yml`) runs all of the above plus lint,
typecheck, `npm audit`, and a secret scan on every PR.

## Production release checklist

1. All CI gates green (lint, typecheck, unit/integration/e2e, audit, secret scan).
2. `docs/DEPLOYMENT.md` production hardening checklist complete.
3. Real provider credentials configured only for providers actually under
   contract; every other `FEATURE_*` flag left at its safe default.
4. Security review against `docs/THREAT_MODEL.md` completed.
5. Nepal legal/compliance sign-off obtained — see the checklist below.
6. Backup/restore test performed within the last quarter
   (`docs/OPERATIONS_RUNBOOK.md`).
7. On-call rotation and alerting wired to the hooks in
   `docs/OPERATIONS_RUNBOOK.md`.

## Environment variables / accounts still required for a live deployment

None of these are invented or assumed in this codebase — every one is a
real external account/credential someone must obtain before turning the
corresponding feature on. Everything works today with the documented mock
in local development.

| Need | Used by | Status here |
|---|---|---|
| Firebase project + service account (FCM) | Push notifications | Real account required even for the free pilot; mock push works without it |
| Nepal-licensed SMS aggregator account | `SmsProvider` | Mock only; adapter interface implemented |
| WhatsApp Business API access (Meta) + approved templates | `WhatsAppProvider` | Mock only; adapter interface implemented |
| Licensed telecom/voice-bridge partner (Nepal PSTN-capable) | `VoiceBridgeProvider` masked calling | Mock only; `FEATURE_LIVE_CALL_BRIDGING=false` by default |
| CAPTCHA/risk provider (e.g. hCaptcha/Turnstile) | Scanner-portal abuse escalation | Dev no-op provider implemented |
| S3-compatible bucket + virus-scan provider | Document vault in production | MinIO used locally; vault flagged off in the free pilot |
| Neon Postgres / Upstash Redis (or equivalent) production instances | API + worker | `.env.example` documents the connection string shape |
| KMS or equivalent key-management service | Envelope encryption root key | File-based dev key is clearly marked development-only |
| Nepal government/authorized vehicle-data relay agreement | No-tag lookup | Feature fully disabled; no such integration exists or is simulated |

## Security and compliance items that need outside sign-off before production

- **A Nepal-qualified lawyer** should review: data protection/privacy
  compliance, terms of service, consent flows (especially emergency
  medical data and location), and breach-notification obligations.
- **A licensed Nepal telecom or VoIP partner contract** is required before
  `FEATURE_LIVE_CALL_BRIDGING` can be safely enabled — see
  `docs/DECISIONS.md` ADR-4. Building or routing calls through an
  unauthorized/foreign VoIP path would be both non-compliant and unsafe,
  so this repo deliberately does not attempt it.
- **A written data-sharing/relay agreement with an authorized vehicle-data
  provider** (not a government scrape) is required before the no-tag
  lookup feature (`docs/` §7 of the product spec, `FEATURE_NO_TAG_LOOKUP`)
  can be enabled — see `docs/DECISIONS.md` ADR-5.
- **WhatsApp Business template approval** from Meta is required before any
  WhatsApp notification content can be sent in production.
- **A payment provider compliance review** is required before enabling
  real payments for tag orders; the payment interface exists but is
  mocked, and NPR formatting is implemented without a live provider wired
  in.
- **An independent security review** against `docs/THREAT_MODEL.md`,
  ideally including a penetration test of the scanner portal and masked
  call flow, before handling real user data at scale.

## License / attribution

Original codebase written for this project. No third-party proprietary
source, branding, or copy was copied into this repository.
