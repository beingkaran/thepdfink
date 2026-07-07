import { getSessionEmail, getUser, json, publicUser } from './_lib'

export const onRequestGet = async ({ request, env }: any): Promise<Response> => {
  const email = await getSessionEmail(request, env)
  if (!email) return json({ user: null })
  const user = await getUser(env, email)
  return json({ user: user ? publicUser(user) : null })
}
