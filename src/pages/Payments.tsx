import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDate } from '@/lib/utils'
import { Search } from 'lucide-react'

export default function Payments() {
  const { payments, hasPerm } = useAppStore()
  const [search, setSearch] = useState('')

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return p.student_nom?.toLowerCase().includes(q)
      || p.student_matricule?.toLowerCase().includes(q)
      || p.recu_numero?.toLowerCase().includes(q)
      || p.motif?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paiements</h1>
      </div>

      <div className="relative w-64">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Reçu</th>
              <th className="px-4 py-3 text-left font-medium">Élève</th>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-left font-medium">Motif</th>
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              <th className="px-4 py-3 text-left font-medium">Mode</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun paiement trouvé</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${p.annule ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.recu_numero}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.student_nom}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.classe_nom ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.motif}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.montant)}</td>
                <td className="px-4 py-3 text-gray-500">{p.mode}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.date)}</td>
                <td className="px-4 py-3 text-center">
                  {p.annule
                    ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Annulé</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Validé</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
