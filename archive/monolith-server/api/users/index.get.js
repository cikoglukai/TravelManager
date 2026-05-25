// GET /api/users
// This endpoint is intentionally POST-only for login/registration.
// Return 405 instead of a generic 404 so the route is discoverable.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Allow', 'POST')

  throw createError({
    statusCode: 405,
    statusMessage: 'Use POST /api/users to log in or register',
  })
})
