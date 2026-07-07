import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem('thepdf_theme', theme)
    } catch {
      // ignore (private mode)
    }
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {theme === 'light' ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />}
    </button>
  )
}
