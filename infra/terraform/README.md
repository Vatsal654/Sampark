# Sampark — Terraform deployment skeleton

This directory documents, as Terraform, the free-pilot Cloud Run
deployment described in `docs/DEPLOYMENT.md`. **It has not been applied
and should not be applied without a real GCP project, real secrets in
Secret Manager, and a reviewed `terraform.tfvars`.**

## What this does and does not do

- Defines two Cloud Run v2 services (`sampark-api`, `sampark-worker`)
  reading their secrets from Secret Manager references — never inline.
- Every `FEATURE_*` flag is hard-set to `false` in `cloud_run.tf` for the
  free-pilot tier, matching the root README's compliance checklist. Do
  not flip these to `true` here without also updating the corresponding
  provider credentials and completing the legal/compliance items listed
  in the root `README.md`.
- Does **not** provision the database (Neon) or Redis (Upstash) — those
  are managed dashboards outside Terraform's scope for this project, and
  their connection strings are expected to already exist in Secret
  Manager under the IDs you pass via `terraform.tfvars`.
- Does **not** provision Cloudflare Pages for the scanner portal or admin
  console — see `docs/DEPLOYMENT.md` for that (Pages projects are
  typically connected directly to the GitHub repo via the Cloudflare
  dashboard, not Terraform, for this project's scale).

## Usage (once you actually intend to deploy)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in real values
terraform init
terraform plan    # review carefully before applying anything
terraform apply
```

No `terraform.tfvars.example` is checked in with fake-looking values —
create your own from `variables.tf`'s descriptions so nobody mistakes a
placeholder for a real secret ID.
