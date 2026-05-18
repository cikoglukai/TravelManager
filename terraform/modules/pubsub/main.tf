# Module: pubsub — for_each over var.topics creates topic + DLQ + subscriptions with retry/dead-letter policies.

resource "google_project_service" "pubsub" {
  project            = var.project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_pubsub_topic" "main" {
  for_each                   = var.topics
  name                       = each.key
  project                    = var.project_id
  message_retention_duration = "604800s" # 7 days

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "dlq" {
  for_each                   = var.topics
  name                       = "${each.key}.dlq"
  project                    = var.project_id
  message_retention_duration = "604800s"

  depends_on = [google_project_service.pubsub]
}

# Flatten topic -> subscriptions list into a single map for for_each.
locals {
  subscriptions = merge([
    for topic_name, topic in var.topics : {
      for sub in topic.subscriptions :
      "${topic_name}::${sub.name}" => merge(sub, { topic_name = topic_name })
    }
  ]...)
}

resource "google_pubsub_subscription" "sub" {
  for_each = local.subscriptions
  name     = each.value.name
  project  = var.project_id
  topic    = google_pubsub_topic.main[each.value.topic_name].name

  ack_deadline_seconds       = each.value.ack_deadline_seconds
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq[each.value.topic_name].id
    max_delivery_attempts = each.value.max_delivery_attempts
  }

  dynamic "push_config" {
    for_each = each.value.push_endpoint == null ? [] : [each.value.push_endpoint]
    content {
      push_endpoint = push_config.value
      oidc_token {
        service_account_email = var.push_invoker_sa
        audience              = each.value.push_endpoint
      }
    }
  }
}

# DLQ pull subscriptions — used by `tests/seed/replay_dlq.sh` and the dlq-monitor CronJob.
resource "google_pubsub_subscription" "dlq_drain" {
  for_each = var.topics
  name     = "${each.key}.dlq.drain"
  project  = var.project_id
  topic    = google_pubsub_topic.dlq[each.key].name

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s"
}

# IAM: allow Pub/Sub service account to publish to DLQs (required by dead_letter_policy).
data "google_project" "self" { project_id = var.project_id }

resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  for_each = var.topics
  project  = var.project_id
  topic    = google_pubsub_topic.dlq[each.key].name
  role     = "roles/pubsub.publisher"
  member   = "serviceAccount:service-${data.google_project.self.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# IAM: allow Pub/Sub to attach to DLQs as subscriber too (acks during retry).
resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  for_each     = local.subscriptions
  project      = var.project_id
  subscription = google_pubsub_subscription.sub[each.key].name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.self.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
