export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isMobileTauri(): boolean {
  if (!isTauri()) return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')
}