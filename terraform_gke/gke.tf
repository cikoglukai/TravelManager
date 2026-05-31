# GKE Autopilot cluster — managed nodes, Workload Identity enabled by default.
resource "google_container_cluster" "primary" {
  name             = var.cluster_name
  location         = var.region
  enable_autopilot = true

  # Allow `terraform destroy` to delete the cluster (we recreate it on demand).
  deletion_protection = false

  # Autopilot enables Workload Identity automatically (PROJECT.svc.id.goog).
  release_channel {
    channel = "REGULAR"
  }

  depends_on = [google_project_service.required["container.googleapis.com"]]
}

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = "travelmanager"
  description   = "TravelManager service images"
  format        = "DOCKER"
  depends_on    = [google_project_service.required["artifactregistry.googleapis.com"]]
}

# Reserved static IP for the GKE Ingress.
resource "google_compute_global_address" "ingress" {
  name = "travelmanager-ip"
}
