variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GKE region."
  type        = string
  default     = "europe-west1"
}

variable "cluster_name" {
  description = "GKE Autopilot cluster name."
  type        = string
  default     = "travelmanager"
}

variable "release_channel" {
  description = "GKE release channel."
  type        = string
  default     = "REGULAR"
}
