output "artifact_registry_repository" {
  description = "Artifact Registry Docker repository."
  value       = google_artifact_registry_repository.docker.name
}

output "image_uri" {
  description = "Container image URI that Cloud Run deploys."
  value       = local.image_uri
}

output "cloud_run_service_name" {
  description = "Cloud Run service name."
  value       = google_cloud_run_v2_service.app.name
}

output "cloud_run_url" {
  description = "Cloud Run service URL."
  value       = google_cloud_run_v2_service.app.uri
}

output "cloud_run_service_account_email" {
  description = "Cloud Run runtime service account."
  value       = google_service_account.cloud_run.email
}

output "db_instance_name" {
  description = "Cloud SQL instance name."
  value       = google_sql_database_instance.postgres.name
}

output "db_connection_name" {
  description = "Cloud SQL instance connection name."
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_url_secret_id" {
  description = "Secret Manager secret ID containing DATABASE_URL."
  value       = google_secret_manager_secret.database_url.secret_id
}
