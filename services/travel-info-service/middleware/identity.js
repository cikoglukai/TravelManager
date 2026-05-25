import { identityMiddleware } from '@travelmanager/shared/identity'

export default defineEventHandler((event) => {
  identityMiddleware(event)
})
