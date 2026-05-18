variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Artifact Registry region."
  type        = string
  default     = "europe-west1"
}

variable "services" {
  description = "List of service names. Each gets a `travelmanager-<service>` Docker repo."
  type        = list(string)
  default = [
    "bff-gateway",
    "identity-tenant",
    "trip",
    "social",
    "travel-info",
    "destination",
    "booking-integrations",
    "notification",
  ]
}
