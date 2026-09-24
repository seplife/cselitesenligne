import React, { useState, useEffect } from 'react'
import { useAppStore, ROLES } from '@/store/appStore'
import { Sidebar } from './Sidebar'
import { Sun, Moon } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { role, userLabel, settings } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const roleDef = role ? ROLES[role] : null

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-6 py-3 flex items-center justify-between gap-3">
          {/* Titre établissement */}
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
              {settings?.school_name ?? 'Cours Secondaire Élites'}
            </span>
            <span className="text-xs text-gray-400">
              Année scolaire {settings?.annee_scolaire ?? '—'}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Utilisateur connecté */}
            {roleDef && userLabel && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5 border border-gray-100 dark:border-gray-700">
                <span className="text-base leading-none">{roleDef.icon}</span>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">{userLabel}</p>
                  <p className="text-xs text-gray-400 leading-tight">{roleDef.label}</p>
                </div>
              </div>
            )}

            {/* Thème */}
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-700"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 max-w-screen-2xl w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
