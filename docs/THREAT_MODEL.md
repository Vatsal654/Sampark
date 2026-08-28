# Sampark — Threat Model

Scope: owner mobile app, scanner web portal, admin console, backend API,
worker, providers, and data stores. Methodology: asset/trust-boundary
enumeration + abuse-case walkthrough (informed by OWASP ASVS/MASVS).

## 1. Assets

| Asset | Sensitivity | Notes |
|---|---|---|
| Owner real phone number | Critical | Never leaves API/worker/provider boundary |
| Scanner real phone number | Critical | Same as above; scanner is otherwise anonymous |
| Vehicle plate number | High | Normalized, encrypted at rest, never in URLs/logs |
| Owner identity documents (RC, licence, insurance) | Critical | Encrypted, virus-scanned, short-lived signed URLs only |
| Emergency medical notes | Critical | Shown only during an explicit emergency flow, opt-in per field |
| Tag signing keys | Critical | HSM/KMS-managed in production; rotate on schedule |
| Location data (scan-time) | High | Only collected on explicit per-event consent; coarse by default |
| Admin session / MFA | Critical | Break-glass access is the highest-value target |
| Audit log | High | Append-only; tampering must be detectable |

## 2. Trust boundaries

See `docs/ARCHITECTURE.md` §4. The scanner portal is explicitly modeled as
operating in a hostile network (public Wi-Fi, shared devices) and a hostile
client (browser dev tools, scripted requests).

## 3. Abuse cases, mitigations, and tests

### 3.1 QR ID enumeration
- **Threat**: attacker iterates opaque IDs to discover valid tags / probe
  vehicle existence.
- **Mitigation**: 128-bit random opaque IDs (ULID-adjacent but
  non-sequential, see `shared-security/tag-id.ts`), server-verified HMAC
  signature appended to every URL, per-IP and per-ID sliding-window rate
  limits, WAF-style anomaly detection on the `/public/tags/*` route,
  generic 404-shaped response for both "not found" and "invalid signature"
  (no oracle to distinguish them).
- **Tests**: `services/api/test/security/tag-enumeration.e2e-spec.ts`
  asserts constant-shaped responses and rate-limit triggering.

### 3.2 Copied / cloned QR stickers
- **Threat**: attacker photographs/reprints a legitimate QR sticker onto
  another vehicle, or claims an unlinked physical tag.
- **Mitigation**: the QR encodes only a scanner URL; it does not grant any
  write access. Activation (binding a tag to an owner) requires an
  authenticated owner session **and** a physical fulfilment/activation PIN
  shipped separately from the QR sticker (`tag_activation_challenges`).
  Reassignment requires re-verification and is audit logged. Possession of
  the URL alone never proves ownership.
- **Tests**: `tag-activation.e2e-spec.ts` — activation without a valid PIN
  is rejected; reassignment without fresh auth is rejected.

### 3.3 Stalking / repeated alerts against one owner
- **Threat**: a scanner (or bot) spams alerts/calls against a single tag to
  harass the owner.
- **Mitigation**: per-tag and per-fingerprint velocity limits, exponential
  cool-downs, CAPTCHA escalation above a risk threshold, owner-side "report
  abuse" on any alert which feeds a block list, and a global tag pause the
  owner can trigger instantly.
- **Tests**: `rate-limit.e2e-spec.ts`.

### 3.4 Malicious/unwanted location collection
- **Threat**: portal silently collects precise location, or an owner is
  shown exact coordinates without scanner consent.
- **Mitigation**: geolocation is requested via an explicit browser
  permission prompt tied to one alert submission; declining never blocks
  the alert. Owner sees a coarse label (e.g. "near Baneshwor, Kathmandu")
  unless the scanner explicitly shared precise location for that event.
- **Tests**: `alerts.e2e-spec.ts` covers consent-flag propagation.

### 3.5 Caller/owner number disclosure
- **Threat**: a masked call session leaks either party's real number via
  caller ID, logs, webhook payloads, or client state.
- **Mitigation**: `VoiceBridgeProvider` is the only component holding both
  numbers, in-memory, for the call's lifetime; all logging goes through the
  redaction interceptor (`shared-security/redact.ts`) which strips
  `E164_PHONE_PATTERN` matches before anything reaches a log sink; webhook
  payloads from the provider are validated against an allow-listed schema
  that never includes raw numbers in stored fields.
- **Tests**: `masked-call.e2e-spec.ts` + a log-scanning unit test that fails
  the build if a phone-shaped string appears in captured log output during
  the full call-session test.

### 3.6 OTP abuse (enumeration, brute force, SMS-bombing)
- **Threat**: attacker probes which numbers are registered, brute-forces a
  6-digit code, or uses the OTP endpoint to spam SMS at a victim's number.
- **Mitigation**: identical response shape regardless of registration
  status; per-number and per-IP send cooldowns (60s) and daily caps;
  attempt lockout after 5 wrong codes with increasing backoff; OTPs are
  hashed at rest (never stored/logged in plaintext) and expire in 5
  minutes; `OtpProvider` sits behind a global circuit breaker.
- **Tests**: `otp.e2e-spec.ts`, `otp.service.spec.ts`.

### 3.7 Public portal XSS / injection
- **Threat**: the "Other" alert free-text field or a display label is used
  to inject script/markup.
- **Mitigation**: strict input validation + length caps server-side (zod
  schemas in `packages/api-contracts`), output-encoded rendering in
  Next.js (no `dangerouslySetInnerHTML`), CSP with no `unsafe-inline`
  script sources, and a WAF-layer pattern filter on free-text fields.
- **Tests**: `xss.e2e-spec.ts` submits known payloads and asserts encoded
  storage/render.

### 3.8 Admin account takeover
- **Threat**: attacker compromises an admin credential to access PII or
  perform destructive actions.
- **Mitigation**: mandatory SSO + MFA, short admin session lifetime,
  step-up auth for sensitive actions, IP/device anomaly alerts, and
  break-glass access requiring a typed reason + time-boxed elevated grant
  + mandatory post-hoc review, all immutably audit logged.
- **Tests**: `admin-auth.e2e-spec.ts`, `break-glass.e2e-spec.ts`.

### 3.9 Document vault disclosure
- **Threat**: a document URL leaks or is guessed, exposing RC/licence
  scans.
- **Mitigation**: private object storage, no permanent public URLs, signed
  URLs valid for ≤5 minutes and single-use where the storage backend
  supports it, authorization check on every signed-URL issuance, inspector
  share codes are separate short-lived revocable tokens distinct from
  owner access tokens.
- **Tests**: `documents.e2e-spec.ts` covers expired-link and cross-owner
  access rejection.

### 3.10 Webhook forgery / replay
- **Threat**: attacker POSTs fake provider callbacks (e.g. fake "call
  connected" or "SMS delivered" events) or replays a captured legitimate
  one.
- **Mitigation**: every inbound webhook verifies an HMAC signature with a
  per-provider secret, a timestamp within a tolerance window, and an
  idempotency key recorded in `provider_webhook_events` (unique constraint
  rejects replays).
- **Tests**: `webhooks.e2e-spec.ts`.

### 3.11 Provider outage
- **Threat**: an SMS/WhatsApp/voice provider goes down or degrades,
  silently dropping deliveries.
- **Mitigation**: BullMQ retries with exponential backoff + dead-letter
  queue, provider health checks feeding a circuit breaker, admin-visible
  provider status dashboard, and a global "disable live calling" kill
  switch (`feature_flags`).
- **Tests**: `notification-delivery.integration-spec.ts` simulates a
  provider throwing and asserts DLQ placement + fallback channel attempt.

### 3.12 Emergency-button abuse
- **Threat**: repeated false emergency triggers degrade trust or are used
  to harass an owner with medical-flavored intimidation.
- **Mitigation**: emergency alerts are rate-limited per tag (higher
  threshold than normal alerts, but not unlimited), each is audit logged
  with abuse-review flags, and repeated false triggers on one tag surface
  in the admin fraud-review queue and can trigger an owner-visible warning
  banner or a temporary tag pause on operator review.
- **Tests**: `emergency.e2e-spec.ts`.

### 3.13 Government/third-party vehicle-data misuse
- **Threat**: no-tag lookup used to deanonymize an owner or run bulk
  reconnaissance.
- **Mitigation**: feature is **disabled by default** behind
  `FEATURE_NO_TAG_LOOKUP`; when enabled it requires an authenticated,
  verified requester, a stated reason, one request per vehicle per 7 days,
  and never returns owner PII to the requester — only a relay-attempt
  outcome. All requests are audit logged with human-review and block-list
  support. See §7 of the product spec and `no-tag-lookup` module docs.
- **Tests**: `no-tag-lookup.e2e-spec.ts` asserts the endpoint is fully
  disabled out of the box.

## 4. Residual risks

- Live masked calling and real SMS/WhatsApp delivery are not enabled until
  a licensed Nepali telecom/messaging partner contract exists; until then
  the platform's real-world safety value is limited to push/app-visible
  alerts for app-registered owners plus mock-mode demos.
- Physical tag security (sticker tamper-evidence, supply-chain integrity
  of shipped tags) is outside this software's control and must be handled
  by fulfilment/ops process (see `docs/OPERATIONS_RUNBOOK.md`).
- Nepal-specific legal review (data protection, telecom compliance,
  emergency-services claims) has not been performed — see the compliance
  checklist at the end of the root `README.md`.
