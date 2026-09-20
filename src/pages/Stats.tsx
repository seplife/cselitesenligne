import React from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt } from '@/lib/utils'
import type { ClassStat } from '@/types'

export default function Stats() {
  const { students, classes, payments } = useAppStore()

  const actifs = students.filter(s => s.actif)

  const classeStats: ClassStat[] = classes.filter(c => c.actif).map(c => {
    const eleves = actifs.filter(s => s.classe_id === c.id)
    const attendu = eleves.reduce((a, s) => a + s.total_du, 0)
    const encaisse = eleves.reduce((a, s) => a + s.total_paye, 0)
    const reste = attendu - encaisse
    const soldes = eleves.filter(s => s.statut === 'SOLDE' || s.statut === 'CREDIT').length
    return {
      classe: c.nom,
      niveau: c.niveau,
      nb: eleves.length,
      attendu,
      encaisse,
      reste,
      taux: attendu > 0 ? Math.round((encaisse / attendu) * 100) : 0,
      soldes,
      nonSoldes: eleves.length - soldes,
    }
  })

  const globalAttend = actifs.reduce((a, s) => a + s.total_du, 0)
  const globalEnc = actifs.reduce((a, s) => a + s.total_paye, 0)
  const globalTaux = globalAttend > 0 ? Math.round((globalEnc / globalAttend) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1>

      {/* Global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Élèves actifs', value: actifs.length.toString() },
          { label: 'Attendu total', value: fmt(globalAttend) },
          { label: 'Encaissé total', value: fmt(globalEnc) },
          { label: 'Taux recouvrement', value: `${globalTaux}%` },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* By class */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">Statistiques par classe</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-right font-medium">Élèves</th>
              <th className="px-4 py-3 text-right font-medium">Attendu</th>
              <th className="px-4 py-3 text-right font-medium">Encaissé</th>
              <th className="px-4 py-3 text-right font-medium">Reste</th>
              <th className="px-4 py-3 text-center font-medium">Taux</th>
              <th className="px-4 py-3 text-center font-medium">Soldés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {classeStats.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune donnée</td></tr>
            ) : classeStats.map(c => (
              <tr key={c.classe} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.classe}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{c.nb}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(c.attendu)}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(c.encaisse)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(c.reste)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${c.taux}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{c.taux}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {c.soldes}/{c.nb}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
