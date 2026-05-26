# Async backbone. Domain-event topics + their subscriptions, each with a
# dead-letter topic and capped delivery attempts — the control mechanism for the
# async workflows.
locals {
  topics = ["TripCreated", "TripUpdated", "TravelAlert", "NewsletterReady"]

  # subscription name => source topic
  subscriptions = {
    "social-trip-created-sub" = "TripCreated"
    "social-trip-updated-sub" = "TripUpdated"
    "notify-travel-alert-sub" = "TravelAlert"
    "notify-newsletter-sub"   = "NewsletterReady"
  }
}

resource "google_pubsub_topic" "events" {
  for_each   = toset(local.topics)
  name       = each.value
  depends_on = [google_project_service.required["pubsub.googleapis.com"]]
}

# One dead-letter topic + drain subscription per event topic.
resource "google_pubsub_topic" "dlq" {
  for_each   = toset(local.topics)
  name       = "${each.value}-dlq"
  depends_on = [google_project_service.required["pubsub.googleapis.com"]]
}

resource "google_pubsub_subscription" "dlq_drain" {
  for_each                   = toset(local.topics)
  name                       = "${each.value}-dlq-drain"
  topic                      = google_pubsub_topic.dlq[each.value].id
  message_retention_duration = "604800s" # 7 days
}

resource "google_pubsub_subscription" "sub" {
  for_each = local.subscriptions
  name     = each.key
  topic    = google_pubsub_topic.events[each.value].id

  ack_deadline_seconds = 30

  retry_policy {
    minimum_backoff = "5s"
    maximum_backoff = "300s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq[each.value].id
    max_delivery_attempts = 5
  }
}

# Dead-lettering only works if the Pub/Sub service agent can publish to the DLQ
# topic and ack the source subscription. Without these bindings, exhausted
# messages keep redelivering instead of draining to the DLQ.
resource "google_project_service_identity" "pubsub" {
  provider   = google-beta
  project    = var.project_id
  service    = "pubsub.googleapis.com"
  depends_on = [google_project_service.required["pubsub.googleapis.com"]]
}

resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  for_each = toset(local.topics)
  topic    = google_pubsub_topic.dlq[each.value].id
  role     = "roles/pubsub.publisher"
  member   = "serviceAccount:${google_project_service_identity.pubsub.email}"
}

resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  for_each     = local.subscriptions
  subscription = google_pubsub_subscription.sub[each.key].id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_project_service_identity.pubsub.email}"
}
