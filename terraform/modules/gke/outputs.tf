output "cluster_name" {
  description = "GKE cluster name."
  value       = google_container_cluster.autopilot.name
}

output "cluster_endpoint" {
  description = "GKE control-plane endpoint."
  value       = google_container_cluster.autopilot.endpoint
}

output "cluster_ca_certificate" {
  description = "Base64-encoded cluster CA cert."
  value       = google_container_cluster.autopilot.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "vpc_id" {
  description = "VPC self link for downstream resources (Cloud SQL PSC, Memorystore)."
  value       = google_compute_network.vpc.self_link
}

output "subnet_id" {
  description = "Subnet self link."
  value       = google_compute_subnetwork.subnet.self_link
}

output "workload_identity_pool" {
  description = "Workload Identity pool — `<project>.svc.id.goog`."
  value       = "${var.project_id}.svc.id.goog"
}
