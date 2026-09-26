import React, { useState, useEffect } from 'react'
import { useAppStore, ROLES } from '@/store/appStore'
import { Sidebar } from './Sidebar'
import { Sun, Moon, Menu } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { role, userLabel, settings, activeTab, computeAlerts } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const alerts = computeAlerts()
  const alertCount = alerts.length

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Fermer le menu mobile quand on change d'onglet
  useEffect(() => {
    setMobileOpen(false)
  }, [activeTab])

  // Fermer le menu mobile sur la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Verrouiller le scroll du corps quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const roleDef = role ? ROLES[role] : null

  return (
    <div className="app-layout">
      {/* Backdrop sombre sur mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-surface-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(c => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Contenu principal */}
      <div className="app-main">

        {/* Topbar */}
        <header className="topbar">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Bouton Hamburger sur mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 -ml-1 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative"
              aria-label="Ouvrir le menu"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-surface-900" />
              )}
            </button>

            {/* Nom de l'établissement */}
            <div className="topbar-school">
              <span className="topbar-school-name max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                {settings?.school_name ?? 'Cours Secondaire Élites'}
              </span>
              <span className="topbar-school-year">
                Année scolaire {settings?.annee_scolaire ?? '—'}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Utilisateur connecté */}
            {roleDef && userLabel && (
              <div className="topbar-user-chip" title={`${userLabel} (${roleDef.label})`}>
                <span className="text-base leading-none">{roleDef.icon}</span>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-surface-700 dark:text-surface-200 leading-tight truncate max-w-[120px]">{userLabel}</p>
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
