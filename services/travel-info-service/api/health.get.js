// Liveness probe. Always 200 while the process is up; readiness (DB schema) is
// reported separately at /api/ready so a DB blip never restarts the pod.
export default defineEventHandler(() => ({ status: 'ok', service: 'travel-info-service' }))
