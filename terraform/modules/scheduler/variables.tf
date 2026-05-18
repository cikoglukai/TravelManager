variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud Scheduler region."
  type        = string
  default     = "europe-west1"
}

variable "cron_jobs" {
  description = "Map of job name -> { schedule, topic, payload, time_zone }."
  type = map(object({
    schedule  = string
    topic     = string
    payload   = string
    time_zone = optional(string, "UTC")
  }))
  default = {}
}
