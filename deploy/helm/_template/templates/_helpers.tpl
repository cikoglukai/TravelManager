{{/*
Common labels & names. Each per-service chart pulls these via library include.
*/}}

{{- define "tm.fullname" -}}
{{- printf "%s" .Values.serviceName | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tm.labels" -}}
app.kubernetes.io/name: {{ .Values.serviceName }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
travelmanager.io/service: {{ .Values.serviceName }}
travelmanager.io/tenant: {{ .Values.tenantId | default "shared" | quote }}
travelmanager.io/plan:   {{ .Values.plan     | default "shared" | quote }}
{{- end -}}

{{- define "tm.selectorLabels" -}}
app.kubernetes.io/name: {{ .Values.serviceName }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
