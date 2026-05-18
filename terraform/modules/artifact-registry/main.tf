# Module: artifact-registry — one Docker repo per service.

resource "google_project_service" "ar" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "service" {
  for_each      = toset(var.services)
  project       = var.project_id
  location      = var.region
  repository_id = "travelmanager-${each.value}"
  description   = "TravelManager ${each.value} service images"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 20
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7d
    }
  }

  depends_on = [google_project_service.ar]
}
