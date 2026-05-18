# Helm charts

Library chart `_template/` provides reusable templates (`tm.deployment`, `tm.service`, `tm.hpa`, `tm.serviceAccount`, `tm.externalSecret`, `tm.pdb`, `tm.networkPolicy`, `tm.serviceMonitor`).

Each per-service chart (e.g. `trip/`, `bff-gateway/`) is an application chart that depends on the library and renders all resources via a single `templates/all.yaml`.

## Install (staging)

```bash
# bootstrap deps once
for c in bff-gateway identity-tenant trip booking-integrations; do
  helm dependency update deploy/helm/$c
done

# create namespaces
kubectl create namespace shared-services --dry-run=client -o yaml | kubectl apply -f -

# deploy
helm upgrade --install bff-gateway          deploy/helm/bff-gateway          -n shared-services -f deploy/helm/values/staging.yaml
helm upgrade --install identity-tenant      deploy/helm/identity-tenant      -n shared-services -f deploy/helm/values/staging.yaml
helm upgrade --install trip                 deploy/helm/trip                 -n shared-services -f deploy/helm/values/staging.yaml
helm upgrade --install booking-integrations deploy/helm/booking-integrations -n shared-services -f deploy/helm/values/staging.yaml
```

## Image tag

`{global.image.tag}` is overwritten by CI to `sha-<git-sha>` (see `.github/workflows/cd-staging.yml`).

## REPLACE-PROJECT

Search-and-replace `REPLACE-PROJECT` with the actual GCP project ID before first apply.
