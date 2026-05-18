variable "project_id" {
  description = "Google Cloud project ID (must match the existing terraform/ stack)."
  type        = string
}

variable "region" {
  description = "Region for the GCE VM and static IP."
  type        = string
  default     = "europe-west3"
}

variable "zone" {
  description = "Zone for the GCE VM."
  type        = string
  default     = "europe-west3-a"
}

variable "shared_region" {
  description = "Region of the existing Cloud SQL + Artifact Registry (from terraform/)."
  type        = string
  default     = "europe-west1"
}

variable "instance_name" {
  description = "Name of the Compute Engine instance."
  type        = string
  default     = "travelmanager-iaas"
}

variable "machine_type" {
  description = "GCE machine type. e2-standard-4 = 4 vCPU, 16 GB RAM."
  type        = string
  default     = "e2-standard-4"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB."
  type        = number
  default     = 30
}

variable "gce_service_account_id" {
  description = "Service account ID used by the GCE VM."
  type        = string
  default     = "travelmanager-gce"
}

variable "existing_cloud_sql_instance_name" {
  description = "Name of the existing Cloud SQL instance created by terraform/."
  type        = string
  default     = "travelmanager-postgres"
}

variable "existing_artifact_registry_repository_id" {
  description = "Artifact Registry repository ID created by terraform/."
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
  description = "Full container image URI. Leave null to use shared_region-docker.pkg.dev/project/repository/image:tag."
  type        = string
  default     = null
}

variable "db_name" {
  description = "Application database name (same as terraform/ stack)."
  type        = string
  default     = "travelmanager"
}

variable "db_user" {
  description = "Application database user (same as terraform/ stack)."
  type        = string
  default     = "travelmanager"
}

variable "db_password" {
  description = "Application database password (same as terraform/ stack)."
  type        = string
  sensitive   = true
}

variable "database_url_iaas_secret_id" {
  description = "Secret Manager secret ID for the TCP-form DATABASE_URL used by the VM."
  type        = string
  default     = "travelmanager-database-url-iaas"
}

variable "domain_name" {
  description = "Public domain name pointing to the VM static IP (used for Let's Encrypt and Nginx)."
  type        = string
}

variable "letsencrypt_email" {
  description = "Email address used for Let's Encrypt registration."
  type        = string
}

variable "firebase_api_key" {
  description = "Firebase web API key (NUXT_PUBLIC_FIREBASE_API_KEY)."
  type        = string
  default     = ""
}

variable "firebase_auth_domain" {
  description = "Firebase auth domain."
  type        = string
  default     = ""
}

variable "firebase_project_id" {
  description = "Firebase/GCP project ID (NUXT_PUBLIC_FIREBASE_PROJECT_ID)."
  type        = string
  default     = ""
}

variable "firebase_app_id" {
  description = "Firebase web app ID."
  type        = string
  default     = ""
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage bucket."
  type        = string
  default     = ""
}
