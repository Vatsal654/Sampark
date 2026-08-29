# Sampark — Privacy Data Map

Classification: **Public** (safe for scanner/public exposure), **Internal**
(staff-visible with justification), **Sensitive** (encrypted, access
audited), **Critical** (encrypted, break-glass only, never in logs).

| Field | Table | Classification | At rest | In logs | Notes |
|---|---|---|---|---|---|
| `display_label` | vehicles | Public | plain | allowed | owner-chosen, no plate/name allowed by validation |
| `plate_number` | vehicles | Sensitive | envelope-encrypted + keyed hash for lookup | never | never in URLs, analytics, or push payloads |
| `vin_number` / `engine_number` | vehicles | Internal | plain | never | owner-visible/editable identifiers, not used for lookup and never shown to a scanner (see public.ts's scanner-facing schema, which has no vehicle-identifier fields at all) |
| `phone_e164` | verified_phone_credentials | Critical | envelope-encrypted + keyed hash for lookup | never | redaction filter strips any E.164-shaped string from logs |
| `full_name` | users | Sensitive | plain (Internal-visible), redacted in scanner-facing responses | never to scanner | visible to owner + authorized support only |
| `medical_note` | emergency_profiles | Critical | envelope-encrypted | never | shown to scanner only after emergency confirmation, opt-in per field |
| `document blobs` (RC/licence/insurance) | S3-compatible storage | Critical | server-side encryption + envelope key | never (only opaque doc id, never filename/content) | signed URLs, ≤5 min TTL |
| `otp_code` | otp_challenges | Critical | bcrypt-hashed | never | never returned in any response body except the dev-mock provider's local debug channel |
| `access_token` / `refresh_token` | user_sessions | Critical | refresh token stored hashed | never | access tokens are never persisted server-side (stateless JWT) |
| `scan_location` (coarse) | alert_events | Internal | plain (already coarse) | allowed (coarse only) | reverse-geocoded to a neighborhood-level label |
| `scan_location` (exact) | alert_events | Sensitive | envelope-encrypted | never | only stored when scanner explicitly consented for that event |
| `admin reason` (break-glass) | audit_events | Internal | plain | allowed | operational transparency requires this be readable by reviewers |
| `device_fingerprint_hash` | abuse tables | Internal | keyed hash | allowed (hash only) | not reversible to a real device identifier |

## Deletion behavior

- **Owner account deletion request**: `users.status = deletion_requested`
  immediately stops new notifications; a 30-day grace window (configurable
  via `ACCOUNT_DELETION_GRACE_DAYS`) allows recovery, after which the
  retention job hard-deletes `users`, `vehicles`, `documents` (and their
  storage objects), `emergency_profiles`, and anonymizes historical
  `alert_events`/`audit_events` by replacing the owner reference with a
  tombstone ID (audit history is retained in anonymized form for fraud/
  security investigation continuity; this is disclosed in the in-app
  privacy policy).
- **Scanner data**: scanners never have an account; the only scanner-linked
  data is a short-TTL abuse fingerprint and, for a masked-call flow, a
  verified-phone credential tied to that single `call_session`, purged
  after the retention window (`RETENTION_SCAN_SESSION_DAYS`, default 30).
- **Data export**: `GET /owner/privacy/export` produces a JSON bundle of
  all Sensitive/Internal data the owner is the subject of (Critical fields
  like document blobs are included as time-boxed signed download links,
  not embedded).

## Cross-border / provider data handling

Any third-party provider (SMS/WhatsApp/voice/push) receives only the
minimum field needed to perform its function (e.g. destination number +
message template ID) and never receives document content, medical notes,
or plate numbers. Provider selection for production must confirm Nepal
data-handling compliance before enablement — see the compliance checklist
in the root `README.md`.
