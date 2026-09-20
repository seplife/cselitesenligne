import React from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt } from '@/lib/utils'

export default function Classes() {
  const { classes, students } = useAppStore()

  const activeClasses = classes.filter(c => c.actif)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes ({activeClasses.length})</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeClasses.length === 0 ? (
          <p className="text-gray-400 col-span-3">Aucune classe active.</p>
        ) : activeClasses.map(c => {
          const eleves = students.filter(s => s.actif && s.classe_id === c.id)
          const soldes = eleves.filter(s => s.statut === 'SOLDE' || s.statut === 'CREDIT').length
          const encaisse = eleves.reduce((a, s) => a + s.total_paye, 0)
          const attendu = eleves.reduce((a, s) => a + s.total_du, 0)
          const taux = attendu > 0 ? Math.round((encaisse / attendu) * 100) : 0

          return (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{c.nom}</h3>
                  <p className="text-xs text-gray-400">{c.niveau}</p>
                </div>
                <span className="text-2xl font-bold text-gray-200 dark:text-gray-700">{eleves.length}</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Frais de scolarité</dt>
                  <dd className="font-semibold text-gray-700 dark:text-gray-200">{fmt(c.frais)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Soldés</dt>
                  <dd className="font-semibold text-green-600">{soldes}/{eleves.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Encaissé</dt>
                  <dd className="font-semibold text-gray-700 dark:text-gray-200">{fmt(encaisse)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Taux</dt>
                  <dd className="font-semibold text-primary-600">{taux}%</dd>
                </div>
              </dl>
              <div className="mt-3">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${taux}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
