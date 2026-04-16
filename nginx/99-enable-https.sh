#!/bin/sh
set -eu

DOMAIN="onecloudaway.de"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
HTTPS_TEMPLATE="/etc/nginx/templates/https.conf.template"
HTTPS_TARGET="/etc/nginx/conf.d/https.conf"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    cp "$HTTPS_TEMPLATE" "$HTTPS_TARGET"
    echo "Enabled HTTPS config for $DOMAIN"
else
    rm -f "$HTTPS_TARGET"
    echo "HTTPS certificates not found for $DOMAIN; starting with HTTP only"
fi
