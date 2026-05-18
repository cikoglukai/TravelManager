variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud SQL region."
  type        = string
  default     = "europe-west1"
}

variable "instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "travelmanager-postgres"
}

variable "tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-7680"
}

variable "availability_type" {
  description = "ZONAL or REGIONAL."
  type        = string
  default     = "REGIONAL"
}

variable "service_databases" {
  description = "Per-service databases. Each gets a Postgres database + IAM user (Workload Identity)."
  type        = list(string)
  default = [
    "identity",
    "trip",
    "social",
    "travel_info",
    "destination",
    "notification",
  ]
}

variable "enterprise_dedicated_instances" {
  description = "Tenant ids that get a dedicated Cloud SQL instance (Enterprise tier)."
  type        = list(string)
  default     = []
}
