import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StudentStatut } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formater un montant en FCFA */
export function fmt(n: number | null | undefined): string {
  return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA'
}

/** Date du jour au format ISO YYYY-MM-DD */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Mois courant au format YYYY-MM */
export function monthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Vérifier si une date ISO est aujourd'hui */
export function isToday(iso: string | null | undefined): boolean {
  return !!iso && iso.slice(0, 10) === todayKey()
}

/** Vérifier si une date ISO est dans le mois courant */
export function isThisMonth(iso: string | null | undefined): boolean {
  return !!iso && iso.slice(0, 7) === monthKey()
}

/** Formater une date ISO en français */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Formater une date sans heure */
export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

/** Calculer le statut d'un élève */
export function statutOf(totalDu: number, totalPaye: number): StudentStatut {
  if (totalDu === 0) return 'SOLDE'
  if (totalPaye >= totalDu) return totalPaye > totalDu ? 'CREDIT' : 'SOLDE'
  return 'NON_SOLDE'
}

/** Générer un UUID */
export function uid(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Tronquer un texte */
export function truncate(str: string, maxLen = 40): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/** Label du statut dépense */
export function expenseStatutLabel(statut: string): string {
  const map: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    VALIDEE: 'Validée',
    PAYEE: 'Payée',
    ANNULEE: 'Annulée',
  }
  return map[statut] ?? statut
}
