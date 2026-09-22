import React, { useState } from 'react'
import { useAppStore, ROLES } from '@/store/appStore'
import { ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormFields'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { RoleKey } from '@/types'

const ROLE_ORDER: RoleKey[] = ['directeur', 'caissiere', 'secretaire', 'educateur', 'comptable', 'consultation']

export default function Login() {
  const { settings, login } = useAppStore()
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleRoleSelect = (role: RoleKey) => {
    setSelectedRole(role)
    setPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setLoading(true)

    try {
      await login(selectedRole, password)
      toast.success(`Bienvenue, ${ROLES[selectedRole].label} !`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez le serveur.'
      toast.error(message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header card */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🏫</div>
          <h1 className="text-2xl font-extrabold text-white">
            {settings?.school_name ?? 'COURS SECONDAIRE ELITES DIVO'}
          </h1>
          <p className="text-primary-200 mt-1 text-sm">
            Gestion financière — Année scolaire {settings?.annee_scolaire ?? ''}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Choisissez votre profil
          </h2>

          {/* Role grid */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {ROLE_ORDER.map(role => {
              const def = ROLES[role]
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 text-left',
                    selectedRole === role
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 shadow-sm'
                      : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="text-xl">{def.icon}</span>
                  <span className="leading-tight">{def.label}</span>
                </button>
              )
            })}
          </div>

          {/* Password form */}
          {selectedRole && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <Input
                  label={`Mot de passe — ${ROLES[selectedRole].label}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                >
                  {showPassword ? 'Masquer' : 'Afficher'} le mot de passe
                </button>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
                disabled={!password}
              >
                Se connecter
              </Button>
            </form>
          )}

          {!selectedRole && (
            <p className="text-center text-sm text-gray-400">
              Sélectionnez un profil pour continuer
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
