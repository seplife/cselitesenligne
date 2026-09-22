import React from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

export default function Vault() {
  const { settings } = useAppStore()

  if (!settings) return <p className="text-gray-400">Chargement…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coffre-fort — Données sensibles</h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-3 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-500">
            Les identifiants des comptes ne sont plus stockés ni affichés en clair : chaque profil dispose
            d'un mot de passe haché en base de données, géré depuis <span className="font-medium">Paramètres → Sécurité</span> (Directeur uniquement).
          </p>
        </div>
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
