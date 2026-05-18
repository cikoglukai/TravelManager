module "scheduler" {
  source     = "../../modules/scheduler"
  project_id = var.project_id

  cron_jobs = {
    gdacs-poll = {
      schedule = "0 * * * *"
      topic    = "travel-info.ingest.tick"
      payload = jsonencode({
        eventId    = "scheduler-gdacs"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
        source     = "gdacs"
      })
    }
    reliefweb-poll = {
      schedule = "0 */3 * * *"
      topic    = "travel-info.ingest.tick"
      payload = jsonencode({
        eventId    = "scheduler-reliefweb"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
        source     = "reliefweb"
      })
    }
    weather-batch = {
      schedule = "0 */6 * * *"
      topic    = "travel-info.ingest.tick"
      payload = jsonencode({
        eventId    = "scheduler-weather"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
        source     = "openweather"
      })
    }
    weekly-newsletter = {
      schedule = "0 6 * * 1"
      topic    = "newsletter.scheduled"
      payload = jsonencode({
        eventId    = "scheduler-newsletter"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
        weekOf     = "1970-01-01"
      })
    }
    feed-cleanup = {
      schedule = "0 3 * * *"
      topic    = "social.feed.cleanup.tick"
      payload = jsonencode({
        eventId    = "scheduler-feed-cleanup"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
      })
    }
    traveler-aggregate = {
      schedule = "0 2 * * *"
      topic    = "destination.aggregate.tick"
      payload = jsonencode({
        eventId    = "scheduler-aggregate"
        tenantId   = "system"
        occurredAt = "1970-01-01T00:00:00Z"
        version    = 1
      })
    }
  }

  depends_on = [module.pubsub]
}
