import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-card',
      padding && 'p-5',
      className
    )}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: 'default' | 'green' | 'red' | 'orange' | 'blue'
  subtitle?: string
}

const colorMap = {
  default: 'text-gray-900 dark:text-gray-100',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
}

export function StatCard({ label, value, icon, color = 'default', subtitle }: StatCardProps) {
  return (
    <Card className="flex items-start gap-3">
      {icon && (
        <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg text-primary-700 dark:text-primary-400 text-lg flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className={cn('text-2xl font-extrabold mt-1 truncate', colorMap[color])}>{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
    </Card>
  )
}
