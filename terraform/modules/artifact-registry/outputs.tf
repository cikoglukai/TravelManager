output "repository_urls" {
  description = "Map of service name -> Docker repository URL."
  value = {
    for s in var.services :
    s => "${var.region}-docker.pkg.dev/${var.project_id}/travelmanager-${s}"
  }
}

output "repository_ids" {
  description = "Map of service name -> Artifact Registry repository_id."
  value = {
    for s in var.services :
    s => google_artifact_registry_repository.service[s].repository_id
  }
}
