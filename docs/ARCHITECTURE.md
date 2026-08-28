# Sampark — Architecture

Sampark is a Nepal-first platform that lets a passerby contact a vehicle
owner safely — without either party's phone number ever being revealed to
the other party's device, browser, or logs.

## 1. System overview

```
                              +-------------------+
                              |   Owner Mobile App |
                              |  (Flutter, iOS/    |
                              |   Android)          |
                              +----------+----------+
                                         | HTTPS (JWT)
                                         v
+------------------+   HTTPS    +-------+--------+   SQL    +--------------+
| Scanner Portal    +---------->|                |<-------->|  PostgreSQL  |
| (Next.js, public) |           |   Backend API  |          +--------------+
+------------------+            |   (NestJS)     |
                                 |                |   jobs   +--------------+
+------------------+   HTTPS    |                +--------->|    Redis      |
| Admin Console     +---------->|                |          |  (cache/RL/  |
| (Next.js, staff)  |           +-------+--------+          |   BullMQ)    |
+------------------+                    |                    +--------------+
                                         | enqueue
                                         v
                                 +-------+--------+          +--------------+
                                 |     Worker     +--------->| S3-compatible|
                                 |  (notification |          |   storage     |
                                 |   delivery,    |          |  (documents) |
                                 |   retention)   |          +--------------+
                                 +-------+--------+
                                         |
                     +-------------------+-------------------+
                     v                   v                   v
              SmsProvider         PushProvider (FCM)   VoiceBridgeProvider
              WhatsAppProvider    OtpProvider           (masked calling)
              (all: mock in dev, real adapter behind env config)
```

## 2. Repository layout

```
/apps
  /mobile            Flutter owner app (Android, iOS, tablets)
  /scanner-portal    Next.js public scanner-facing web app
  /admin             Next.js internal admin console
/services
  /api               NestJS REST API (source of truth, OpenAPI docs)
  /worker            BullMQ workers: notification delivery, retention, webhooks
/packages
  /api-contracts     Shared TypeScript types + zod schemas for API request/response
  /shared-security   Crypto helpers, phone/plate normalization, signature verification
  /shared-config     Typed environment/config loader shared by api + worker
/docs                Architecture, security, privacy, ops documentation
/infra
  /docker            docker-compose for local development
  /terraform         Deployment templates (Cloud Run, Neon, Cloudflare Pages)
/scripts             Dev/ops helper scripts
```

## 3. Why this stack

See `docs/DECISIONS.md` for the full rationale. In short:

- **NestJS** gives us a structured, modular backend with first-class support
  for guards (authz), interceptors (audit logging), pipes (validation), and
  OpenAPI generation — all load-bearing for a privacy-sensitive product.
- **PostgreSQL** for strong relational integrity between vehicles, tags,
  users, and consent records — this is not a document-shaped domain.
- **Redis** backs distributed rate limiting, OTP challenge state, short-lived
  scan sessions, and BullMQ queues.
- **Next.js** for both public-facing web surfaces: the scanner portal must be
  fast on 2G/3G Nepali mobile networks, and static/ISR rendering with a thin
  client bundle serves that well. The admin console reuses the same tooling
  for velocity, but is a fully separate deployable app with its own auth.
- **Flutter** gives one codebase for Android/iOS phones and tablets with
  native camera/NFC access for tag activation.

## 4. Trust boundaries

1. **Public internet → Scanner Portal**: fully untrusted. No auth required
   for predefined alerts. Rate-limited and abuse-monitored at every layer.
2. **Scanner Portal → API**: the portal is a thin client; all authorization
   and validation happens server-side. The portal never receives owner PII.
3. **Owner Mobile App → API**: authenticated with short-lived JWT access
   tokens + rotating refresh tokens bound to a device/session record.
4. **Admin Console → API**: authenticated staff session with MFA + RBAC,
   separate audience/scope from owner and scanner tokens.
5. **API → Providers**: server-to-server only. Provider credentials never
   leave the API/worker processes. Client apps never see provider secrets.
6. **API/Worker → Database/Storage**: only backend processes hold DB and
   object-storage credentials. No direct client access to Postgres/S3.

## 5. Core invariant: number masking

Neither the scanner nor the owner ever receives the other party's real
phone number in any client-visible surface (UI, push payload, SMS body,
logs, analytics, error messages, URLs). The `VoiceBridgeProvider` interface
is the only component that is allowed to hold both numbers simultaneously,
in-memory, for the duration of an active bridged call session, and even
there the numbers are never persisted in plaintext logs. See
`docs/THREAT_MODEL.md` §"Caller/owner number disclosure".

## 6. Request flow: anonymous alert (no login)

1. Scanner opens `https://scan.sampark.example/t/{opaqueId}.{signature}`.
2. Scanner portal calls `GET /public/tags/:opaqueId` with the signature in
   the query string.
3. API verifies the HMAC signature and tag status server-side, and returns
   only the public-safe payload (vehicle display label, tag status,
   available actions). No owner identity data is returned.
4. Scanner selects a category (e.g. "Lights on") and optionally shares
   browser geolocation.
5. Scanner portal calls `POST /public/tags/:opaqueId/alerts` with the
   category, optional coarse/exact location (per consent), and an
   anti-abuse token.
6. API creates an `alert_event`, enqueues a delivery job, and returns a
   generic acknowledgement. No scanner PII is required or stored beyond an
   abuse-prevention fingerprint (hashed, short-retention).
7. Worker delivers push → WhatsApp → SMS per the owner's configured
   preference order, logging each `alert_delivery` outcome.

## 7. Request flow: masked callback

1. Scanner requests a callback and verifies their own number via OTP
   (`OtpProvider`).
2. API creates a `call_session` (short-lived, opaque ID) and enqueues a
   bridge request to `VoiceBridgeProvider`.
3. In production (once a licensed Nepali telecom partner is contracted),
   the provider places two legs — scanner⇄bridge and owner⇄bridge — and
   neither party's real number is exposed to the other.
4. In development, `MockVoiceBridgeProvider` simulates the same session
   lifecycle (ringing → connected → ended) for the notification simulator
   and E2E tests, without placing a real call. Live bridging is gated by
   the `FEATURE_LIVE_CALL_BRIDGING` flag, off by default.

## 8. Deployment topology (free pilot)

See `docs/DEPLOYMENT.md`. Scanner portal + admin static assets on
Cloudflare Pages, API on Google Cloud Run, Postgres on Neon free tier,
push via Firebase Cloud Messaging. Real SMS/WhatsApp/voice, document
uploads, and no-tag lookup stay disabled in this tier — mocks remain fully
functional for demos and tests.
