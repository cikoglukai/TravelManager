// POST /api/users
// Handles both login and registration in one endpoint.
//
// Flow:
//   1. If the email already exists → return the existing user (login).
//   2. If the email is new and no name was provided → respond 422 so the
//      client knows to show the name input field (step 2 of the register form).
//   3. If the email is new and a name was provided → create and return the user.
//
// No passwords are required per the exercise specification.
import {getDb} from "~~/server/utils/db.js";

export default defineEventHandler(async (event) => {
  const { email, name } = await readBody(event)

  if (!email?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const db = getDb()
  const cleanEmail = email.toLowerCase().trim()

  // Existing user → log in (name is ignored on login)
  const { rows: existing } = await db.query(
    'SELECT id, name, email, bio, home_city, avatar_url, created_at FROM users WHERE email = $1',
    [cleanEmail]
  )
  if (existing.length) return existing[0]

  // New user → name is required to create an account
  if (!name?.trim()) {
    // 422 is the signal to the client to display the name field
    throw createError({ statusCode: 422, statusMessage: 'name_required' })
  }

  const { rows } = await db.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, bio, home_city, avatar_url, created_at',
    [name.trim(), cleanEmail]
  )
  return rows[0]
})