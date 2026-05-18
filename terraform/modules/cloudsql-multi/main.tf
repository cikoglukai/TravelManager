# Module: cloudsql-multi
# Single Cloud SQL Postgres 16 instance with one database per service.
# IAM database authentication enabled — services connect via Workload Identity (no passwords in Secret Manager
# for the per-service users themselves; only the bootstrap superuser keeps a password in Secret Manager).
# Enterprise tenants in `var.enterprise_dedicated_instances` get their own Cloud SQL instance.

variable "vpc_id" {
  description = "VPC self link from gke module — used for Private Service Access peering."
  type        = string
}

variable "deletion_protection" {
  description = "Set false in staging to allow tear-down."
  type        = bool
  default     = true
}

resource "google_project_service" "sql" {
  project            = var.project_id
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_global_address" "psa" {
  name          = "${var.instance_name}-psa"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.vpc_id
}

resource "google_service_networking_connection" "psa" {
  network                 = var.vpc_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa.name]
}

resource "random_password" "bootstrap" {
  length  = 32
  special = true
}

resource "google_sql_database_instance" "shared" {
  name                = var.instance_name
  project             = var.project_id
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_autoresize   = true
    disk_size         = 20

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.vpc_id
      enable_private_path_for_google_cloud_services = true
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
    }
  }

  depends_on = [
    google_project_service.sql,
    google_service_networking_connection.psa,
  ]
}

resource "google_sql_user" "bootstrap" {
  name     = "bootstrap"
  project  = var.project_id
  instance = google_sql_database_instance.shared.name
  password = random_password.bootstrap.result
}

resource "google_secret_manager_secret" "bootstrap_password" {
  project   = var.project_id
  secret_id = "${var.instance_name}-bootstrap-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "bootstrap_password" {
  secret      = google_secret_manager_secret.bootstrap_password.id
  secret_data = random_password.bootstrap.result
}

resource "google_sql_database" "service" {
  for_each = toset(var.service_databases)
  project  = var.project_id
  instance = google_sql_database_instance.shared.name
  name     = each.value
}

# Per-service GSAs connect via IAM auth — created in the iam module. The DB user representing each GSA
# must be created here so PG ACLs exist before the GSA tries to connect.
variable "service_gsa_emails" {
  description = "Map of service name -> GSA email (e.g. trip-svc@<project>.iam.gserviceaccount.com)."
  type        = map(string)
  default     = {}
}

resource "google_sql_user" "service_iam" {
  for_each = var.service_gsa_emails
  project  = var.project_id
  instance = google_sql_database_instance.shared.name
  name     = trimsuffix(each.value, ".gserviceaccount.com")
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# Enterprise dedicated instances — one per tenant in the input list.
resource "google_sql_database_instance" "enterprise" {
  for_each            = toset(var.enterprise_dedicated_instances)
  name                = "${var.instance_name}-ent-${each.value}"
  project             = var.project_id
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 20

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.vpc_id
      enable_private_path_for_google_cloud_services = true
    }
  }

  depends_on = [
    google_project_service.sql,
    google_service_networking_connection.psa,
  ]
}
