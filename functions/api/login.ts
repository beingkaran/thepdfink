import {
  createSessionCookie,
  getUser,
  json,
  normalizeEmail,
  publicUser,
  verifyPassword,
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

  const user = await getUser(env, email)
  if (!user || !(await verifyPassword(password, user.salt, user.passHash))) {
    return json({ error: 'Incorrect email or password.' }, 401)
  }

  return json({ user: publicUser(user) }, 200, {
    'set-cookie': await createSessionCookie(env, email),
  })
}
