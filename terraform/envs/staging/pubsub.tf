# Pub/Sub topology for staging — full topic graph from the architecture doc.
# Push endpoints reference the in-cluster service URLs; deploy-time the cluster ingress + cert-manager
# create stable HTTPS endpoints for each push subscription.

module "pubsub" {
  source     = "../../modules/pubsub"
  project_id = var.project_id

  push_invoker_sa = "pubsub-push@${var.project_id}.iam.gserviceaccount.com"

  topics = {
    "trip.created" = {
      subscriptions = [
        { name = "trip.created.social-feed-fanout", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/feed-fanout" },
        { name = "trip.created.travel-info-match", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/match" },
        { name = "trip.created.destination-aggregator", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/destination/aggregate" },
      ]
    }
    "trip.updated" = {
      subscriptions = [
        { name = "trip.updated.social-feed-fanout", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/feed-fanout" },
        { name = "trip.updated.travel-info-match", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/match" },
      ]
    }
    "trip.deleted" = {
      subscriptions = [
        { name = "trip.deleted.social-feed-cleanup", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/feed-cleanup" },
        { name = "trip.deleted.travel-info-cleanup", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/cleanup" },
      ]
    }
    "social.activity" = {
      subscriptions = [
        { name = "social.activity.feed-fanout", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/feed-fanout" },
      ]
    }
    "travel.warning.published" = {
      subscriptions = [
        { name = "travel.warning.match", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/match" },
      ]
    }
    "travel.weather.snapshot" = {
      subscriptions = [
        { name = "travel.weather.match", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/match" },
      ]
    }
    "notification.requested" = {
      subscriptions = [
        { name = "notification.dispatch", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/notification/dispatch" },
      ]
    }
    "notification.delivered" = {
      subscriptions = [
        { name = "notification.audit", push_endpoint = null }, # pull-only, audit consumer
      ]
    }
    "newsletter.scheduled" = {
      subscriptions = [
        { name = "newsletter.run", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/newsletter" },
      ]
    }
    "tenant.plan.changed" = {
      subscriptions = [
        { name = "tenant.plan.changed.bff-cache", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/bff/cache-invalidate" },
        { name = "tenant.plan.changed.social", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/tenant-plan" },
        { name = "tenant.plan.changed.destination", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/destination/tenant-plan" },
      ]
    }
    "travel-info.ingest.tick" = {
      subscriptions = [
        { name = "travel-info.ingest", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/travel-info/ingest" },
      ]
    }
    "social.feed.cleanup.tick" = {
      subscriptions = [
        { name = "social.feed.cleanup", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/social/feed-cleanup-tick" },
      ]
    }
    "destination.aggregate.tick" = {
      subscriptions = [
        { name = "destination.aggregate.tick.run", push_endpoint = "https://internal.staging.travelmanager.app/api/internal/pubsub/destination/aggregate-tick" },
      ]
    }
  }
}
