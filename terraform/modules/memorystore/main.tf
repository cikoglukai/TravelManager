# Module: memorystore — Redis instance for booking cache + tenant config cache.

variable "vpc_id" {
  description = "VPC self link from gke module — Memorystore needs an authorized network."
  type        = string
}

resource "google_project_service" "redis" {
  project            = var.project_id
  service            = "redis.googleapis.com"
  disable_on_destroy = false
}

resource "google_redis_instance" "cache" {
  name               = var.instance_id
  project            = var.project_id
  region             = var.region
  tier               = var.tier
  memory_size_gb     = var.memory_size_gb
  authorized_network = var.vpc_id
  redis_version      = "REDIS_7_2"
  display_name       = "TravelManager cache"

  depends_on = [google_project_service.redis]
}
