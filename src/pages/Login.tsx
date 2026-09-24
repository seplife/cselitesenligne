import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { ApiError, API_URL } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'
import logoCse from '@/assets/logo_cse.png'
import { Eye, EyeOff, User, Lock, UserPlus, ChevronDown, Wifi, WifiOff, RefreshCw } from 'lucide-react'

// ─── Vérification serveur ──────────────────────────────────────────────────────
function useServerStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const check = async () => {
    setStatus('checking')
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(4000) })
      setStatus(res.ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    check()
    const timer = setInterval(check, 15000)
    return () => clearInterval(timer)
  }, [])

  return { status, check }
}

// ─── Bandeau statut serveur ────────────────────────────────────────────────────
function ServerBanner({ status, onRetry }: { status: string; onRetry: () => void }) {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mb-4">
        <RefreshCw className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
        <span>Vérification du serveur…</span>
      </div>
    )
  }
  if (status === 'offline') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
        <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1">Serveur hors ligne — démarrez-le avant de vous connecter.</span>
        <button onClick={onRetry} className="underline font-semibold hover:text-red-900 whitespace-nowrap">Réessayer</button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
      <Wifi className="h-3.5 w-3.5 flex-shrink-0" />
      <span>Serveur connecté</span>
    </div>
  )
}

// ─── PAGE LOGIN ────────────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const { status, check } = useServerStatus()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    if (status === 'offline') {
      toast.error('Le serveur est hors ligne. Démarrez-le d\'abord.')
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
      toast.success('Connexion réussie !')
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Impossible de joindre le serveur. Vérifiez qu\'il est démarré.'
      toast.error(message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  if (showRegister) {
    return <RegisterForm onBack={() => setShowRegister(false)} serverStatus={status} onRetryServer={check} />
  }

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-red-950 via-red-800 to-amber-700 flex-col items-center justify-center p-12">
        {/* Cercles décoratifs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 right-0 w-48 h-48 bg-amber-500/10 rounded-full translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 text-center max-w-xs">
          <div className="mb-6 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 shadow-2xl border border-white/20">
              <img src={logoCse} alt="Logo CSE Divo" className="w-28 h-28 object-contain drop-shadow-xl" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
            COURS SECONDAIRE ÉLITES
          </h1>
          <div className="h-1 w-16 bg-amber-400 rounded-full mx-auto mb-4" />
          <p className="text-amber-200 text-sm font-semibold tracking-widest uppercase mb-8">
            Divo — Côte d'Ivoire
          </p>
          <div className="space-y-3">
            {['Travail', 'Rigueur', 'Excellence'].map(v => (
              <div key={v} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-white font-medium text-sm">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-10">
            Système de gestion financière scolaire
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        {/* Logo mobile */}
        <div className="lg:hidden text-center mb-8">
          <img src={logoCse} alt="Logo CSE Divo" className="w-20 h-20 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">COURS SECONDAIRE ÉLITES</h1>
          <p className="text-xs text-gray-500 tracking-widest uppercase mt-1">Divo · Gestion Financière</p>
        </div>

        <div className="w-full max-w-md">
          {/* Carte formulaire */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connexion</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bienvenue ! Entrez vos identifiants pour accéder au tableau de bord.</p>
            </div>

            <ServerBanner status={status} onRetry={check} />

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Champ username */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Votre identifiant"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Champ mot de passe */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!username.trim() || !password || loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Connexion en cours…</>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de compte ?</p>
              <button
                onClick={() => setShowRegister(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:underline transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} CSE Divo — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── FORMULAIRE D'INSCRIPTION ──────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'directeur',   label: 'Directeur',               icon: '👔' },
  { value: 'caissiere',   label: 'Caissière',                icon: '💰' },
  { value: 'secretaire',  label: 'Secrétaire',               icon: '🗂️' },
  { value: 'educateur',   label: 'Éducateur',                icon: '🎒' },
  { value: 'comptable',   label: 'Comptable / Contrôleur',   icon: '📊' },
  { value: 'consultation',label: 'Consultation',             icon: '👁️' },
]

function RegisterForm({
  onBack,
  serverStatus,
  onRetryServer,
}: {
  onBack: () => void
  serverStatus: string
  onRetryServer: () => void
}) {
  const { register } = useAppStore()
  const [form, setForm] = useState({
    username:   '',
    nom_complet:'',
    role:       'caissiere',
    password:   '',
    confirm:    '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (serverStatus === 'offline') {
      toast.error('Le serveur est hors ligne. Impossible de créer un compte.')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 4) {
      toast.error('Le mot de passe doit faire au moins 4 caractères.')
      return
    }
    if (form.username.trim().length < 3) {
      toast.error('Le nom d\'utilisateur doit faire au moins 3 caractères.')
      return
    }
    setLoading(true)
    try {
      await register({
        username:   form.username.trim(),
        nom_complet:form.nom_complet.trim(),
        role:       form.role,
        password:   form.password,
      })
      toast.success('Compte créé avec succès ! Bienvenue 🎉')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Impossible de joindre le serveur. Vérifiez qu\'il est démarré.')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedRole = ROLE_OPTIONS.find(r => r.value === form.role)
  const isValid = form.username.trim().length >= 3
    && form.nom_complet.trim().length >= 2
    && form.password.length >= 4
    && form.confirm === form.password

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-red-950 via-red-800 to-amber-700 flex-col items-center justify-center p-12">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 text-center max-w-xs">
          <div className="mb-6 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 shadow-2xl border border-white/20">
              <img src={logoCse} alt="Logo CSE Divo" className="w-28 h-28 object-contain drop-shadow-xl" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
            COURS SECONDAIRE ÉLITES
          </h1>
          <div className="h-1 w-16 bg-amber-400 rounded-full mx-auto mb-4" />
          <p className="text-amber-200 text-sm tracking-widest uppercase">Divo — Côte d'Ivoire</p>
          <p className="text-white/50 text-xs mt-8 leading-relaxed">
            Créez votre compte pour accéder au système de gestion financière.
          </p>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
        {/* Logo mobile */}
        <div className="lg:hidden text-center mb-8">
          <img src={logoCse} alt="Logo CSE Divo" className="w-16 h-16 object-contain mx-auto mb-2" />
          <h1 className="text-lg font-black text-gray-900 dark:text-white">COURS SECONDAIRE ÉLITES</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
            <div className="mb-6">
              <button
                onClick={onBack}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-4 transition-colors"
              >
                ← Retour à la connexion
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Créer un compte</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Remplissez les informations ci-dessous.</p>
            </div>

            <ServerBanner status={serverStatus} onRetry={onRetryServer} />

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nom complet */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.nom_complet}
                    onChange={e => set('nom_complet', e.target.value)}
                    placeholder="Ex : Jean KONAN"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Nom d'utilisateur */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nom d'utilisateur
                  <span className="ml-1 text-xs font-normal text-gray-400">(min. 3 caractères, sans espace)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">@</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => set('username', e.target.value.replace(/\s/g, ''))}
                    placeholder="Ex : jkonan"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Rôle */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Rôle / Profil</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base leading-none pointer-events-none">
                    {selectedRole?.icon}
                  </span>
                  <select
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    className="w-full pl-10 pr-8 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mot de passe
                  <span className="ml-1 text-xs font-normal text-gray-400">(min. 4 caractères)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Choisissez un mot de passe"
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmer */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      form.confirm && form.confirm !== form.password
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-red-500'
                    }`}
                  />
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Création en cours…</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Créer mon compte</>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} CSE Divo — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  )
}
