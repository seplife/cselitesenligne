import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'green' | 'red' | 'orange' | 'blue' | 'gray' | 'gold' | 'cse' | 'purple'
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variants: Record<string, string> = {
  green:  'badge-green',
  red:    'badge-red',
  orange: 'badge-orange',
  blue:   'badge-blue',
  gray:   'badge-gray',
  gold:   'badge-gold',
  cse:    'badge-cse',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const dotColors: Record<string, string> = {
  green:  'bg-emerald-500',
  red:    'bg-red-500',
  orange: 'bg-orange-400',
  blue:   'bg-blue-500',
  gray:   'bg-surface-400',
  gold:   'bg-gold-500',
  cse:    'bg-cse-600',
  purple: 'bg-purple-500',
}

export function Badge({ variant = 'gray', children, className, dot = false }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

export function StatutBadge({ statut }: { statut: string }) {
  if (statut === 'SOLDE')  return <Badge variant="green"  dot>SOLDÉ</Badge>
  if (statut === 'CREDIT') return <Badge variant="blue"   dot>CRÉDIT</Badge>
  return                          <Badge variant="red"    dot>NON SOLDÉ</Badge>
}

export function ExpenseStatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    EN_ATTENTE: { variant: 'orange', label: 'En attente' },
    VALIDEE:    { variant: 'blue',   label: 'Validée' },
    PAYEE:      { variant: 'green',  label: 'Payée' },
    ANNULEE:    { variant: 'red',    label: 'Annulée' },
  }
  const { variant, label } = map[statut] ?? { variant: 'gray', label: statut }
  return <Badge variant={variant} dot>{label}</Badge>
}
