import {
  createSessionCookie,
  getUser,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  publicUser,
  putUser,
  type UserRecord,
} from './_lib'

export const onRequestPost = async ({ request, env }: any): Promise<Response> => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const email = normalizeEmail(body?.email ?? '')
  const password = String(body?.password ?? '')
  if (!isValidEmail(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)

  if (await getUser(env, email)) {
    return json({ error: 'An account with this email already exists — sign in instead.' }, 409)
  }

  const { salt, passHash } = await hashPassword(password)
  const user: UserRecord = {
    email,
    salt,
    passHash,
    pro: false,
    createdAt: new Date().toISOString(),
  }
  await putUser(env, user)

  return json({ user: publicUser(user) }, 200, {
    'set-cookie': await createSessionCookie(env, email),
  })
}
