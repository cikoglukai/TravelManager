variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Memorystore region."
  type        = string
  default     = "europe-west1"
}

variable "instance_id" {
  description = "Memorystore instance id."
  type        = string
  default     = "travelmanager-redis"
}

variable "memory_size_gb" {
  description = "Memorystore memory size in GB."
  type        = number
  default     = 1
}

variable "tier" {
  description = "Memorystore tier (BASIC or STANDARD_HA)."
  type        = string
  default     = "STANDARD_HA"
}
