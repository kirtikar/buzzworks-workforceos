"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light"

interface ThemeCtxValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeCtx = createContext<ThemeCtxValue>({ theme: "dark", setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem("opsd_theme") as Theme) || "dark"
    setThemeState(saved)
    document.documentElement.setAttribute("data-theme", saved)
    setMounted(true)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    document.documentElement.setAttribute("data-theme", t)
    localStorage.setItem("opsd_theme", t)
  }

  // Avoid flash on first render
  if (!mounted) return <>{children}</>

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
