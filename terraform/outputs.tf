output "db_instance_name" {
  value = google_sql_database_instance.postgres.name
}

output "db_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}