export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isMobileTauri(): boolean {
  if (!isTauri()) return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')
}

export type OsId = 'macos' | 'windows' | 'linux' | 'ios' | 'android'

/** Best-effort guess of the visitor's OS, so we can feature their download. */
export function detectOS(): OsId | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  // iPadOS 13+ reports as "Macintosh" but is touch-capable.
  const iPadOS = platform === 'macintel' && navigator.maxTouchPoints > 1

  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua) || iPadOS) return 'ios'
  if (/win/.test(ua) || /win/.test(platform)) return 'windows'
  if (/mac/.test(ua) || /mac/.test(platform)) return 'macos'
  if (/linux/.test(ua) || /linux/.test(platform)) return 'linux'
  return null
}