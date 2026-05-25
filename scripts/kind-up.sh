#!/usr/bin/env bash
# Spin up the full TravelManager microservice stack on a local kind cluster.
# Requires: docker, kind, kubectl, helm.
#
#   ./scripts/kind-up.sh
#   # then open http://travelmanager.localtest.me  (resolves to 127.0.0.1)
set -euo pipefail

CLUSTER=travelmanager
SERVICES=(api-gateway user-service trip-service destination-service social-service travel-info-service notification-service)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Create kind cluster (with host ports 80/443 mapped for ingress)"
if ! kind get clusters | grep -qx "$CLUSTER"; then
  cat <<'EOF' | kind create cluster --name travelmanager --config -
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - { containerPort: 80,  hostPort: 80,  protocol: TCP }
      - { containerPort: 443, hostPort: 443, protocol: TCP }
EOF
fi

echo "==> Install ingress-nginx"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
# Wait on the Deployment rollout (tolerates the controller pod not existing yet),
# then on readiness. `kubectl wait` on a selector races and errors with
# "no matching resources found" if run before the pod is scheduled.
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s
kubectl -n ingress-nginx wait --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=180s

echo "==> Build + load images"
docker build -t travelmanager/frontend:local .
kind load docker-image travelmanager/frontend:local --name "$CLUSTER"
for s in "${SERVICES[@]}"; do
  docker build -f Dockerfile.service --build-arg SERVICE="$s" -t "travelmanager/$s:local" .
  kind load docker-image "travelmanager/$s:local" --name "$CLUSTER"
done

echo "==> Helm install"
helm upgrade --install travelmanager k8s/travelmanager -f k8s/travelmanager/values-local.yaml --wait --timeout 5m

echo "==> Done. Pods:"
kubectl get pods
echo "Open http://travelmanager.localtest.me"
echo "Seed a tenant/role for B2B, e.g.:"
echo "  kubectl exec deploy/api-gateway -- true   # (use port-forward + x-debug-uid to call APIs)"
