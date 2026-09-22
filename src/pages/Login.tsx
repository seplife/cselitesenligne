import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'
import logoCse from '@/assets/logo_cse.png'

export default function Login() {
  const { login } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      await login(username.trim(), password)
      toast.success('Connexion réussie !')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez le serveur.'
      toast.error(message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  if (showRegister) {
    return <RegisterForm onBack={() => setShowRegister(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-yellow-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src={logoCse}
            alt="Logo CSE Divo"
            className="w-36 h-36 object-contain mx-auto mb-3 drop-shadow-xl"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            COURS SECONDAIRE ÉLITES
          </h1>
          <p className="text-yellow-200 text-sm font-semibold mt-0.5 tracking-widest">
            DIVO — TRAVAIL · RIGUEUR · EXCELLENCE
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            🔐 Connexion
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Nom d'utilisateur"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Votre identifiant"
              autoFocus
            />
            <div>
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
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
              className="w-full bg-red-700 hover:bg-red-800"
              size="lg"
              loading={loading}
              disabled={!username.trim() || !password}
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-5 text-center border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-500">Pas encore de compte ?</p>
            <button
              onClick={() => setShowRegister(true)}
              className="mt-1 text-sm font-semibold text-red-700 hover:text-red-900 hover:underline"
            >
              Créer un compte →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FORMULAIRE D'INSCRIPTION ─────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'directeur', label: '👔 Directeur' },
  { value: 'caissiere', label: '💰 Caissière' },
  { value: 'secretaire', label: '🗂️ Secrétaire' },
  { value: 'educateur', label: '🎒 Éducateur' },
  { value: 'comptable', label: '📊 Comptable / Contrôleur' },
  { value: 'consultation', label: '👁️ Consultation' },
]

function RegisterForm({ onBack }: { onBack: () => void }) {
  const { register } = useAppStore()
  const [form, setForm] = useState({
    username: '',
    nom_complet: '',
    role: 'caissiere',
    password: '',
    confirm: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 4) {
      toast.error('Le mot de passe doit faire au moins 4 caractères.')
      return
    }
    setLoading(true)
    try {
      await register({ username: form.username.trim(), nom_complet: form.nom_complet.trim(), role: form.role, password: form.password })
      toast.success('Compte créé avec succès ! Bienvenue 🎉')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur lors de la création du compte.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-yellow-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logoCse} alt="Logo CSE Divo" className="w-28 h-28 object-contain mx-auto mb-3 drop-shadow-xl" />
          <h1 className="text-2xl font-extrabold text-white tracking-wide">COURS SECONDAIRE ÉLITES</h1>
          <p className="text-yellow-200 text-sm font-semibold mt-0.5 tracking-widest">DIVO</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            📝 Créer un compte
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              value={form.nom_complet}
              onChange={e => set('nom_complet', e.target.value)}
              placeholder="Ex: Jean KONAN"
              autoFocus
            />
            <Input
              label="Nom d'utilisateur"
              type="text"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="Ex: jkonan (sans espace)"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rôle / Profil
              </label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Minimum 4 caractères"
              />
            </div>
            <div>
              <Input
                label="Confirmer le mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Répétez le mot de passe"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                {showPassword ? 'Masquer' : 'Afficher'} les mots de passe
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-700 hover:bg-red-800"
              size="lg"
              loading={loading}
              disabled={!form.username.trim() || !form.nom_complet.trim() || !form.password || !form.confirm}
            >
              Créer mon compte
            </Button>
          </form>

          <div className="mt-4 text-center border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
