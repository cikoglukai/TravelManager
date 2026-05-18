variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "topics" {
  description = <<-EOT
    Map of topic name -> { subscriptions = [{ name, push_endpoint, ack_deadline_seconds }] }.
    Each topic also gets a `<name>.dlq` topic auto-created with a pull subscription for replay.
  EOT
  type = map(object({
    subscriptions = list(object({
      name                  = string
      push_endpoint         = optional(string)
      ack_deadline_seconds  = optional(number, 60)
      max_delivery_attempts = optional(number, 5)
    }))
  }))
  default = {}
}

variable "push_invoker_sa" {
  description = "GCP SA email allowed to push to subscription endpoints (Pub/Sub uses its OIDC token to call the K8s service)."
  type        = string
  default     = ""
}
