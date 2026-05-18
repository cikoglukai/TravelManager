output "instance_name" {
  description = "Shared Cloud SQL instance name."
  value       = google_sql_database_instance.shared.name
}

output "instance_connection_name" {
  description = "Shared Cloud SQL instance connection name (project:region:instance)."
  value       = google_sql_database_instance.shared.connection_name
}

output "private_ip_address" {
  description = "Private IP for in-cluster connections."
  value       = google_sql_database_instance.shared.private_ip_address
}

output "service_databases" {
  description = "Map of service name -> Postgres database name."
  value = {
    for s in var.service_databases : s => google_sql_database.service[s].name
  }
}

output "bootstrap_password_secret_id" {
  description = "Secret Manager id for the bootstrap (admin) password — used to run migrations + create per-tenant schemas."
  value       = google_secret_manager_secret.bootstrap_password.secret_id
}

output "enterprise_instance_connection_names" {
  description = "Map of tenant id -> Cloud SQL instance connection name for Enterprise dedicated instances."
  value = {
    for t in var.enterprise_dedicated_instances :
    t => google_sql_database_instance.enterprise[t].connection_name
  }
}
