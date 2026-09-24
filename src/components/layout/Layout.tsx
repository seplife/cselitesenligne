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
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Contenu principal */}
      <div className="app-main">

        {/* Topbar */}
        <header className="topbar">
          {/* Nom de l'établissement */}
          <div className="topbar-school">
            <span className="topbar-school-name">
              {settings?.school_name ?? 'Cours Secondaire Élites'}
            </span>
            <span className="topbar-school-year">
              Année scolaire {settings?.annee_scolaire ?? '—'}
            </span>
          </div>

          <div className="topbar-actions">
            {/* Utilisateur connecté */}
            {roleDef && userLabel && (
              <div className="topbar-user-chip">
                <span className="text-base leading-none">{roleDef.icon}</span>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-surface-700 dark:text-surface-200 leading-tight">{userLabel}</p>
                  <p className="text-xs text-surface-400 leading-tight">{roleDef.label}</p>
                </div>
              </div>
            )}

            {/* Bascule thème */}
            <button
              onClick={() => setDark(d => !d)}
              className="topbar-icon-btn"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
