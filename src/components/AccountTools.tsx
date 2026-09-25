import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, Users, Download, Upload } from 'lucide-react'
import { api, ApiError, LOCAL_MODE } from '@/lib/apiClient'
import { exportBackup, importBackup } from '@/lib/localApi'
import { useAppStore, ROLES } from '@/store/appStore'
import type { RoleKey } from '@/types'

const inputCls = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm'
const btnCls = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const btnGhostCls = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue.')

// ─── Changement de son propre mot de passe ────────────────────────────────────
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 4) return toast.error('Le nouveau mot de passe doit faire au moins 4 caractères.')
    if (next !== confirm) return toast.error('Les mots de passe ne correspondent pas.')
    setSaving(true)
    try {
      await api.put('/api/auth/password', { currentPassword: current, newPassword: next })
      toast.success('Mot de passe modifié.')
      setCurrent(''); setNext(''); setConfirm('')
      onDone?.()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="password" className={inputCls} placeholder="Mot de passe actuel" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
      <input type="password" className={inputCls} placeholder="Nouveau mot de passe (min. 4 caractères)" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
      <input type="password" className={inputCls} placeholder="Confirmer le nouveau mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
      <button type="submit" className={btnCls} disabled={saving || !current || !next || !confirm}>
        <KeyRound className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}

// ─── Comptes utilisateurs (Directeur) ─────────────────────────────────────────
interface UserRow { id: string; username: string; nom_complet: string; role: RoleKey; actif: boolean; created_at: string }

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [pwd, setPwd] = useState('')

  const load = () => api.get<UserRow[]>('/api/auth/users').then(setUsers).catch(e => toast.error(errMsg(e)))
  useEffect(() => { load() }, [])

  async function reset(userId: string) {
    if (pwd.length < 4) return toast.error('Le mot de passe doit faire au moins 4 caractères.')
    try {
      await api.put('/api/auth/reset-password', { userId, newPassword: pwd })
      toast.success('Mot de passe réinitialisé.')
      setResetFor(null); setPwd('')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {users.map(u => (
        <div key={u.id} className="py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px]">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{u.nom_complet}</p>
            <p className="text-xs text-gray-500">@{u.username} · {ROLES[u.role]?.icon} {ROLES[u.role]?.label ?? u.role}</p>
          </div>
          {resetFor === u.id ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input type="password" className={inputCls + ' w-48'} placeholder="Nouveau mot de passe" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus />
              <button className={btnCls} onClick={() => reset(u.id)}>Valider</button>
              <button className={btnGhostCls} onClick={() => { setResetFor(null); setPwd('') }}>Annuler</button>
            </div>
          ) : (
            <button className={btnGhostCls} onClick={() => { setResetFor(u.id); setPwd('') }}>
              <KeyRound className="h-4 w-4" /> Réinitialiser
            </button>
          )}
        </div>
      ))}
      {users.length === 0 && <p className="text-sm text-gray-400 py-2">Chargement…</p>}
    </div>
  )
}

// ─── Sauvegarde / restauration (mode local) ───────────────────────────────────
export function BackupTools() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { resetState } = useAppStore()

  async function doExport() {
    try {
      const json = await exportBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sauvegarde-cse-divo-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Sauvegarde téléchargée.')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  async function doImport(file: File) {
    if (!window.confirm('Restaurer cette sauvegarde ? Toutes les données actuelles de cet appareil seront remplacées.')) return
    try {
      await importBackup(await file.text())
      toast.success('Sauvegarde restaurée. Reconnectez-vous.')
      resetState()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restauration impossible.')
    }
  }

  if (!LOCAL_MODE) {
    return <p className="text-sm text-gray-500">Les données sont stockées sur le serveur : utilisez les sauvegardes de la base MySQL.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Les données sont enregistrées dans ce navigateur, sur cet appareil. Exportez une sauvegarde régulièrement,
        et importez-la pour transférer les données vers un autre ordinateur ou après avoir vidé le navigateur.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={btnCls} onClick={doExport}><Download className="h-4 w-4" /> Exporter une sauvegarde</button>
        <button className={btnGhostCls} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Restaurer une sauvegarde</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doImport(f) }}
        />
      </div>
    </div>
  )
}

export function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">{icon}{children}</h2>
}

export { Users as UsersIcon }
