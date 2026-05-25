output "cluster_name" {
  value = google_container_cluster.primary.name
}
output "cluster_location" {
  value = google_container_cluster.primary.location
}
output "ingress_ip" {
  value = google_compute_global_address.ingress.address
}
output "artifact_registry" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}
output "cloud_sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}
output "gke_runtime_sa" {
  value = google_service_account.gke_runtime.email
}
