import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[] | string[]
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const fieldClass = 'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all'

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <input className={cn(fieldClass, error && 'border-red-400 focus:ring-red-400', className)} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <select className={cn(fieldClass, 'cursor-pointer', error && 'border-red-400', className)} {...props}>
        {options.map(opt => {
          if (typeof opt === 'string') return <option key={opt} value={opt}>{opt}</option>
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className, ...props }: TextAreaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <textarea className={cn(fieldClass, 'resize-none', error && 'border-red-400', className)} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }: SearchInputProps) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldClass, 'pl-9 pr-3')}
      />
    </div>
  )
}
