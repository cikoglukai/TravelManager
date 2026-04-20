# HTTPS Deployment Notes

This repository is prepared for a simple Docker Compose + Nginx + Certbot setup on an Azure Ubuntu VM.

## Files used for HTTPS

- `docker-compose.yml`: keeps `nginx` public on ports `80` and `443`, keeps `app` and `postgres` internal, and shares Let’s Encrypt volumes with a `certbot` helper container.
- `nginx/default.conf`: serves `onecloudaway.de` on HTTP, exposes the ACME challenge path, and proxies normal requests to `app:8080`.
- `nginx/https.conf.template`: defines the HTTPS server block and points to the standard Let’s Encrypt certificate paths.
- `nginx/99-enable-https.sh`: activates the HTTPS config only when the real certificate files already exist.

## VM commands

Pull the updated repository and prepare the environment:

```bash
cd ~/TravelManager
git pull
cp .env.example .env
```

Build and start the public stack:

```bash
docker compose up -d --build
```

Request the initial Let’s Encrypt certificate:

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

Enable HTTPS in Nginx and reload it:

```bash
docker compose exec nginx sh /docker-entrypoint.d/99-enable-https.sh
docker compose exec nginx nginx -s reload
```

Verify the deployment:

```bash
docker compose ps
curl -I http://onecloudaway.de
curl -I https://onecloudaway.de
```

Optional certificate renewal command:

```bash
docker compose --profile certbot run --rm certbot renew --webroot --webroot-path /var/www/certbot
docker compose exec nginx nginx -s reload
```

## Azure and DNS prerequisites

- Port `443/tcp` must be allowed in the Azure Network Security Group.
- The DNS name `onecloudaway.de` must already resolve to the VM public IP.
- The VM must be running when requesting or renewing certificates.
- Let’s Encrypt HTTP validation requires port `80/tcp` to be reachable from the public internet.
