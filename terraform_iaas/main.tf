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
  image_uri = var.image_uri != null && var.image_uri != "" ? var.image_uri : "${var.shared_region}-docker.pkg.dev/${var.project_id}/${var.existing_artifact_registry_repository_id}/${var.image_name}:${var.image_tag}"

  database_url = "postgresql://${var.db_user}:${urlencode(var.db_password)}@cloud-sql-proxy:5432/${var.db_name}"
}

resource "google_project_service" "required" {
  for_each = toset([
    "compute.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

data "google_sql_database_instance" "postgres" {
  project = var.project_id
  name    = var.existing_cloud_sql_instance_name
}

data "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.shared_region
  repository_id = var.existing_artifact_registry_repository_id
}

resource "google_secret_manager_secret" "database_url_iaas" {
  project   = var.project_id
  secret_id = var.database_url_iaas_secret_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url_iaas" {
  secret      = google_secret_manager_secret.database_url_iaas.name
  secret_data = local.database_url
}

resource "google_service_account" "gce_runtime" {
  project      = var.project_id
  account_id   = var.gce_service_account_id
  display_name = "TravelManager GCE runtime"
}

resource "google_project_iam_member" "gce_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_project_iam_member" "gce_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_project_iam_member" "gce_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_project_iam_member" "gce_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_project_iam_member" "gce_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "database_url_iaas_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url_iaas.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.gce_runtime.email}"
}

resource "google_compute_address" "static" {
  project      = var.project_id
  name         = "${var.instance_name}-ip"
  region       = var.region
  address_type = "EXTERNAL"

  depends_on = [google_project_service.required["compute.googleapis.com"]]
}

resource "google_compute_firewall" "allow_http_https" {
  project = var.project_id
  name    = "${var.instance_name}-allow-http-https"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [var.instance_name]

  depends_on = [google_project_service.required["compute.googleapis.com"]]
}

resource "google_compute_firewall" "allow_ssh_iap" {
  project = var.project_id
  name    = "${var.instance_name}-allow-ssh-iap"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = [var.instance_name]

  depends_on = [google_project_service.required["compute.googleapis.com"]]
}

resource "google_compute_instance" "app" {
  project      = var.project_id
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = [var.instance_name]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = var.disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = "default"

    access_config {
      nat_ip = google_compute_address.static.address
    }
  }

  service_account {
    email  = google_service_account.gce_runtime.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = templatefile("${path.module}/startup.sh.tpl", {
    image_uri                 = local.image_uri
    cloud_sql_connection_name = data.google_sql_database_instance.postgres.connection_name
    artifact_registry_host    = "${var.shared_region}-docker.pkg.dev"
    database_url_secret_id    = google_secret_manager_secret.database_url_iaas.secret_id
    domain_name               = var.domain_name
    letsencrypt_email         = var.letsencrypt_email
    firebase_api_key          = var.firebase_api_key
    firebase_auth_domain      = var.firebase_auth_domain
    firebase_project_id       = var.firebase_project_id
    firebase_app_id           = var.firebase_app_id
    firebase_storage_bucket   = var.firebase_storage_bucket
    docker_compose_yml        = file("${path.module}/files/docker-compose.iaas.yml")
    nginx_default_conf        = file("${path.module}/files/nginx-default.conf")
    nginx_https_conf_template = file("${path.module}/files/nginx-https.conf.template")
    nginx_enable_https_script = file("${path.module}/files/99-enable-https.sh")
  })

  allow_stopping_for_update = true

  depends_on = [
    google_project_service.required["compute.googleapis.com"],
    google_project_iam_member.gce_sql_client,
    google_project_iam_member.gce_firestore,
    google_project_iam_member.gce_artifact_reader,
    google_secret_manager_secret_iam_member.database_url_iaas_accessor,
    google_secret_manager_secret_version.database_url_iaas,
  ]
}
