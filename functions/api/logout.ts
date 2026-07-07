import { clearSessionCookie, json } from './_lib'

export const onRequestPost = async (): Promise<Response> => {
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() })
}
