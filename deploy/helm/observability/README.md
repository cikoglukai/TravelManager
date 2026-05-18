# observability

Install once per cluster in the `infra` namespace:

```bash
helm dependency update deploy/helm/observability
helm upgrade --install observability deploy/helm/observability \
  -n infra --create-namespace -f deploy/helm/observability/values.yaml
```

Includes:
- `kube-prometheus-stack` — Prometheus + Alertmanager + Grafana, ServiceMonitor auto-discovery cluster-wide
- `custom-metrics-stackdriver-adapter` — registers `pubsub.googleapis.com|subscription|num_undelivered_messages` as an external metric the HPA can scale on (via Workload Identity)

Per-service charts already expose `ServiceMonitor` resources (template in `_template/templates/servicemonitor.yaml`). Pod annotations `prometheus.io/scrape: "true"` enable scrape.

## HPA on Pub/Sub queue depth

Set in per-service values.yaml:
```yaml
hpa:
  pubsubSubscription: notification.dispatch
  pubsubMessagesPerPod: 100
```
The `_template/templates/hpa.yaml` chooses the `External` metric `pubsub.googleapis.com|subscription|num_undelivered_messages` with `resource.labels.subscription_id` matcher.

## Dashboards

`dashboards/travelmanager-overview.json` — labelled `grafana_dashboard: "1"` to be picked up by Grafana sidecar (mount as ConfigMap).
