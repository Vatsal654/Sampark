# Purpose: Input variables for the Cloud Run deployment skeleton.
# This file defines the shape of what's needed; it does not supply real
# values. See infra/terraform/README.md before ever running `terraform
# apply` against this.

variable "gcp_project_id" {
  description = "Google Cloud project ID to deploy into."
  type        = string
}

variable "gcp_region" {
  description = "Google Cloud region for Cloud Run services."
  type        = string
  default     = "asia-south1"
}

variable "api_image" {
  description = "Fully-qualified container image for the API service (e.g. from Artifact Registry)."
  type        = string
}

variable "worker_image" {
  description = "Fully-qualified container image for the worker service."
  type        = string
}

variable "database_url_secret_id" {
  description = "Secret Manager secret ID holding the Neon Postgres connection string."
  type        = string
}

variable "redis_url_secret_id" {
  description = "Secret Manager secret ID holding the Upstash Redis connection string."
  type        = string
}

variable "jwt_access_secret_id" {
  description = "Secret Manager secret ID holding JWT_ACCESS_SECRET."
  type        = string
}

variable "jwt_refresh_secret_id" {
  description = "Secret Manager secret ID holding JWT_REFRESH_SECRET."
  type        = string
}

variable "field_encryption_root_key_secret_id" {
  description = "Secret Manager secret ID holding FIELD_ENCRYPTION_ROOT_KEY (a real deployment should back this with Cloud KMS instead — see docs/DECISIONS.md ADR-6)."
  type        = string
}

variable "cors_allowed_origins" {
  description = "Comma-separated list of origins allowed to call the API (the deployed scanner-portal and admin hostnames)."
  type        = string
}
