// GET /api/users — intentionally POST-only for login/registration.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Allow', 'POST')
  throw createError({
    statusCode: 405,
    statusMessage: 'Use POST /api/users to log in or register',
  })
})
