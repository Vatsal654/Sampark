# Sampark — Deployment

## Free-pilot topology (target: zero paid spend)

| Component | Target | Notes |
|---|---|---|
| Scanner portal (static/ISR) | Cloudflare Pages | build via `npm run build --workspace apps/scanner-portal`, output `apps/scanner-portal/.next` via the Cloudflare Next-on-Pages adapter |
| Admin console | Cloudflare Pages (separate project) or Cloud Run | keep on a distinct hostname from the scanner portal |
| Backend API | Google Cloud Run | container from `services/api/Dockerfile`, scale-to-zero friendly |
| Worker | Google Cloud Run (min instances ≥1, or Cloud Run Jobs on a schedule) | needs a persistent Redis connection for BullMQ, so prefer a min-instance-1 service over scale-to-zero |
| Database | Neon PostgreSQL (free tier) | pilot only; plan a migration path off the free tier before real user data volume |
| Cache/queues | Upstash Redis (free tier) or equivalent | BullMQ-compatible |
| Object storage | disabled in free pilot (document upload flagged off) | swap to a real S3-compatible bucket when enabling |
| Push | Firebase Cloud Messaging | free, real service account required (`FCM_SERVICE_ACCOUNT_JSON`) |
| SMS/WhatsApp/Voice | mock only | flags off; see `docs/DECISIONS.md` ADR-9 |

This is infrastructure-as-documentation for a **free private beta**, not an
instruction to deploy — no deployment has been performed by this change,
and no real credentials are included anywhere in the repo.

## Environment variables that must be real for the free pilot

- `DATABASE_URL` — Neon connection string
- `REDIS_URL` — Upstash connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate with
  `openssl rand -base64 48`, store in the platform's secret manager, never
  in a committed file
- `FCM_SERVICE_ACCOUNT_JSON` — Firebase service account credentials
- `CORS_ALLOWED_ORIGINS` — the deployed scanner-portal and admin hostnames

Everything else can stay at its safe development default (mock providers,
disabled feature flags).

## Terraform skeleton

`infra/terraform/` contains a documented, provider-agnostic skeleton
(`cloud_run.tf`, `variables.tf`, `README.md`) describing the Cloud Run
service, its env/secret bindings, and IAM — written to be filled in with
real project IDs at apply time. **Do not `terraform apply` this without a
real GCP project and reviewed variables file**; it is deployment
documentation-as-code, not a live pipeline.

## Production hardening checklist (before any real user data)

- [ ] Move off free-tier DB/Redis to a plan with backups + SLA
- [ ] Enable KMS-backed envelope encryption keys (see `shared-security`)
- [ ] Turn on real SMS/WhatsApp/voice providers only after a signed
      contract with a Nepal-licensed partner (`docs/DECISIONS.md` ADR-4/9)
- [ ] Enable document vault with a real virus-scan provider and private
      bucket with lifecycle/retention rules
- [ ] Complete Nepal legal review (see root `README.md` compliance list)
- [ ] Configure a real CAPTCHA/risk provider for high-risk scanner traffic
- [ ] Set up log aggregation, alerting, and the on-call rotation described
      in `docs/OPERATIONS_RUNBOOK.md`
- [ ] Run a third-party security review against `docs/THREAT_MODEL.md`
