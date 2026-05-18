output "topic_ids" {
  description = "Map of logical topic name -> Pub/Sub topic resource id."
  value = {
    for k, v in google_pubsub_topic.main : k => v.id
  }
}

output "dlq_topic_ids" {
  description = "Map of logical topic name -> DLQ topic resource id."
  value = {
    for k, v in google_pubsub_topic.dlq : k => v.id
  }
}

output "subscription_ids" {
  description = "Map of subscription compound key (topic::sub) -> subscription resource id."
  value = {
    for k, v in google_pubsub_subscription.sub : k => v.id
  }
}
