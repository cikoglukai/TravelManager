variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "europe-west1"
}

variable "cluster_name" {
  type    = string
  default = "travelmanager-gke"
}

variable "db_instance_name" {
  type    = string
  default = "travelmanager-postgres"
}
variable "db_tier" {
  type    = string
  default = "db-custom-1-3840"
}
variable "db_user" {
  type    = string
  default = "travelmanager"
}
variable "db_password" {
  type      = string
  sensitive = true
}

# One logical database per microservice (DB-per-service, single instance).
variable "service_databases" {
  type = map(string)
  default = {
    user-service         = "travelmanager_user"
    trip-service         = "travelmanager_trip"
    destination-service  = "travelmanager_destination"
    social-service       = "travelmanager_social"
    travel-info-service  = "travelmanager_travelinfo"
    notification-service = "travelmanager_notification"
  }
}

# External API keys + Firebase creds stored in Secret Manager.
variable "rapidapi_key" {
  type      = string
  default   = ""
  sensitive = true
}
variable "sendgrid_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
variable "firebase_service_account" {
  type      = string
  default   = "{}"
  sensitive = true
}
# Server-side Google Maps key (Geocoding API) used by trip-service. The browser
# key is public and injected as a NUXT_PUBLIC_* env, not stored here.
variable "google_maps_server_key" {
  type      = string
  default   = ""
  sensitive = true
}
