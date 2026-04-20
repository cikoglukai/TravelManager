# TravelManager Google Cloud Setup

This guide documents two alternative deployment paths:

- IaaS: Compute Engine VM running the Docker Compose stack.
- PaaS: Cloud Run managed by Terraform, with Cloud SQL PostgreSQL.

Use only the path your assignment or deployment target requires.

## 1. Repository State

The repository is prepared for both paths:

- `Dockerfile` builds the Nuxt/Nitro production app and listens on `0.0.0.0:8080`.
- `docker-compose.yml` runs `nginx`, `app`, `postgres`, and optional `certbot` for IaaS.
- `nginx/default.conf` and `nginx/https.conf.template` proxy to `app:8080`.
- `terraform/` manages the PaaS Cloud Run infrastructure.
- `.dockerignore` keeps local build output and `node_modules` out of Docker images.

Important ports:

| Component | Port | Public? | Used By |
|---|---:|---:|---|
| Nginx HTTP | `80` | Yes | IaaS VM |
| Nginx HTTPS | `443` | Yes | IaaS VM |
| App container | `8080` | Cloud Run only | Dockerfile, Compose, Cloud Run |
| Local app debug bind | `127.0.0.1:3000` | No | VM/local debugging |
| Local Postgres debug bind | `127.0.0.1:5433` | No | VM/local debugging |
| Compose Postgres | `5432` | No | IaaS app container |

Cloud Run startup fixes already applied:

- Database setup and seed run in the background so Cloud Run can bind to port `8080` quickly.
- Missing `FIREBASE_SERVICE_ACCOUNT` no longer crashes startup. Without it, Firebase token verification is skipped.

## 2. Local Tools

Install and verify:

```bash
gcloud version
docker version
docker buildx version
git --version
terraform version
```

Log in:

```bash
gcloud auth login
gcloud auth application-default login
```

Terraform uses Application Default Credentials. If `terraform plan` says credentials are missing, rerun:

```bash
gcloud auth application-default login
```

## 3. PaaS Values

Use these values for the current Google Cloud Run deployment:

```bash
export PROJECT_ID="project-59d9fc88-ac5c-43c3-894"
export REGION="europe-west6"
export AR_REPO="travelmanager"
export IMAGE_NAME="app"
export IMAGE_TAG="latest"
export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
```

Set your project:

```bash
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"
```

## 4. PaaS Terraform Setup

Terraform creates the Cloud Run PaaS infrastructure:

- required Google Cloud APIs
- Artifact Registry Docker repository
- Cloud SQL PostgreSQL instance
- application database and user
- Secret Manager secret containing `DATABASE_URL`
- Cloud Run runtime service account
- IAM roles for Cloud SQL and Secret Manager access
- Cloud Run service using the app image
- public Cloud Run invoker access

Create the local Terraform values file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform/terraform.tfvars`:

```hcl
project_id  = "project-59d9fc88-ac5c-43c3-894"
region      = "europe-west6"
db_password = "replace-with-a-strong-password"
```

Do not commit `terraform/terraform.tfvars`. It contains secrets and is ignored by Git.

Optional Terraform values:

```hcl
# artifact_registry_repository_id = "travelmanager"
# image_name                      = "app"
# image_tag                       = "latest"
# cloud_run_service_name          = "travelmanager"
# cloud_sql_instance_name         = "travelmanager-postgres"
# db_name                         = "travelmanager"
# db_user                         = "travelmanager"
```

Initialize and validate Terraform:

```bash
cd terraform
terraform init
terraform fmt
terraform validate
```

## 5. PaaS One-Command Script

Run the scripted setup from the repository root:

```bash
./scripts/deploy-cloud-run-paas.sh
```

By default, Terraform remains interactive and asks before applying changes. For a non-interactive run:

```bash
AUTO_APPROVE=1 ./scripts/deploy-cloud-run-paas.sh
```

The script performs the full Terraform-managed PaaS setup:

- sets the active `gcloud` project and region
- runs `terraform init`, `terraform fmt`, and `terraform validate`
- bootstraps Artifact Registry with Terraform
- authenticates Docker to Artifact Registry
- builds and pushes the Cloud Run image for `linux/amd64`
- applies Terraform for Cloud SQL, Secret Manager, IAM, and Cloud Run
- forces a Cloud Run rollout for the pushed image tag
- prints the Cloud Run URL

The script reads values from `terraform/terraform.tfvars`. You can override values with environment variables:

```bash
PROJECT_ID="project-59d9fc88-ac5c-43c3-894" \
REGION="europe-west6" \
IMAGE_TAG="latest" \
./scripts/deploy-cloud-run-paas.sh
```

Set `FORCE_ROLLOUT=0` if you use immutable image tags and only want Terraform to perform the rollout:

```bash
FORCE_ROLLOUT=0 ./scripts/deploy-cloud-run-paas.sh
```

## 6. PaaS Manual Terraform Steps

Create Artifact Registry first, because Docker needs a repository before the image can be pushed:

```bash
terraform apply -target=google_artifact_registry_repository.docker
```

The `-target` warning is expected for this bootstrap step.

Authenticate Docker to Artifact Registry:

```bash
gcloud auth configure-docker europe-west6-docker.pkg.dev
```

### Build And Push Image

From the repository root:

```bash


docker buildx build \
  --platform linux/amd64 \
  -t europe-west6-docker.pkg.dev/project-59d9fc88-ac5c-43c3-894/travelmanager/app:latest \
  --push \
  .
```

Use `linux/amd64` so the image works on Cloud Run even when building on Apple Silicon.

### Apply Terraform

Apply the remaining infrastructure:

```bash
cd terraform
terraform plan
terraform apply
```

If Terraform previously failed while creating Cloud Run, the Cloud Run service may be tainted. That is fine; the next `terraform apply` will replace it.

Get the Cloud Run URL:

```bash
terraform output cloud_run_url
```

Test it:

```bash
curl -I "$(terraform output -raw cloud_run_url)"
```

## 7. PaaS Redeploy After Code Changes

Use the script for normal redeploys:

```bash
./scripts/deploy-cloud-run-paas.sh
```

Recommended Terraform rollout: use a new image tag for each release.

Edit `terraform/terraform.tfvars`:

```hcl
image_tag = "2026-04-20-1"
```

Build and push the same tag:

```bash
cd ..

docker buildx build \
  --platform linux/amd64 \
  -t europe-west6-docker.pkg.dev/project-59d9fc88-ac5c-43c3-894/travelmanager/app:2026-04-20-1 \
  --push \
  .
```

Then apply Terraform:

```bash
cd terraform
terraform apply
```

Quick rollout alternative: push `latest` and force a new Cloud Run revision:

```bash
cd ..

docker buildx build \
  --platform linux/amd64 \
  -t europe-west6-docker.pkg.dev/project-59d9fc88-ac5c-43c3-894/travelmanager/app:latest \
  --push \
  .
```

```bash
gcloud run services update travelmanager \
  --image europe-west6-docker.pkg.dev/project-59d9fc88-ac5c-43c3-894/travelmanager/app:latest \
  --region europe-west6 \
  --project project-59d9fc88-ac5c-43c3-894
```

## 8. PaaS Troubleshooting

Cloud Run says the container did not listen on `PORT=8080`:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="travelmanager"' \
  --project project-59d9fc88-ac5c-43c3-894 \
  --limit 100 \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)'
```

Known startup issues fixed in this repo:

- `JSON.parse(undefined)` from missing `FIREBASE_SERVICE_ACCOUNT`: fixed by making Firebase Admin optional at startup.
- Container did not listen quickly enough: fixed by moving DB setup and seed out of the blocking startup path.

Docker image push fails:

```bash
gcloud auth configure-docker europe-west6-docker.pkg.dev
gcloud artifacts repositories describe travelmanager \
  --location europe-west6 \
  --project project-59d9fc88-ac5c-43c3-894
```

Terraform cannot authenticate:

```bash
gcloud auth application-default login
```

Terraform plan fails:

```bash
cd terraform
terraform fmt
terraform validate
terraform plan
```

Check that:

- `terraform/terraform.tfvars` does not still contain placeholder values.
- `project_id` is `project-59d9fc88-ac5c-43c3-894`.
- `region` is `europe-west6`.
- the pushed image URI matches Terraform output `image_uri`.

Do not run manual `gcloud sql instances create` when using Terraform. Terraform already manages Cloud SQL. If you manually create PostgreSQL 16, Google may default to Enterprise Plus, where `db-f1-micro` is invalid.

## 9. PaaS Cleanup

Terraform manages the PaaS resources. To remove them:

```bash
cd terraform
terraform destroy
```

Review the destroy plan carefully. This can delete the Cloud SQL database.

## 10. IaaS VM Setup

Use this path only when you need a Compute Engine VM running Docker Compose.

Set values:

```bash
export PROJECT_ID="project-59d9fc88-ac5c-43c3-894"
export REGION="europe-west6"
export ZONE="europe-west6-a"
export VM_NAME="travelmanager-iaas"
export VM_MACHINE_TYPE="e2-medium"
export VM_TAG="travelmanager-web"
```

Create firewall rules:

```bash
gcloud compute firewall-rules create travelmanager-allow-http \
  --allow=tcp:80 \
  --target-tags="$VM_TAG" \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create travelmanager-allow-https \
  --allow=tcp:443 \
  --target-tags="$VM_TAG" \
  --source-ranges=0.0.0.0/0
```

Restrict SSH to your public IP:

```bash
export MY_PUBLIC_IP="$(curl -s https://ifconfig.me)"

gcloud compute firewall-rules create travelmanager-allow-ssh \
  --allow=tcp:22 \
  --target-tags="$VM_TAG" \
  --source-ranges="${MY_PUBLIC_IP}/32"
```

Create the VM:

```bash
gcloud compute instances create "$VM_NAME" \
  --zone="$ZONE" \
  --machine-type="$VM_MACHINE_TYPE" \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --tags="$VM_TAG" \
  --boot-disk-size=20GB
```

Get the VM public IP:

```bash
gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" \
  --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```

## 11. IaaS Install Docker

SSH into the VM:

```bash
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
```

Install Docker and Git on the VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"
```

Log out and back in:

```bash
exit
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
```

Verify:

```bash
docker version
docker compose version
```

## 12. IaaS Deploy Docker Compose

On the VM:

```bash
git clone https://github.com/cikoglukai/TravelManager.git
cd TravelManager
cp .env.example .env
docker compose up -d --build
```

Check:

```bash
docker compose ps
docker compose logs app
docker compose logs nginx
docker compose logs postgres
```

Update an existing VM deployment:

```bash
cd ~/TravelManager
git pull
docker compose up -d --build
docker compose ps
```

Do not run `docker compose down -v` unless you intentionally want to delete the PostgreSQL volume.

## 13. IaaS HTTPS

Point DNS to the VM public IP:

```text
onecloudaway.de      A  <VM_PUBLIC_IP>
www.onecloudaway.de  A  <VM_PUBLIC_IP>
```

Request certificates:

```bash
docker compose --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d onecloudaway.de \
  -d www.onecloudaway.de
```

Enable HTTPS and reload Nginx:

```bash
docker compose exec nginx sh /docker-entrypoint.d/99-enable-https.sh
docker compose exec nginx nginx -s reload
```

Test:

```bash
curl -I https://onecloudaway.de
```

Renew manually when needed:

```bash
docker compose --profile certbot run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

docker compose exec nginx nginx -s reload
```

## 14. Official References

- Cloud Run container deployment: https://cloud.google.com/run/docs/deploying
- Cloud Run container contract: https://cloud.google.com/run/docs/container-contract
- Cloud SQL for PostgreSQL from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL PostgreSQL users and roles: https://cloud.google.com/sql/docs/postgres/users
- Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- `gcloud auth configure-docker`: https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
