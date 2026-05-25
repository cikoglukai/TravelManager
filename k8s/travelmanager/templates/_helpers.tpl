{{/* Common labels */}}
{{- define "tm.labels" -}}
app.kubernetes.io/part-of: travelmanager
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* Image reference for a service */}}
{{- define "tm.image" -}}
{{- printf "%s/%s:%s" .root.Values.global.imageRegistry .name .root.Values.global.imageTag -}}
{{- end -}}

{{/*
Shared env block. Internal service URLs use cluster DNS. DB + secret values come
from the per-service ExternalSecret (envFrom) so they are not rendered here.
*/}}
{{- define "tm.commonEnv" -}}
- name: NODE_ENV
  value: production
- name: NITRO_HOST
  value: "0.0.0.0"
- name: NITRO_PORT
  value: "8080"
- name: GOOGLE_CLOUD_PROJECT
  value: {{ .Values.global.gcpProject | quote }}
- name: USER_SERVICE_URL
  value: "http://user-service:8080"
- name: TRIP_SERVICE_URL
  value: "http://trip-service:8080"
- name: DESTINATION_SERVICE_URL
  value: "http://destination-service:8080"
- name: SOCIAL_SERVICE_URL
  value: "http://social-service:8080"
- name: TRAVEL_INFO_SERVICE_URL
  value: "http://travel-info-service:8080"
{{- range .Values.global.extraEnv }}
- name: {{ .name }}
  value: {{ .value | quote }}
{{- end }}
{{- end -}}

{{/* Cloud SQL Auth Proxy sidecar container */}}
{{- define "tm.cloudSqlSidecar" -}}
- name: cloud-sql-proxy
  image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1
  args:
    - "--structured-logs"
    - "--port=5432"
    - {{ .Values.global.cloudSqlInstance | quote }}
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532   # cloud-sql-proxy distroless nonroot uid (Autopilot needs an explicit uid)
  resources:
    requests: { cpu: 50m, memory: 64Mi }
    limits: { cpu: 200m, memory: 128Mi }
{{- end -}}
