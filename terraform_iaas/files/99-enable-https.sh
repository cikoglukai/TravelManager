#!/bin/sh
set -eu

DOMAIN="${DOMAIN_NAME:-}"
if [ -z "$DOMAIN" ]; then
    echo "DOMAIN_NAME env var not set; leaving HTTPS disabled"
    rm -f /etc/nginx/conf.d/https.conf
    exit 0
fi

CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
RENDERED_TEMPLATE="/etc/nginx/conf.d/https.conf"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "Enabled HTTPS config for $DOMAIN (rendered template kept at $RENDERED_TEMPLATE)"
else
    rm -f "$RENDERED_TEMPLATE"
    echo "HTTPS certificates not found for $DOMAIN; starting with HTTP only"
fi
