import React from 'react'
import { useAppStore, ROLES } from '@/store/appStore'
import { cn } from '@/lib/utils'
import logoCse from '@/assets/logo_cse.png'
import {
  LayoutDashboard, Lock, GraduationCap, DollarSign, QrCode, Bell,
  BarChart2, AlertTriangle, Wallet, Users2, UserSquare2, Calendar,
  CreditCard, FolderOpen, ScrollText, Tag, Settings, LogOut, ChevronLeft
} from 'lucide-react'
import type { TabId } from '@/types'

const NAV_ITEMS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard',  icon: <LayoutDashboard className="h-4 w-4" />, label: 'Tableau de bord' },
  { id: 'vault',      icon: <Lock           className="h-4 w-4" />, label: 'Coffre-fort' },
  { id: 'students',   icon: <GraduationCap  className="h-4 w-4" />, label: 'Élèves' },
  { id: 'payments',   icon: <DollarSign     className="h-4 w-4" />, label: 'Paiements' },
  { id: 'qr',         icon: <QrCode         className="h-4 w-4" />, label: 'QR & Scanner' },
  { id: 'reminders',  icon: <Bell           className="h-4 w-4" />, label: 'Relances' },
  { id: 'stats',      icon: <BarChart2      className="h-4 w-4" />, label: 'Statistiques' },
  { id: 'alerts',     icon: <AlertTriangle  className="h-4 w-4" />, label: 'Alertes' },
  { id: 'caisse',     icon: <Wallet         className="h-4 w-4" />, label: 'Caisse & Dépenses' },
  { id: 'vacataires', icon: <UserSquare2    className="h-4 w-4" />, label: 'Vacataires' },
  { id: 'personnel',  icon: <Users2         className="h-4 w-4" />, label: 'Personnel' },
  { id: 'payrollcal', icon: <Calendar       className="h-4 w-4" />, label: 'Calendrier de paie' },
  { id: 'debts',      icon: <CreditCard     className="h-4 w-4" />, label: 'Dettes' },
  { id: 'documents',  icon: <FolderOpen     className="h-4 w-4" />, label: 'Documents' },
  { id: 'audit',      icon: <ScrollText     className="h-4 w-4" />, label: "Journal d'audit" },
  { id: 'classes',    icon: <Tag            className="h-4 w-4" />, label: 'Classes & Frais' },
  { id: 'settings',   icon: <Settings       className="h-4 w-4" />, label: 'Paramètres' },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { role, userLabel, activeTab, setActiveTab, logout, hasTab, computeAlerts, settings } = useAppStore()
  const alerts     = computeAlerts()
  const alertCount = alerts.length
  const roleDef    = role ? ROLES[role] : null

  // Initiales de l'utilisateur pour l'avatar
  const initials = userLabel
    ? userLabel.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="sidebar-logo">
        <img
          src={logoCse}
          alt="Logo CSE"
          className="sidebar-logo-img"
        />
        {!collapsed && (
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">
              {settings?.sigle ?? 'CSE Divo'}
            </div>
            <div className="sidebar-logo-sub">
              {settings?.annee_scolaire ?? 'Gestion Financière'}
            </div>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors',
              collapsed ? 'mx-auto' : 'ml-auto'
            )}
            title={collapsed ? 'Déployer' : 'Réduire'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="sidebar-nav no-scrollbar">
        {NAV_ITEMS.filter(item => hasTab(item.id)).map(item => {
          const isActive = activeTab === item.id
          const isAlerts = item.id === 'alerts'
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn('sidebar-nav-item', isActive && 'active')}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>

              {!collapsed && (
                <>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {isAlerts && alertCount > 0 && (
                    <span className="sidebar-badge">{alertCount}</span>
                  )}
                </>
              )}

              {/* Point rouge en mode réduit */}
              {collapsed && isAlerts && alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"
                  style={{ boxShadow: '0 0 6px rgba(239,68,68,0.7)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Pied de sidebar ───────────────────────────────── */}
      <div className="sidebar-footer">
        {/* Info utilisateur */}
        {!collapsed && roleDef && (
          <div className="sidebar-user-info mb-2">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white/90 leading-tight truncate">
                {userLabel ?? 'Utilisateur'}
              </p>
              <p className="text-xs text-white/50 leading-tight truncate">
                {roleDef.icon} {roleDef.label}
              </p>
            </div>
          </div>
        )}

        {/* Bouton déconnexion */}
        <button
          onClick={() => logout()}
          className="sidebar-logout-btn"
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
