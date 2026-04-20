# Google Cloud Deployment Notes

This repository supports two Google Cloud deployment styles:

- IaaS: a Compute Engine VM runs the full `docker-compose.yml` stack.
- PaaS: Cloud Run runs only the application image built by `Dockerfile`.

The internal application port is `8080` in both paths. For VM deployment, Nginx proxies to `app:8080`. For Cloud Run, the application container listens on `0.0.0.0:8080`; Cloud Run terminates HTTPS and forwards traffic to the container.

## IaaS: Compute Engine VM with Docker Compose

Use this path when the project requirement is to manage a VM and run the database yourself.

Runtime components:

- `nginx`: public HTTP/HTTPS entry point on ports `80` and `443`
- `app`: Nuxt/Nitro application built from `Dockerfile`, internal port `8080`
- `postgres`: PostgreSQL 16 with persistent Docker volume `postgres_data`
- `certbot`: optional helper profile for Let's Encrypt certificates

Recommended firewall rules:

- Allow `22/tcp` only from trusted admin IPs.
- Allow `80/tcp` for HTTP and Let's Encrypt validation.
- Allow `443/tcp` for HTTPS.
- Do not expose `3000/tcp` or `5433/tcp` publicly.

Example VM setup after Docker and Git are installed:

```bash
git clone https://github.com/cikoglukai/TravelManager.git
cd TravelManager
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Traffic flow:

```text
Browser -> VM:80/443 -> nginx -> app:8080 -> postgres:5432
```

Local-only helper bindings:

- `127.0.0.1:3000` maps to the app container for direct debugging on the VM.
- `127.0.0.1:5433` maps to PostgreSQL for local scripts or SSH-forwarded database access.

## PaaS: Cloud Run with Cloud SQL

Use this path when the project requirement is a managed platform deployment.

Cloud Run should run only the application image. Do not deploy the Compose stack to Cloud Run:

- No Nginx container is needed; Cloud Run handles HTTPS.
- No Certbot container is needed; Cloud Run manages TLS at the platform edge.
- No Postgres container should run inside Cloud Run; use Cloud SQL for PostgreSQL.

Build and push the image with Cloud Build:

```bash
gcloud artifacts repositories create travelmanager \
  --repository-format=docker \
  --location=europe-west1

gcloud builds submit \
  --tag europe-west1-docker.pkg.dev/PROJECT_ID/travelmanager/app:latest
```

Deploy to Cloud Run:

```bash
gcloud run deploy travelmanager \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/travelmanager/app:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:europe-west1:INSTANCE_NAME \
  --set-env-vars "DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:europe-west1:INSTANCE_NAME"
```

Replace these placeholders before deployment:

- `PROJECT_ID`: Google Cloud project ID
- `INSTANCE_NAME`: Cloud SQL PostgreSQL instance name
- `DB_USER`: database user
- `DB_PASSWORD`: database password
- `DB_NAME`: database name, for example `travelmanager`

Cloud Run notes:

- The container must listen on `0.0.0.0`.
- Cloud Run sends requests to port `8080` by default and injects the `PORT` environment variable.
- This image also sets `NITRO_HOST=0.0.0.0` and `NITRO_PORT=8080`, so the Nuxt/Nitro server matches the Cloud Run default.
- Keep secrets such as database passwords in Secret Manager for a real deployment instead of writing them directly into the command.

## Which File Is Used Where

| File | IaaS VM | Cloud Run |
|---|---:|---:|
| `Dockerfile` | Yes, builds the app service | Yes, builds the Cloud Run image |
| `docker-compose.yml` | Yes, runs Nginx, app, Postgres, Certbot | No |
| `nginx/*` | Yes | No |
| `.env.example` | Yes, VM/local reference | Reference only |
| `server/utils/db.js` | Yes | Yes |

