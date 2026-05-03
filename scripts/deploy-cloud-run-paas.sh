#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TF_DIR="$REPO_ROOT/terraform"
TFVARS="$TF_DIR/terraform.tfvars"

tfvar() {
  local name="$1"
  awk -F= -v key="$name" '
    $0 !~ /^[[:space:]]*#/ && $1 ~ "^[[:space:]]*" key "[[:space:]]*$" {
      value=$2
      sub(/^[[:space:]]*/, "", value)
      sub(/[[:space:]]*$/, "", value)
      gsub(/^"/, "", value)
      gsub(/"$/, "", value)
      print value
      exit
    }
  ' "$TFVARS"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd gcloud
need_cmd docker
need_cmd terraform

if [ ! -f "$TFVARS" ]; then
  echo "Missing $TFVARS" >&2
  echo "Create it first:" >&2
  echo "  cp terraform/terraform.tfvars.example terraform/terraform.tfvars" >&2
  echo "Then set project_id, region, and db_password." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(tfvar project_id)}"
REGION="${REGION:-$(tfvar region)}"
AR_REPO="${AR_REPO:-$(tfvar artifact_registry_repository_id)}"
IMAGE_NAME="${IMAGE_NAME:-$(tfvar image_name)}"
IMAGE_TAG="${IMAGE_TAG:-$(tfvar image_tag)}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-$(tfvar cloud_run_service_name)}"
DB_PASSWORD="$(tfvar db_password)"

FIREBASE_API_KEY="${FIREBASE_API_KEY:-$(tfvar firebase_api_key)}"
FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN:-$(tfvar firebase_auth_domain)}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$(tfvar firebase_project_id)}"
FIREBASE_APP_ID="${FIREBASE_APP_ID:-$(tfvar firebase_app_id)}"
FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-$(tfvar firebase_storage_bucket)}"

REGION="${REGION:-europe-west6}"
AR_REPO="${AR_REPO:-travelmanager}"
IMAGE_NAME="${IMAGE_NAME:-app}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-travelmanager}"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "your-google-cloud-project-id" ]; then
  echo "Set a real project_id in terraform/terraform.tfvars." >&2
  exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "replace-with-a-strong-password" ]; then
  echo "Set a real db_password in terraform/terraform.tfvars." >&2
  exit 1
fi

IMAGE_URI="${IMAGE_URI:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}}"
DOCKER_HOSTNAME="${REGION}-docker.pkg.dev"

TF_EXTRA_ARGS=""
if [ "${AUTO_APPROVE:-0}" = "1" ]; then
  TF_EXTRA_ARGS="-auto-approve"
fi

echo "Project:      $PROJECT_ID"
echo "Region:       $REGION"
echo "Repository:   $AR_REPO"
echo "Image:        $IMAGE_URI"
echo "Cloud Run:    $CLOUD_RUN_SERVICE"
echo

echo "Configuring gcloud project..."
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

echo
echo "Checking Terraform..."
cd "$TF_DIR"
terraform init
terraform fmt
terraform validate

echo
echo "Bootstrapping Artifact Registry..."
terraform apply -target=google_artifact_registry_repository.docker $TF_EXTRA_ARGS

echo
echo "Authenticating Docker to Artifact Registry..."
gcloud auth configure-docker "$DOCKER_HOSTNAME"

echo
echo "Building and pushing image..."
cd "$REPO_ROOT"
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE_URI" \
  --push \
  .

echo
echo "Applying Terraform infrastructure..."
cd "$TF_DIR"
terraform apply $TF_EXTRA_ARGS

if [ "${FORCE_ROLLOUT:-1}" = "1" ]; then
  echo
  echo "Forcing Cloud Run rollout for image tag and Firebase env vars..."
  gcloud run services update "$CLOUD_RUN_SERVICE" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-env-vars "NUXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY},NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},NUXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},NUXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID},NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET},GOOGLE_CLOUD_PROJECT=${FIREBASE_PROJECT_ID}"
fi

echo
echo "Cloud Run URL:"
terraform output -raw cloud_run_url 2>/dev/null || \
  gcloud run services describe "$CLOUD_RUN_SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format='value(status.url)'

