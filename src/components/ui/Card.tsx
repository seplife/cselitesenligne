import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
  hover?: boolean
}

export function Card({ children, className, padding = true, hover = false }: CardProps) {
  return (
    <div className={cn(
      'card',
      padding && 'card-body',
      hover && 'card-hover',
      className
    )}>
      {children}
    </div>
  )
}

// ─── En-tête de carte ─────────────────────────────────────────────
interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('card-header', className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="text-cse-700 dark:text-cse-400">{icon}</span>
        )}
        <div>
          <h3 className="text-base font-semibold text-surface-800 dark:text-surface-100 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Carte statistique ────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: 'default' | 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gold'
  subtitle?: string
  trend?: { value: number; label?: string }
}

const colorConfig: Record<string, { bg: string; text: string; icon: string }> = {
  default: {
    bg:   'bg-surface-100 dark:bg-surface-700',
    text: 'text-surface-900 dark:text-surface-100',
    icon: 'text-surface-600 dark:text-surface-400',
  },
  green: {
    bg:   'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  red: {
    bg:   'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-600 dark:text-red-400',
  },
  orange: {
    bg:   'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  blue: {
    bg:   'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    bg:   'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  gold: {
    bg:   'bg-gold-100 dark:bg-gold-900/30',
    text: 'text-gold-700 dark:text-gold-400',
    icon: 'text-gold-600 dark:text-gold-400',
  },
}

export function StatCard({ label, value, icon, color = 'default', subtitle, trend }: StatCardProps) {
  const cfg = colorConfig[color]
  return (
    <div className="stat-card">
      {icon && (
        <div className={cn('stat-card-icon', cfg.bg)}>
          <span className={cfg.icon}>{icon}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="stat-card-label">{label}</p>
        <p className={cn('stat-card-value', cfg.text)}>{value}</p>
        {subtitle && <p className="stat-card-sub">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-1', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            {trend.label && <span className="text-surface-400 font-normal ml-1">{trend.label}</span>}
          </p>
        )}
      </div>
    </div>
  )
}
