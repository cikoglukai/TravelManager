variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "namespace" {
  description = "K8s namespace the bound K8s service account lives in."
  type        = string
}

variable "k8s_service_account" {
  description = "K8s service account name (in `var.namespace`) bound via Workload Identity."
  type        = string
}

variable "gsa_id" {
  description = "GCP service account id to create (e.g. `trip-svc`)."
  type        = string
}

variable "roles" {
  description = "List of IAM roles to grant to the GSA."
  type        = list(string)
  default     = []
}
