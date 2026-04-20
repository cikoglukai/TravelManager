# TravelManager Google Cloud Full Setup

This guide documents two alternative Google Cloud deployment paths for TravelManager. Choose the one your assignment or deployment target requires:

- IaaS: Compute Engine VM running the full Docker Compose stack.
- PaaS: Cloud Run running only the app image, with Cloud SQL for PostgreSQL.

Use the IaaS path when you need to manage a virtual machine and run Docker Compose yourself. Use the PaaS path when you need a managed Cloud Run deployment.

## 0. Current Repository Assumptions

These files are already aligned for Google Cloud:

- `Dockerfile` builds the Nuxt/Nitro production app and listens on `0.0.0.0:8080`.
- `docker-compose.yml` runs `nginx`, `app`, `postgres`, and optional `certbot`.
- `nginx/default.conf` and `nginx/https.conf.template` proxy to `app:8080`.
- `.dockerignore` keeps local build output and `node_modules` out of the image.

Important port model:

| Component | Port | Public? | Used By |
|---|---:|---:|---|
| Nginx HTTP | `80` | Yes | IaaS VM |
| Nginx HTTPS | `443` | Yes | IaaS VM |
| App container | `8080` | No on VM, yes inside Cloud Run | Dockerfile, Compose, Cloud Run |
| Local app debug bind | `127.0.0.1:3000` | No | VM/local debugging |
| Local Postgres debug bind | `127.0.0.1:5433` | No | VM/local debugging |
| Compose Postgres | `5432` | No | App container on VM |

## 1. Fill In Your Values

Set the values for the deployment path you choose. The shared values are needed for either path; the Cloud SQL values are needed only for PaaS; the VM values are needed only for IaaS.

```bash
export PROJECT_ID="your-google-cloud-project-id"
export REGION="europe-west1"
export ZONE="europe-west1-b"

export AR_REPO="travelmanager"
export IMAGE_NAME="app"
export IMAGE_TAG="latest"
export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

export CLOUD_RUN_SERVICE="travelmanager"
export CLOUD_SQL_INSTANCE="travelmanager-postgres"
export CLOUD_SQL_DATABASE="travelmanager"
export CLOUD_SQL_USER="travelmanager"
export CLOUD_SQL_PASSWORD="replace-with-a-strong-password"

export VM_NAME="travelmanager-iaas"
export VM_MACHINE_TYPE="e2-medium"
export VM_TAG="travelmanager-web"
```

Check that the values look right:

```bash
echo "$PROJECT_ID"
echo "$IMAGE_URI"
```

Your Google account needs permission to create and manage Compute Engine, Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, IAM bindings, and service accounts in the project. Project Owner works for a university/demo setup; for production, use narrower IAM roles.

## 2. Install Local Tools

On your local machine you need:

- Google Cloud CLI: `gcloud`
- Docker with Buildx support
- Git

Check them:

```bash
gcloud version
docker version
docker buildx version
git --version
```

Log in and select the project:

```bash
gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"
gcloud config set compute/zone "$ZONE"
```

## 3. Enable Google Cloud APIs

Enable the services needed for the selected deployment path. For a simple setup, enabling all of these APIs is fine:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com
```

## 4. Create Artifact Registry

This section is required for the PaaS Cloud Run path. It is optional for the IaaS path because the VM can build the image directly from the repository with Docker Compose.

Create the Docker repository for the Cloud Run image:

```bash
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="TravelManager Docker images"
```

If the repository already exists, this command can fail with an "already exists" error. That is fine; continue.

Authenticate Docker to Artifact Registry:

```bash
gcloud auth configure-docker "${REGION}-docker.pkg.dev"
```

## 5. Build And Push The Cloud Run Image

This section is required only for the PaaS Cloud Run path.

Run this from the repository root:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE_URI" \
  --push \
  .
```

Why `linux/amd64`: Cloud Run supports Linux x86_64 containers. Building explicitly avoids accidentally pushing an ARM-only image from an Apple Silicon machine.

## 6. PaaS: Create Cloud SQL

Cloud Run should not run the Compose Postgres container. Use Cloud SQL for PostgreSQL.

Create the PostgreSQL instance:

```bash
gcloud sql instances create "$CLOUD_SQL_INSTANCE" \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB
```

Create the database:

```bash
gcloud sql databases create "$CLOUD_SQL_DATABASE" \
  --instance="$CLOUD_SQL_INSTANCE"
```

Create the database user:

```bash
gcloud sql users create "$CLOUD_SQL_USER" \
  --instance="$CLOUD_SQL_INSTANCE" \
  --password="$CLOUD_SQL_PASSWORD"
```

Get the Cloud SQL connection name:

```bash
export INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --format='value(connectionName)')"
echo "$INSTANCE_CONNECTION_NAME"
```

Build the `DATABASE_URL` used by the app:

```bash
export CLOUD_RUN_DATABASE_URL="postgresql://${CLOUD_SQL_USER}:${CLOUD_SQL_PASSWORD}@/${CLOUD_SQL_DATABASE}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"
```

Do not print this value in shared terminals because it contains the database password. If your password contains special URL characters such as `@`, `:`, `/`, `?`, `#`, or `&`, URL-encode it before building this string.

## 7. PaaS: Store The Cloud Run Database URL In Secret Manager

Create a secret:

```bash
gcloud secrets create travelmanager-database-url \
  --replication-policy=automatic
```

Add the database URL as the first secret version:

```bash
printf "%s" "$CLOUD_RUN_DATABASE_URL" | \
  gcloud secrets versions add travelmanager-database-url \
    --data-file=-
```

## 8. PaaS: Create A Cloud Run Service Account

Create a dedicated runtime service account:

```bash
gcloud iam service-accounts create travelmanager-run \
  --display-name="TravelManager Cloud Run runtime"
```

Set the service account email:

```bash
export CLOUD_RUN_SA="travelmanager-run@${PROJECT_ID}.iam.gserviceaccount.com"
```

Allow the service account to connect to Cloud SQL:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/cloudsql.client"
```

Allow the service account to read the database secret:

```bash
gcloud secrets add-iam-policy-binding travelmanager-database-url \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## 9. PaaS: Deploy To Cloud Run

Deploy the app image:

```bash
gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --platform=managed \
  --service-account="$CLOUD_RUN_SA" \
  --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=travelmanager-database-url:latest" \
  --set-env-vars="NITRO_HOST=0.0.0.0,NITRO_PORT=8080,NODE_ENV=production"
```

Get the Cloud Run URL:

```bash
gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$REGION" \
  --format='value(status.url)'
```

Test it:

```bash
curl -I "$(gcloud run services describe "$CLOUD_RUN_SERVICE" --region="$REGION" --format='value(status.url)')"
```

## 10. IaaS: Create The Compute Engine VM

Start here if you chose the IaaS Docker Compose deployment path.

The VM runs the full Docker Compose stack:

```text
Browser -> VM:80/443 -> nginx -> app:8080 -> postgres:5432
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

For SSH, restrict access to your own public IP if possible:

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

## 11. IaaS: Point DNS To The VM

In your DNS provider, point the IaaS hostname to the VM public IP.

For the current Nginx config, use:

```text
onecloudaway.de      A  <VM_PUBLIC_IP>
www.onecloudaway.de  A  <VM_PUBLIC_IP>
```

Wait until DNS resolves:

```bash
dig +short onecloudaway.de
dig +short www.onecloudaway.de
```

## 12. IaaS: Install Docker On The VM

SSH into the VM:

```bash
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
```

On the VM, install Docker and Git:

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

Log out and back in so the Docker group membership takes effect:

```bash
exit
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
```

Check Docker:

```bash
docker version
docker compose version
```

## 13. IaaS: Deploy With Docker Compose

On the VM:

```bash
git clone https://github.com/cikoglukai/TravelManager.git
cd TravelManager
cp .env.example .env
docker compose up -d --build
```

Check the containers:

```bash
docker compose ps
docker compose logs app
docker compose logs nginx
docker compose logs postgres
```

Test HTTP:

```bash
curl -I http://onecloudaway.de
```

At this point, the IaaS deployment is running with local Compose PostgreSQL.

## 14. IaaS: Enable HTTPS On The VM

Request the Let's Encrypt certificate:

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

Enable the HTTPS Nginx config and reload Nginx:

```bash
docker compose exec nginx sh /docker-entrypoint.d/99-enable-https.sh
docker compose exec nginx nginx -s reload
```

Test HTTPS:

```bash
curl -I https://onecloudaway.de
```

Renew certificates manually when needed:

```bash
docker compose --profile certbot run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

docker compose exec nginx nginx -s reload
```

## 15. Verify The Selected Deployment

For PaaS Cloud Run:

```bash
gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$REGION" \
  --format='value(status.url)'
```

For IaaS VM:

```bash
curl -I https://onecloudaway.de
```

VM containers:

```bash
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
cd TravelManager
docker compose ps
```

Expected result for the selected path:

| Path | URL | Database |
|---|---|---|
| IaaS VM | `https://onecloudaway.de` | Compose PostgreSQL on the VM |
| PaaS Cloud Run | Cloud Run generated URL | Cloud SQL PostgreSQL |

## 16. Redeploy After Code Changes

For PaaS Cloud Run:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE_URI" \
  --push \
  .

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --image="$IMAGE_URI" \
  --region="$REGION"
```

For the IaaS VM:

```bash
gcloud compute ssh "$VM_NAME" --zone="$ZONE"
cd TravelManager
git pull
docker compose up -d --build
docker compose ps
```

## 17. Optional: Use A Custom Domain

For IaaS, point your domain to the VM public IP:

```text
onecloudaway.de      -> VM public IP
www.onecloudaway.de  -> VM public IP
```

Then update:

- `nginx/default.conf`
- `nginx/https.conf.template`
- `DEPLOYMENT_HTTPS.md`

For PaaS Cloud Run, use the Google Cloud console domain mapping flow or `gcloud run domain-mappings`.

## 18. Stop Or Remove Resources

Stop the VM to reduce IaaS compute cost:

```bash
gcloud compute instances stop "$VM_NAME" --zone="$ZONE"
```

Start it again:

```bash
gcloud compute instances start "$VM_NAME" --zone="$ZONE"
```

Delete the Cloud Run service if you used the PaaS path:

```bash
gcloud run services delete "$CLOUD_RUN_SERVICE" --region="$REGION"
```

Delete the Cloud SQL instance only if you used the PaaS path and no longer need the database:

```bash
gcloud sql instances delete "$CLOUD_SQL_INSTANCE"
```

Delete the VM only if you used the IaaS path and no longer need it:

```bash
gcloud compute instances delete "$VM_NAME" --zone="$ZONE"
```

## 19. Troubleshooting

Cloud Run cannot connect to the database:

```bash
gcloud run services describe "$CLOUD_RUN_SERVICE" --region="$REGION"
gcloud sql instances describe "$CLOUD_SQL_INSTANCE"
gcloud secrets versions access latest --secret=travelmanager-database-url
```

Check that:

- Cloud Run has `--add-cloudsql-instances`.
- The Cloud Run service account has `roles/cloudsql.client`.
- The Cloud Run service account can access the `travelmanager-database-url` secret.
- The `DATABASE_URL` uses `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`.

Cloud Run starts but returns errors:

```bash
gcloud run services logs read "$CLOUD_RUN_SERVICE" --region="$REGION" --limit=100
```

VM Nginx cannot reach the app:

```bash
docker compose ps
docker compose logs app
docker compose logs nginx
docker compose exec nginx wget -S -O - http://app:8080
```

Docker image push fails:

```bash
gcloud auth configure-docker "${REGION}-docker.pkg.dev"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION"
```

## 20. Official References

- Cloud Run container deployment: https://cloud.google.com/run/docs/deploying
- Cloud Run container contract: https://cloud.google.com/run/docs/container-contract
- Cloud SQL for PostgreSQL from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- `gcloud auth configure-docker`: https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker
