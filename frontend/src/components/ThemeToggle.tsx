import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../utils/theme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Alternar para tema ${isDark ? 'claro' : 'escuro'}`}
      title={`Alternar para tema ${isDark ? 'claro' : 'escuro'}`}
    >
      {isDark ? (
        <Sun size={15} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Moon size={15} strokeWidth={2} aria-hidden="true" />
      )}
      <span className="theme-toggle-label">{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
    </button>
  )
}

export default ThemeToggle
