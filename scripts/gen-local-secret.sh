#!/usr/bin/env bash
# Generate a gitignored Helm overlay from the root .env so real keys (Firebase
# web config, RapidAPI) never get committed. Firebase web config → frontend env
# (via global.extraEnv); RAPIDAPI_KEY → trip-service Secret.
#
#   ./scripts/gen-local-secret.sh
#   helm upgrade travelmanager k8s/travelmanager \
#     -f k8s/travelmanager/values-local.yaml \
#     -f k8s/travelmanager/values-local.secret.yaml
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

[ -f .env ] || { echo ".env not found"; exit 1; }
set -a; . ./.env; set +a   # source .env

OUT=k8s/travelmanager/values-local.secret.yaml
cat > "$OUT" <<EOF
# AUTO-GENERATED from .env by scripts/gen-local-secret.sh — DO NOT COMMIT.
global:
  extraEnv:
    - { name: PUBSUB_DISABLED, value: "1" }
    - { name: GATEWAY_SKIP_AUTH, value: "1" }
    - { name: NUXT_PUBLIC_FIREBASE_API_KEY,        value: "${NUXT_PUBLIC_FIREBASE_API_KEY:-}" }
    - { name: NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,    value: "${NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" }
    - { name: NUXT_PUBLIC_FIREBASE_PROJECT_ID,     value: "${NUXT_PUBLIC_FIREBASE_PROJECT_ID:-}" }
    - { name: NUXT_PUBLIC_FIREBASE_APP_ID,         value: "${NUXT_PUBLIC_FIREBASE_APP_ID:-}" }
    - { name: NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET, value: "${NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" }
localSecretValues:
  trip-service:
    RAPIDAPI_KEY: "${RAPIDAPI_KEY:-}"
EOF
echo "wrote $OUT (gitignored)"
