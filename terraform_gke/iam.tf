# Runtime GCP service account for all workloads, bound to the in-cluster KSA
# (travelmanager in the default namespace) via Workload Identity.
resource "google_service_account" "gke_runtime" {
  project      = var.project_id
  account_id   = "travelmanager-gke"
  display_name = "TravelManager GKE workloads"
  depends_on   = [google_project_service.required["iam.googleapis.com"]]
}

locals {
  runtime_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber",
    "roles/datastore.user",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}

resource "google_project_iam_member" "runtime" {
  for_each = toset(local.runtime_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.gke_runtime.email}"
}

# Workload Identity binding: KSA default/travelmanager -> this GCP SA.
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.gke_runtime.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/travelmanager]"
  # The Workload Identity pool (PROJECT.svc.id.goog) exists only after the
  # Autopilot cluster is created.
  depends_on = [google_container_cluster.primary]
}
