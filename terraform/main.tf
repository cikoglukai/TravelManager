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
  project = var.project_id
  region  = var.region
}

locals {
  image_uri = var.image_uri != null && var.image_uri != "" ? var.image_uri : "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.image_name}:${var.image_tag}"

  database_url = "postgresql://${var.db_user}:${urlencode(var.db_password)}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "TravelManager Docker images"
  format        = "DOCKER"

  depends_on = [
    google_project_service.required["artifactregistry.googleapis.com"],
  ]
}

resource "google_sql_database_instance" "postgres" {
  project          = var.project_id
  name             = var.cloud_sql_instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = var.cloud_sql_deletion_protection

  settings {
    tier              = var.cloud_sql_tier
    disk_size         = var.cloud_sql_disk_size_gb
    availability_type = var.cloud_sql_availability_type

    backup_configuration {
      enabled = var.cloud_sql_backups_enabled
    }
  }

  depends_on = [
    google_project_service.required["sqladmin.googleapis.com"],
  ]
}

resource "google_sql_database" "app" {
  project  = var.project_id
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = var.database_url_secret_id

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.required["secretmanager.googleapis.com"],
  ]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.name
  secret_data = local.database_url

  depends_on = [
    google_sql_database.app,
    google_sql_user.app,
  ]
}

resource "google_service_account" "cloud_run" {
  project      = var.project_id
  account_id   = var.cloud_run_service_account_id
  display_name = "TravelManager Cloud Run runtime"

  depends_on = [
    google_project_service.required["iam.googleapis.com"],
  ]
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "database_url_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_cloud_run_v2_service" "app" {
  project  = var.project_id
  name     = var.cloud_run_service_name
  location = var.cloud_run_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = local.image_uri

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NITRO_HOST"
        value = "0.0.0.0"
      }

      env {
        name  = "NITRO_PORT"
        value = "8080"
      }

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "NUXT_PUBLIC_FIREBASE_API_KEY"
        value = var.firebase_api_key
      }

      env {
        name  = "NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        value = var.firebase_auth_domain
      }

      env {
        name  = "NUXT_PUBLIC_FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }

      env {
        name  = "NUXT_PUBLIC_FIREBASE_APP_ID"
        value = var.firebase_app_id
      }

      env {
        name  = "NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
        value = var.firebase_storage_bucket
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.firebase_project_id
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [
          google_sql_database_instance.postgres.connection_name,
        ]
      }
    }
  }

  depends_on = [
    google_artifact_registry_repository.docker,
    google_project_iam_member.cloud_run_sql_client,
    google_project_iam_member.cloud_run_firestore,
    google_secret_manager_secret_iam_member.database_url_accessor,
    google_secret_manager_secret_version.database_url,
    google_project_service.required["run.googleapis.com"],
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_compute_region_network_endpoint_group" "frankfurt_neg" {
  name                  = "frankfurt-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.cloud_run_region
  cloud_run {
    service = google_cloud_run_v2_service.app.name
  }
}