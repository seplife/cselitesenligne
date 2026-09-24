import React from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[] | string[]
  hint?: string
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function Input({ label, error, hint, iconLeft, iconRight, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="input-label">{label}</label>
      )}
      <div className="input-group">
        {iconLeft && (
          <span className="input-icon-left h-4 w-4">{iconLeft}</span>
        )}
        <input
          className={cn(
            'input-field',
            iconLeft  && 'input-with-icon-left',
            iconRight && 'input-with-icon-right',
            error && 'error',
            className
          )}
          {...props}
        />
        {iconRight && (
          <span className="input-icon-right h-4 w-4">{iconRight}</span>
        )}
      </div>
      {error && <p className="input-error">{error}</p>}
      {hint && !error && <p className="input-helper">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="input-label">{label}</label>}
      <select
        className={cn(
          'input-field cursor-pointer appearance-none',
          error && 'error',
          className
        )}
        {...props}
      >
        {options.map(opt => {
          if (typeof opt === 'string') return <option key={opt} value={opt}>{opt}</option>
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
      {error && <p className="input-error">{error}</p>}
      {hint && !error && <p className="input-helper">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className, ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="input-label">{label}</label>}
      <textarea
        className={cn('input-field resize-none', error && 'error', className)}
        {...props}
      />
      {error && <p className="input-error">{error}</p>}
      {hint && !error && <p className="input-helper">{hint}</p>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-9 pr-3 py-2"
      />
    </div>
  )
}
