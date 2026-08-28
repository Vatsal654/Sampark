# Sampark — Architecture Decision Records (condensed)

## ADR-1: NestJS over Express/Fastify-raw for the API
Nest's DI + guard/interceptor/pipe pipeline gives us a structural place to
enforce authorization, redaction, and audit logging consistently across
~15 modules. A privacy-critical app benefits more from that structure than
from the marginal perf gain of a thinner framework.

## ADR-2: Owner auth is phone-OTP only, no passwords
Passwords add an attack surface (credential stuffing, reuse) that phone
OTP avoids, and match the target users' existing mental model (most Nepali
consumer apps use OTP). Biometric app-lock is layered on top, never a
replacement for a recoverable auth factor.

## ADR-3: Tag identity is separate from tag activation
A tag's opaque ID + signature (public, printed on the sticker) proves
*which* tag was scanned, not *who* owns it. Binding requires a second,
physically-separate secret (activation PIN) plus an authenticated owner
session. This directly defeats the "photograph the QR and claim it" abuse
case (§3.2 of the threat model) at the cost of one extra onboarding step.

## ADR-4: Masked calling is an adapter behind a feature flag, not a live integration
Nepal PSTN call bridging requires a licensed telecom relationship this
project does not have. Building a real integration against an
unauthorized/foreign VoIP path would be both non-compliant and dishonest
about what "the product" currently does. We instead ship a fully working
mock provider (same interface, same session lifecycle, same webhook
shapes) so the rest of the system — UI, rate limits, logging, tests — is
complete and provider-swappable the day a contract exists.

## ADR-5: No-tag lookup ships disabled
Same reasoning as ADR-4, applied to vehicle-registry data: no legitimate
Nepal government API exists for us to call, so we do not simulate one as
if it were real. The feature flag, data model, audit trail, and UI empty
state exist; the relay call is a documented `NotImplementedException`
until a data-sharing agreement and legal sign-off exist.

## ADR-6: Envelope encryption for plate numbers, phone numbers, medical notes
A single symmetric key encrypting everything is simpler but makes key
rotation and per-field access review harder. Envelope encryption (root key
wraps per-record data keys) lets us rotate the root key without
re-encrypting every row, and lets `shared-security` expose a narrow
`encryptField`/`decryptField` API that every module uses identically
rather than reinventing crypto per module.

## ADR-7: Redis for OTP/session/rate-limit state, Postgres for durable records
OTP challenges and rate-limit counters are high-write, short-TTL, and
disposable — a poor fit for relational storage. Postgres remains the
system of record for anything an audit or support investigation might
need to reconstruct later.

## ADR-8: Scanner portal and admin console are separate Next.js apps
They have entirely different trust levels, auth models, and threat
profiles. Merging them into one app risks a routing/authz mistake exposing
admin surface to the public internet. Separate deployables (separate
Cloudflare Pages / hosting targets) make that class of bug structurally
harder to introduce.

## ADR-9: Free-pilot deployment keeps real providers off
Cloud Run + Neon free tier + Cloudflare Pages let us demonstrate the full
UX with mock providers at zero cost before any paid contract exists. Real
SMS/WhatsApp/voice/document-upload/no-tag-lookup stay flagged off in that
tier so a free deployment can never silently create a real-world safety
promise ("we will call you") the org cannot yet fulfill.
