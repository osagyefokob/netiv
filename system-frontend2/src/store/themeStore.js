import { create } from 'zustand'

const STORAGE_KEY = 'logistics-theme'

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    /* ignore */
  }
  return getSystemTheme()
}

function applyThemeClass(theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

const useThemeStore = create((set, get) => ({
  theme: typeof window !== 'undefined' ? readStoredTheme() : 'light',

  setTheme: (theme) => {
    if (theme !== 'light' && theme !== 'dark') return
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    applyThemeClass(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

export { applyThemeClass, readStoredTheme, STORAGE_KEY, getSystemTheme }
export default useThemeStore
