# Module: scheduler — Cloud Scheduler jobs that publish to Pub/Sub topics on a cron schedule.

resource "google_project_service" "scheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_scheduler_job" "tick" {
  for_each  = var.cron_jobs
  name      = each.key
  project   = var.project_id
  region    = var.region
  schedule  = each.value.schedule
  time_zone = each.value.time_zone

  pubsub_target {
    topic_name = "projects/${var.project_id}/topics/${each.value.topic}"
    data       = base64encode(each.value.payload)
  }

  retry_config {
    retry_count          = 3
    min_backoff_duration = "30s"
    max_backoff_duration = "600s"
  }

  depends_on = [google_project_service.scheduler]
}
