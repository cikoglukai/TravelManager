# TravelManager — Manual GKE Deployment Runbook

First production bring-up of the microservices stack on **GKE Autopilot**. This is the
manual path (build + push + `helm upgrade` from a laptop); CI automates the same flow
via `.github/workflows/deploy.yml`. It also records the bugs we hit on the first run
and how they were fixed, so they don't recur.

**Environment:** project `project-59d9fc88-ac5c-43c3-894`, region `europe-west1`,
cluster `travelmanager-gke`, registry
`europe-west1-docker.pkg.dev/<PROJECT>/travelmanager`.

---

## 0. Prerequisites
- `gcloud auth login` and `gcloud auth application-default login` (Terraform uses ADC).
- `gke-gcloud-auth-plugin` installed — `gcloud components install gke-gcloud-auth-plugin`.
  Without it, `kubectl` can't authenticate to GKE (`executable gke-gcloud-auth-plugin not found`).
- Docker. On Apple Silicon you **must** build `--platform linux/amd64` (GKE nodes are x86).
- `helm`, `kubectl`.

---

## 1. Terraform — infrastructure
```bash
cd terraform_gke
cp terraform.tfvars.example terraform.tfvars   # fill project_id, db_password, API keys
terraform init && terraform apply
```
Creates: GKE Autopilot cluster, Artifact Registry repo, Cloud SQL Postgres 16 + 6
per-service databases, per-service Secret Manager secrets, Pub/Sub topics +
subscriptions + DLQs, the runtime service account + Workload Identity binding, and the
reserved global static IP.

**Gotchas fixed:**
- `replication { auto {} }` as a single line is invalid HCL — must be a multi-line
  block:
  ```hcl
  replication {
    auto {}
  }
  ```
- Secret Manager **rejects an empty secret value** (`Error 400: Field [payload] is
  required`). Give optional secrets a non-empty placeholder (e.g.
  `sendgrid_api_key = "disabled"`); empty `""` fails. `firebase_service_account = "{}"`
  is fine because it's non-empty.
- Cloud SQL instance names are **unique per project across all regions**. A leftover
  `travelmanager-postgres` (europe-west6, from the old Cloud Run deploy) blocked the
  create and it hung ~60 min. Fix: set a distinct `db_instance_name` — we used
  `travelmanager-pg-gke`.
- Timings: Cloud SQL create alone is 10–25 min; the Autopilot cluster ~7 min.

Keep these outputs: `ingress_ip` (`8.232.102.95`), `cloud_sql_connection_name`
(`<PROJECT>:europe-west1:travelmanager-pg-gke`), `gke_runtime_sa`.

---

## 2. Cluster credentials + External Secrets Operator
```bash
gcloud container clusters get-credentials travelmanager-gke --region europe-west1 --project <PROJECT>

helm repo add external-secrets https://charts.external-secrets.io && helm repo update
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --version 0.9.20 --set installCRDs=true --wait
```
**Gotcha:** the chart's ExternalSecret manifests use `external-secrets.io/v1beta1`.
The latest ESO (0.17+) dropped `v1beta1`, so the store/manifests fail to apply. Pin
ESO **0.9.20** (serves `v1beta1`). Also create the store *after* the CRDs register — a
same-pipe `kubectl apply` once raced and errored `no matches for kind "ClusterSecretStore"`.

Create the Workload-Identity-bound KSA + the ClusterSecretStore the chart references:
```bash
kubectl create serviceaccount travelmanager -n default
kubectl annotate serviceaccount travelmanager -n default \
  iam.gke.io/gcp-service-account=travelmanager-gke@<PROJECT>.iam.gserviceaccount.com --overwrite

cat <<'EOF' | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-store
spec:
  provider:
    gcpsm:
      projectID: <PROJECT>
      auth:
        workloadIdentity:
          clusterLocation: europe-west1
          clusterName: travelmanager-gke
          serviceAccountRef:
            name: travelmanager
            namespace: default
EOF
```
**Note:** Helm also wants to own the `travelmanager` SA. Before the first
`helm upgrade`, stamp Helm ownership on it, or helm refuses to adopt it
(`invalid ownership metadata`):
```bash
kubectl label sa travelmanager -n default app.kubernetes.io/managed-by=Helm --overwrite
kubectl annotate sa travelmanager -n default \
  meta.helm.sh/release-name=travelmanager meta.helm.sh/release-namespace=default --overwrite
```

---

## 3. Build + push the 8 images
```bash
REG="europe-west1-docker.pkg.dev/<PROJECT>/travelmanager"
gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet

for s in api-gateway user-service trip-service destination-service \
         social-service travel-info-service notification-service; do
  docker build --platform linux/amd64 -f Dockerfile.service --build-arg SERVICE=$s \
    -t "$REG/${s}:latest" .
  docker push "$REG/${s}:latest"
done
docker build --platform linux/amd64 -t "$REG/frontend:latest" .
docker push "$REG/frontend:latest"
```
**Gotchas:**
- **Brace the variable**: `"$REG/$s:latest"` makes zsh apply its `:l` history
  modifier, mangling the tag (e.g. `api-gateway` → `api-gatewayatest`). Always
  `"$REG/${s}:latest"`.
- `--platform linux/amd64` is mandatory on Apple Silicon.

---

## 4. Grant the node service account image-pull access (NOT in Terraform)
GKE Autopilot nodes run as the **default compute service account**, which can't read
Artifact Registry in a fresh project → every pod `ImagePullBackOff` with `403 Forbidden`.
```bash
gcloud projects add-iam-policy-binding <PROJECT> \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
kubectl rollout restart deploy -n default
```

---

## 5. Deploy with Helm
The `NUXT_PUBLIC_*` browser config (Firebase web config + Maps browser key) is injected
into every pod as runtime env via `global.extraEnv`. These are client-side public values
(they ship in the SPA bundle); the Maps browser key is protected by HTTP-referrer
restriction, not secrecy. Source them from the repo-root `.env` so no secret is typed into
the shell or committed:
```bash
set -a; source .env; set +a   # loads NUXT_PUBLIC_* from repo-root .env

helm upgrade --install travelmanager k8s/travelmanager \
  --set global.imageRegistry="$REG" \
  --set global.imageTag=latest \
  --set global.gcpProject=<PROJECT> \
  --set global.cloudSqlInstance=<PROJECT>:europe-west1:travelmanager-pg-gke \
  --set serviceAccount.gcpServiceAccount=travelmanager-gke@<PROJECT>.iam.gserviceaccount.com \
  --set ingress.preSharedCert=onecloudaway-cert \
  --set-string "global.extraEnv[0].name=NUXT_PUBLIC_GOOGLE_MAPS_KEY" \
  --set-string "global.extraEnv[0].value=$NUXT_PUBLIC_GOOGLE_MAPS_KEY" \
  --set-string "global.extraEnv[1].name=NUXT_PUBLIC_FIREBASE_API_KEY" \
  --set-string "global.extraEnv[1].value=$NUXT_PUBLIC_FIREBASE_API_KEY" \
  --set-string "global.extraEnv[2].name=NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --set-string "global.extraEnv[2].value=$NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --set-string "global.extraEnv[3].name=NUXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --set-string "global.extraEnv[3].value=$NUXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --set-string "global.extraEnv[4].name=NUXT_PUBLIC_FIREBASE_APP_ID" \
  --set-string "global.extraEnv[4].value=$NUXT_PUBLIC_FIREBASE_APP_ID" \
  --set-string "global.extraEnv[5].name=NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --set-string "global.extraEnv[5].value=$NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --wait --timeout 10m
```
**Note on re-runs:** Helm `--set` values are not persisted across upgrades. A later
`helm upgrade` that omits these flags drops the env again — either re-pass them every time,
or add `--reuse-values` to keep the prior release's values and only override what changed:
```bash
helm upgrade travelmanager k8s/travelmanager --reuse-values \
  --set-string "global.extraEnv[1].name=NUXT_PUBLIC_FIREBASE_API_KEY" \
  --set-string "global.extraEnv[1].value=$NUXT_PUBLIC_FIREBASE_API_KEY"   # …etc
```

---

## 6. Chart bugs found + fixed during bring-up
All four are now fixed in the chart (`k8s/travelmanager/templates/`):

- **Ingress never provisioned** (no ADDRESS, no NEG, no controller events): the chart
  used `spec.ingressClassName: gce`, but GKE's ingress-gce controller matches the
  annotation `kubernetes.io/ingress.class: "gce"` — there is no `gce` IngressClass
  object, so nothing claimed the Ingress. Fix: emit the annotation for the gce path;
  keep `ingressClassName` only for the local nginx path.
- **All inter-service calls timed out** (`UND_ERR_CONNECT_TIMEOUT`): the NetworkPolicy
  selects pods by `app.kubernetes.io/part-of: travelmanager`, but the pod templates
  only had `app: <name>`, so the allow rule matched no pods and default-deny dropped
  everything. Fix: add `part-of` to the pod template labels (sync + worker).
- **Frontend backend UNHEALTHY → 502 on `/`**: only `api-gateway` had an open-ingress
  NetworkPolicy, so the GCP load-balancer health checker (Google IP ranges, not a
  cluster pod) was blocked from the frontend. Fix: the rule
  `allow-ingress-to-lb-facing` now selects both `api-gateway` and `frontend`.
- **HTTPS**: rather than wait 15–60 min for a new ManagedCertificate, reuse the
  existing ACTIVE Google-managed cert via a new chart value `ingress.preSharedCert`
  (renders `ingress.gcp.kubernetes.io/pre-shared-cert`) → HTTPS live immediately.
- **Login broke with `Firebase: No Firebase App '[DEFAULT]' has been created`**: the
  first deploy omitted the `NUXT_PUBLIC_*` `global.extraEnv` (it was deferred — see §5),
  so the frontend served `firebase:{apiKey:""}`. The client plugin
  (`app/plugins/0.firebase.client.js`) skips `initializeApp()` when `apiKey` is empty, so
  any later `getAuth()` throws. Fix: deploy with the `extraEnv` block from §5. Verify the
  served payload carries the key:
  ```bash
  curl -s https://onecloudaway.de/ | grep -o 'firebase:{apiKey:"[^"]*"'   # non-empty
  ```

---

## 7. DNS + HTTPS
Point the `onecloudaway.de` A record at `8.232.102.95` (it previously pointed at the
old LB `34.13.76.231`). HTTPS works as soon as DNS propagates, because the cert
`onecloudaway-cert` is already ACTIVE for the domain.

---

## 8. Verify
```bash
kubectl get pods                                          # all Running; DB services 2/2
kubectl get externalsecrets                               # SecretSynced=True
kubectl describe ingress travelmanager | grep -A2 backends # both backends HEALTHY
curl -I -H 'Host: onecloudaway.de' http://8.232.102.95/   # HTTP/1.1 200, x-powered-by: Nuxt
curl -Ik -H 'Host: onecloudaway.de' https://8.232.102.95/ # 200 over HTTPS
```

---

## Still TODO
- Move the node-SA `artifactregistry.reader` binding (§4) into `terraform_gke/iam.tf`
  so it's reproducible instead of a manual gcloud step.
- Persist the `NUXT_PUBLIC_*` `global.extraEnv` values in a gitignored `values-prod.yaml`
  (or `values.yaml` `global.extraEnv`) so they survive a plain `helm upgrade` without
  `--reuse-values` and without re-passing every flag.
