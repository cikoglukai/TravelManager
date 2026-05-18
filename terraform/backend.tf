# Remote state — GCS backend.
# One-time setup before `terraform init`:
#   gsutil mb -l europe-west1 -p <project_id> gs://travelmanager-tfstate
#   gsutil versioning set on gs://travelmanager-tfstate
# Then run:
#   terraform init -migrate-state -backend-config="bucket=travelmanager-tfstate"
#
# Workspaces: `terraform workspace new staging` / `terraform workspace new prod`.
# State path becomes: gs://travelmanager-tfstate/cloud-native/<workspace>/default.tfstate
terraform {
  backend "gcs" {
    # bucket supplied via `-backend-config="bucket=..."` at init time
    prefix = "cloud-native"
  }
}
