#!/usr/bin/env bash
set -euo pipefail

LOG=/var/log/startup.log
exec >>"$LOG" 2>&1

echo "===== startup: $(date -Iseconds) ====="

DOMAIN_NAME="${domain_name}"
LETSENCRYPT_EMAIL="${letsencrypt_email}"
IMAGE_URI="${image_uri}"
CLOUD_SQL_CONNECTION_NAME="${cloud_sql_connection_name}"
ARTIFACT_REGISTRY_HOST="${artifact_registry_host}"
DATABASE_URL_SECRET_ID="${database_url_secret_id}"
FIREBASE_API_KEY="${firebase_api_key}"
FIREBASE_AUTH_DOMAIN="${firebase_auth_domain}"
FIREBASE_PROJECT_ID="${firebase_project_id}"
FIREBASE_APP_ID="${firebase_app_id}"
FIREBASE_STORAGE_BUCKET="${firebase_storage_bucket}"

APP_DIR=/opt/travelmanager
mkdir -p "$APP_DIR/nginx"

# 1. Install Docker Engine + compose plugin + gcloud (if missing).
if ! command -v docker >/dev/null; then
  echo "Installing Docker..."
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release jq apt-transport-https
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

if ! command -v gcloud >/dev/null; then
  echo "Installing gcloud..."
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  apt-get update
  apt-get install -y google-cloud-cli
fi

systemctl enable --now docker

# 2. Authenticate docker to Artifact Registry via metadata-server creds.
gcloud auth configure-docker "$ARTIFACT_REGISTRY_HOST" --quiet

# 3. Write nginx configs.
cat > "$APP_DIR/nginx/default.conf" <<'NGINX_DEFAULT_EOF'
${nginx_default_conf}
NGINX_DEFAULT_EOF

cat > "$APP_DIR/nginx/https.conf.template" <<'NGINX_HTTPS_EOF'
${nginx_https_conf_template}
NGINX_HTTPS_EOF

cat > "$APP_DIR/nginx/99-enable-https.sh" <<'NGINX_HOOK_EOF'
${nginx_enable_https_script}
NGINX_HOOK_EOF
chmod +x "$APP_DIR/nginx/99-enable-https.sh"

# 4. Write docker-compose.yml.
cat > "$APP_DIR/docker-compose.yml" <<'COMPOSE_EOF'
${docker_compose_yml}
COMPOSE_EOF

# 5. Fetch DATABASE_URL from Secret Manager and assemble .env.
DATABASE_URL=$(gcloud secrets versions access latest --secret="$DATABASE_URL_SECRET_ID")

cat > "$APP_DIR/.env" <<EOF
DOMAIN_NAME=$DOMAIN_NAME
IMAGE_URI=$IMAGE_URI
CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME
DATABASE_URL=$DATABASE_URL
NUXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
NUXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
NUXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
GOOGLE_CLOUD_PROJECT=$FIREBASE_PROJECT_ID
EOF
chmod 600 "$APP_DIR/.env"

# 6. Pull image + bring up stack.
cd "$APP_DIR"
docker compose pull
docker compose up -d cloud-sql-proxy app nginx

# 7. Request Let's Encrypt cert if not present yet. Webroot challenge — DNS must
#    already point to this VM. Failure is non-fatal; can be re-run later.
LE_LIVE_DIR="/var/lib/docker/volumes/travelmanager_letsencrypt/_data/live/$DOMAIN_NAME"
if [ ! -d "$LE_LIVE_DIR" ]; then
  echo "Attempting initial Let's Encrypt issuance for $DOMAIN_NAME..."
  if docker compose run --rm certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        --email "$LETSENCRYPT_EMAIL" \
        --agree-tos --no-eff-email \
        --non-interactive \
        -d "$DOMAIN_NAME"; then
    echo "Certificate issued; reloading nginx."
    docker compose restart nginx
  else
    echo "Certbot failed (likely DNS not yet pointing to this VM). Retry manually with: docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email -d $DOMAIN_NAME && docker compose restart nginx"
  fi
fi

touch "$APP_DIR/.bootstrap.done"
echo "===== startup: complete $(date -Iseconds) ====="
