# Sampark — Operations Runbook

## Health & monitoring

- `GET /health` on the API checks DB + Redis connectivity; wire this to
  the platform's health check (Cloud Run readiness probe).
- `GET /metrics` exposes Prometheus counters: request latency/error rate
  per route, queue depth and job failure rate per BullMQ queue, provider
  call success/failure counts (labelled by provider, never by
  phone/identity).
- Structured JSON logs carry a `traceId` per request (propagated
  API→worker via the job payload) for correlation, with all PII redacted
  before the line is emitted (see `docs/SECURITY.md`).

## Alerting hooks (to wire to your paging tool of choice)

| Condition | Severity | Suggested action |
|---|---|---|
| `queue:alert-delivery` DLQ depth > 0 | High | check provider status page, inspect DLQ entries in admin console |
| `emergency` alert volume spike per tag | High | fraud-review queue, consider tag pause |
| Provider webhook signature failures spike | High | possible forgery attempt; check WAF logs |
| `/health` failing | Critical | page on-call immediately |
| Break-glass access granted | Medium | notify all `security_admin`s async |

## Break-glass access

1. Admin submits `POST /admin/break-glass/request` with a mandatory typed
   reason and the specific record(s) needed.
2. A `security_admin` (not the requester) approves via
   `POST /admin/break-glass/:id/approve`.
3. Access is granted for 60 minutes, scoped to the named record(s) only,
   and every read performed under the grant is individually audit logged.
4. On expiry, access is automatically revoked; a summary is queued for
   mandatory post-hoc review by a second `security_admin` within 5
   business days.
5. Never grant break-glass to yourself; the approval guard rejects
   requester == approver.

## Provider outage response

1. Worker's circuit breaker trips after N consecutive provider failures
   (configurable per provider) and stops sending new jobs to that
   provider, routing to the next fallback channel instead.
2. Admin console's provider status panel shows the tripped state.
3. Operator can flip `feature_flags.live_call_bridging` (or the relevant
   provider flag) off entirely via the admin console if a provider is
   behaving unsafely (e.g. leaking data in webhook payloads) — this is the
   "emergency switch to disable calling" required by the product spec.
4. Once the provider recovers, the breaker half-opens automatically and
   resumes on sustained success.

## Backup & recovery

- Postgres: daily automated snapshot (managed by the hosting provider in
  production: Neon/Cloud SQL); retention per `RETENTION_BACKUP_DAYS`.
- Recovery test: quarterly, restore the latest snapshot into a scratch
  database and run `npm run --workspace services/api migration:run` +
  smoke tests against it; record the result in the ops log.
- Object storage: versioning enabled on the production bucket; document
  deletes are soft (tombstoned) for 30 days before hard delete via the
  retention job.

## Database migration rollback

Every migration in `services/api/src/database/migrations` must implement
`down()`. Rollback procedure: `npm run --workspace services/api
migration:revert`, then redeploy the previous API image. Migrations that
are not safely reversible (rare) must be called out in their filename
comment and require a maintenance-window deploy, never a hot rollback.

## Disaster recovery runbook (summary)

1. Identify blast radius (DB, Redis, storage, or provider-only outage).
2. If DB is lost: restore latest snapshot, replay any WAL if the provider
   supports point-in-time recovery, run migrations, verify with `/health`.
3. If Redis is lost: safe to recreate empty — it holds only caches,
   rate-limit counters, OTP challenges (users simply re-request OTP), and
   BullMQ queue state (in-flight jobs are replayed from their last durable
   checkpoint recorded in Postgres where applicable).
4. If object storage is lost: documents are unrecoverable unless the
   bucket has versioning/cross-region replication enabled in production;
   this is why versioning is a pre-launch requirement (`DEPLOYMENT.md`).
5. Communicate status via the admin console banner
   (`feature_flags.maintenance_mode`) so owner apps show a clear
   "temporarily unavailable" state instead of failing silently.

## Incident response & notification decision tree

1. **Detect** via alerting hooks above or a user/security report.
2. **Triage**: does this involve PII exposure (phone numbers, documents,
   medical notes)? → escalate to Security Admin immediately.
3. **Contain**: flip the relevant feature flag / revoke the relevant
   credential / pause the affected tag(s).
4. **Assess scope** using `audit_events` and provider webhook logs.
5. **Notify**: if confirmed PII exposure, Nepal-specific breach
   notification obligations must be assessed with legal counsel (see root
   README compliance checklist) — this runbook does not itself constitute
   legal advice or a determination of notification duty.
6. **Remediate & document** in a post-incident report; update
   `docs/THREAT_MODEL.md` if a new abuse class was discovered.
