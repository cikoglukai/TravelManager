output "instance_external_ip" {
  description = "Static external IP of the GCE VM."
  value       = google_compute_address.static.address
}

output "instance_name" {
  description = "Compute Engine instance name."
  value       = google_compute_instance.app.name
}

output "instance_zone" {
  description = "Compute Engine instance zone."
  value       = google_compute_instance.app.zone
}

output "ssh_command" {
  description = "Connect to the VM via IAP-tunneled SSH."
  value       = "gcloud compute ssh ${google_compute_instance.app.name} --zone ${google_compute_instance.app.zone} --tunnel-through-iap --project ${var.project_id}"
}

output "app_url" {
  description = "Application URL (HTTPS once Let's Encrypt has issued a certificate)."
  value       = "https://${var.domain_name}"
}

output "image_uri" {
  description = "Container image URI deployed on the VM."
  value       = local.image_uri
}

output "gce_service_account_email" {
  description = "GCE runtime service account."
  value       = google_service_account.gce_runtime.email
}

output "database_url_iaas_secret_id" {
  description = "Secret Manager secret ID containing the TCP-form DATABASE_URL."
  value       = google_secret_manager_secret.database_url_iaas.secret_id
}

output "dns_setup_hint" {
  description = "Reminder: point your domain to the static IP."
  value       = "Set DNS A record ${var.domain_name} -> ${google_compute_address.static.address}"
}
