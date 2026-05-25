// Populate event.context.user from gateway-injected identity headers.
import { identityMiddleware } from '@travelmanager/shared/identity'

export default defineEventHandler((event) => {
  identityMiddleware(event)
})
