// POST /api/admin/workers/:name/pause  — Enterprise+admin only.
// Pauses (replicas=0) or resumes a worker Deployment via the K8s API. Pub/Sub buffers messages 7d.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePlan } from '@travelmanager/shared-auth'

const handler = defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if ((user.role || event.context.tenant?.role) !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'admin role required' })
  }
  const name = getRouterParam(event, 'name')
  const { paused } = await readBody(event)
  const replicas = paused ? 0 : (Number(process.env[`DEFAULT_REPLICAS_${name.toUpperCase()}`]) || 2)

  // Use K8s API via in-cluster service account token (mounted by GKE).
  const ns = process.env.WORKER_NAMESPACE || 'shared-services'
  const apiUrl = `https://kubernetes.default.svc/apis/apps/v1/namespaces/${ns}/deployments/${name}/scale`
  const token = await readToken()
  const resp = await fetch(apiUrl, {
    method: 'PATCH',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/strategic-merge-patch+json',
      'accept': 'application/json',
    },
    body: JSON.stringify({ spec: { replicas } }),
  })
  if (!resp.ok) {
    throw createError({ statusCode: resp.status, statusMessage: `K8s API: ${await resp.text()}` })
  }
  return { ok: true, name, replicas }
})

async function readToken() {
  const fs = await import('node:fs/promises')
  return (await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8')).trim()
}

export default requirePlan('enterprise', handler, { createError })
