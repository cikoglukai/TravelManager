output "host" {
  description = "Redis host."
  value       = google_redis_instance.cache.host
}

output "port" {
  description = "Redis port."
  value       = google_redis_instance.cache.port
}

output "redis_url" {
  description = "redis://host:port — feed into per-service env."
  value       = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
  sensitive   = true
}
