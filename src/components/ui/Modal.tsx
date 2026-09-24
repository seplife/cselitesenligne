import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const maxWidths: Record<string, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl':'max-w-2xl',
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'md' }: ModalProps) {
  // Fermeture sur Echap
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquer le scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={cn('modal-box', maxWidths[maxWidth])}>
        {/* En-tête */}
        {title && (
          <div className="modal-header">
            <div>
              <h2 className="modal-title">{title}</h2>
              {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="modal-close-btn">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Bouton fermeture sans titre */}
        {!title && (
          <button onClick={onClose} className="modal-close-btn absolute top-4 right-4 z-10">
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Corps */}
        <div className="modal-body">{children}</div>

        {/* Pied optionnel */}
        {footer && (
          <div className="modal-footer">{footer}</div>
        )}
      </div>
    </div>
  )
}
