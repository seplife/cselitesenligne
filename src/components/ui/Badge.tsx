import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'green' | 'red' | 'orange' | 'blue' | 'gray'
  children: React.ReactNode
  className?: string
}

const variants = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StatutBadge({ statut }: { statut: string }) {
  if (statut === 'SOLDE') return <Badge variant="green">🟢 SOLDÉ</Badge>
  if (statut === 'CREDIT') return <Badge variant="blue">🔵 CRÉDIT</Badge>
  return <Badge variant="red">🔴 NON SOLDÉ</Badge>
}

export function ExpenseStatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    EN_ATTENTE: { variant: 'orange', label: 'En attente' },
    VALIDEE: { variant: 'blue', label: 'Validée' },
    PAYEE: { variant: 'green', label: 'Payée' },
    ANNULEE: { variant: 'red', label: 'Annulée' },
  }
  const { variant, label } = map[statut] ?? { variant: 'gray', label: statut }
  return <Badge variant={variant}>{label}</Badge>
}
