import { Moon, Sun } from 'lucide-react'
import useThemeStore from '../store/themeStore'

export default function FloatingThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed z-50 p-2.5 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
      style={{ 
        top: '50%', 
        right: '1rem',
        transform: 'translateY(-50%)'
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}