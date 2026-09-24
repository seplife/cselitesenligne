import React from 'react'
import { useAppStore, ROLES } from '@/store/appStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Lock, GraduationCap, DollarSign, QrCode, Bell,
  BarChart2, AlertTriangle, Wallet, Users2, UserSquare2, Calendar,
  CreditCard, FolderOpen, ScrollText, Tag, Settings, LogOut, ChevronLeft
} from 'lucide-react'
import type { TabId, RoleKey } from '@/types'
import { useState } from 'react'

const NAV_ITEMS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Tableau de bord' },
  { id: 'vault', icon: <Lock className="h-4 w-4" />, label: 'Coffre-fort' },
  { id: 'students', icon: <GraduationCap className="h-4 w-4" />, label: 'Élèves' },
  { id: 'payments', icon: <DollarSign className="h-4 w-4" />, label: 'Paiements' },
  { id: 'qr', icon: <QrCode className="h-4 w-4" />, label: 'QR & Scanner' },
  { id: 'reminders', icon: <Bell className="h-4 w-4" />, label: 'Relances' },
  { id: 'stats', icon: <BarChart2 className="h-4 w-4" />, label: 'Statistiques' },
  { id: 'alerts', icon: <AlertTriangle className="h-4 w-4" />, label: 'Alertes' },
  { id: 'caisse', icon: <Wallet className="h-4 w-4" />, label: 'Caisse & Dépenses' },
  { id: 'vacataires', icon: <UserSquare2 className="h-4 w-4" />, label: 'Vacataires' },
  { id: 'personnel', icon: <Users2 className="h-4 w-4" />, label: 'Personnel' },
  { id: 'payrollcal', icon: <Calendar className="h-4 w-4" />, label: 'Calendrier de paie' },
  { id: 'debts', icon: <CreditCard className="h-4 w-4" />, label: 'Dettes' },
  { id: 'documents', icon: <FolderOpen className="h-4 w-4" />, label: 'Documents' },
  { id: 'audit', icon: <ScrollText className="h-4 w-4" />, label: "Journal d'audit" },
  { id: 'classes', icon: <Tag className="h-4 w-4" />, label: 'Classes & Frais' },
  { id: 'settings', icon: <Settings className="h-4 w-4" />, label: 'Paramètres' },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { role, activeTab, setActiveTab, logout, hasTab, computeAlerts, settings } = useAppStore()
  const alerts = computeAlerts()
  const alertCount = alerts.length
  const roleDef = role ? ROLES[role] : null

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className={cn(
      'h-screen sticky top-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 transition-all duration-300 overflow-hidden',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏫</span>
            <div>
              <div className="font-extrabold text-primary-800 dark:text-primary-400 text-sm leading-tight">
                {settings?.sigle ?? 'CSE Divo'}
              </div>
              <div className="text-xs text-gray-400">{settings?.annee_scolaire ?? ''}</div>
            </div>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">🏫</span>}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.filter(item => hasTab(item.id)).map(item => {
          const isActive = activeTab === item.id
          const isAlerts = item.id === 'alerts'
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-150',
                isActive
                  ? 'bg-primary-800 text-white dark:bg-primary-700 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {isAlerts && alertCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center">
                      {alertCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && isAlerts && alertCount > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
        {!collapsed && roleDef && (
          <div className="text-xs text-gray-400 mb-2 px-1">
            Connecté : <span className="font-semibold text-gray-600 dark:text-gray-300">{roleDef.icon} {roleDef.label}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>
      </div>
    </aside>
  )
}
