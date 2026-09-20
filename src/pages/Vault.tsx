import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort } from '@/lib/utils'
import { Lock } from 'lucide-react'

export default function Vault() {
  const { settings, role } = useAppStore()
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  if (!settings) return <p className="text-gray-400">Chargement…</p>

  function tryUnlock() {
    const expected = settings!.pins[role!]
    if (pin === expected) { setUnlocked(true); setError('') }
    else setError('PIN incorrect')
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-20 bg-white dark:bg-gray-900 rounded-2xl p-8 shadow border border-gray-100 dark:border-gray-700 text-center">
        <Lock className="h-10 w-10 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Coffre-fort</h2>
        <p className="text-sm text-gray-500 mb-4">Entrez votre PIN pour accéder aux données sensibles.</p>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          placeholder="PIN"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-center text-lg tracking-widest bg-transparent dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={tryUnlock}
          className="w-full bg-primary-600 text-white rounded-lg py-2 font-semibold hover:bg-primary-700 transition-colors"
        >
          Déverrouiller
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coffre-fort — Données sensibles</h1>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">PINs par rôle</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b dark:border-gray-700">
              <th className="pb-2 pr-8">Rôle</th>
              <th className="pb-2">PIN</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(settings.pins).map(([r, p]) => (
              <tr key={r} className="border-b last:border-0 dark:border-gray-800">
                <td className="py-2 pr-8 capitalize text-gray-700 dark:text-gray-300">{r}</td>
                <td className="py-2 font-mono text-gray-900 dark:text-white">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Paramètres financiers</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
          <div><dt className="text-gray-500">Taux horaire vacataire</dt><dd className="font-semibold text-gray-900 dark:text-white">{fmt(settings.taux_horaire_vacataire)}</dd></div>
          <div><dt className="text-gray-500">Seuil alerte montant</dt><dd className="font-semibold text-gray-900 dark:text-white">{fmt(settings.seuil_alerte_montant)}</dd></div>
          <div><dt className="text-gray-500">Compteur reçu</dt><dd className="font-semibold text-gray-900 dark:text-white">{settings.recu_counter}</dd></div>
          <div><dt className="text-gray-500">Compteur dépense</dt><dd className="font-semibold text-gray-900 dark:text-white">{settings.dep_counter}</dd></div>
        </dl>
      </div>
    </div>
  )
}
