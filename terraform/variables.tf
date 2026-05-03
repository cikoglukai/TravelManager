variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Google Cloud region for Artifact Registry, Cloud SQL, and Cloud Run."
  type        = string
  default     = "europe-west1"
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registry Docker repository ID."
  type        = string
  default     = "travelmanager"
}

variable "image_name" {
  description = "Docker image name inside Artifact Registry."
  type        = string
  default     = "app"
}

variable "image_tag" {
  description = "Docker image tag to deploy when image_uri is not set."
  type        = string
  default     = "latest"
}

variable "image_uri" {
  description = "Full container image URI. Leave null to use region-docker.pkg.dev/project/repository/image:tag."
  type        = string
  default     = null
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "travelmanager"
}

variable "cloud_run_service_account_id" {
  description = "Service account ID used by Cloud Run."
  type        = string
  default     = "travelmanager-run"
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances."
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances."
  type        = number
  default     = 3
}

variable "cloud_sql_instance_name" {
  description = "Cloud SQL PostgreSQL instance name."
  type        = string
  default     = "travelmanager-postgres"
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-f1-micro"
}

variable "cloud_sql_disk_size_gb" {
  description = "Cloud SQL storage size in GB."
  type        = number
  default     = 10
}

variable "cloud_sql_availability_type" {
  description = "Cloud SQL availability type. Use ZONAL for low-cost demo deployments or REGIONAL for HA."
  type        = string
  default     = "ZONAL"
}

variable "cloud_sql_backups_enabled" {
  description = "Enable Cloud SQL backups."
  type        = bool
  default     = true
}

variable "cloud_sql_deletion_protection" {
  description = "Protect the Cloud SQL instance from Terraform deletion."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Application database name."
  type        = string
  default     = "travelmanager"
}

variable "db_user" {
  description = "Application database user."
  type        = string
  default     = "travelmanager"
}

variable "db_password" {
  description = "Application database password."
  type        = string
  sensitive   = true
}

variable "database_url_secret_id" {
  description = "Secret Manager secret ID containing DATABASE_URL."
  type        = string
  default     = "travelmanager-database-url"
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage bucket (NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET), e.g. your-project.firebasestorage.app"
  type        = string
  default     = ""
}

variable "firebase_api_key" {
  description = "Firebase web API key (NUXT_PUBLIC_FIREBASE_API_KEY)."
  type        = string
  default     = ""
}

variable "firebase_auth_domain" {
  description = "Firebase auth domain, e.g. your-project.firebaseapp.com."
  type        = string
  default     = ""
}

variable "firebase_project_id" {
  description = "Firebase/GCP project ID (NUXT_PUBLIC_FIREBASE_PROJECT_ID)."
  type        = string
  default     = ""
}

variable "firebase_app_id" {
  description = "Firebase web app ID (NUXT_PUBLIC_FIREBASE_APP_ID)."
  type        = string
  default     = ""
}
