# Purpose: Cloud Run service definitions for the free-pilot deployment
# topology described in docs/DEPLOYMENT.md. Every real capability
# (SMS/WhatsApp/voice/document-uploads/no-tag-lookup) stays behind its
# FEATURE_* flag, defaulted off in the env block below — flip only what
# you have a real, contracted provider for.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

resource "google_cloud_run_v2_service" "api" {
  name     = "sampark-api"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.api_image

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "SWAGGER_ENABLED"
        value = "false"
      }
      env {
        name  = "CORS_ALLOWED_ORIGINS"
        value = var.cors_allowed_origins
      }
      # Real-capability flags default OFF — see docs/DEPLOYMENT.md
      # "For the free pilot, disable real masked calls, SMS/WhatsApp,
      # document uploads, no-tag lookup, and real medical/emergency
      # records." Flip these only once the corresponding provider
      # contract in the root README's compliance checklist is signed.
      env {
        name  = "FEATURE_LIVE_CALL_BRIDGING"
        value = "false"
      }
      env {
        name  = "FEATURE_REAL_SMS"
        value = "false"
      }
      env {
        name  = "FEATURE_REAL_WHATSAPP"
        value = "false"
      }
      env {
        name  = "FEATURE_DOCUMENT_VAULT"
        value = "false"
      }
      env {
        name  = "FEATURE_NO_TAG_LOOKUP"
        value = "false"
      }
      env {
        name  = "FEATURE_REAL_PAYMENTS"
        value = "false"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.database_url_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = var.redis_url_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_ACCESS_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.jwt_access_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.jwt_refresh_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FIELD_ENCRYPTION_ROOT_KEY"
        value_source {
          secret_key_ref {
            secret  = var.field_encryption_root_key_secret_id
            version = "latest"
          }
        }
      }

      ports {
        container_port = 3001
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "sampark-worker"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_NONE" # background worker, no public HTTP surface

  template {
    containers {
      image = var.worker_image

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.database_url_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = var.redis_url_secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FIELD_ENCRYPTION_ROOT_KEY"
        value_source {
          secret_key_ref {
            secret  = var.field_encryption_root_key_secret_id
            version = "latest"
          }
        }
      }
    }
    # BullMQ needs a persistent Redis connection; scale-to-zero would drop jobs mid-flight.
    scaling {
      min_instance_count = 1
      max_instance_count = 1
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.gcp_region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}
