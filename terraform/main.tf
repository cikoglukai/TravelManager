provider "google" {
  project = var.project_id
  region  = var.region
}

# ---------------------------
# CLOUD SQL (IaaS)
# ---------------------------

resource "google_sql_database_instance" "postgres" {
  name             = "travel-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_database" "db" {
  name     = "travel"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "user" {
  name     = "appuser"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ---------------------------
# CLOUD RUN (PaaS)
# ---------------------------

resource "google_cloud_run_service" "app" {
  name     = "travel-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/travel-app"

        ports {
          container_port = 8080
        }

        env {
          name  = "DB_HOST"
          value = google_sql_database_instance.postgres.connection_name
        }

        env {
          name  = "DB_USER"
          value = "appuser"
        }

        env {
          name  = "DB_PASS"
          value = var.db_password
        }

        env {
          name  = "DB_NAME"
          value = "travel"
        }
      }
    }
  }
}

# ---------------------------
# IAM (PUBLIC ACCESS)
# ---------------------------

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.app.name
  location = google_cloud_run_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}