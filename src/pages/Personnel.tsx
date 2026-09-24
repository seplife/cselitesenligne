import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort, monthKey } from '@/lib/utils'

export default function Personnel() {
  const { staff, staffPayments } = useAppStore()
  const [tab, setTab] = useState<'liste' | 'paie'>('liste')
  const [filterMois, setFilterMois] = useState(monthKey())

  const paiesFiltrees = staffPayments.filter(p => !filterMois || p.mois === filterMois)
  const totalNet = paiesFiltrees.reduce((a, p) => a + p.salaire_net, 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personnel</h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['liste', 'paie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'liste' ? 'Liste du personnel' : 'Fiches de paie'}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Poste</th>
                <th className="px-4 py-3 text-left font-medium">Téléphone</th>
                <th className="px-4 py-3 text-right font-medium">Salaire base</th>
                <th className="px-4 py-3 text-left font-medium">Embauché le</th>
                <th className="px-4 py-3 text-center font-medium">Actif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {staff.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun personnel</td></tr>
              ) : staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nom} {s.prenoms}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.poste ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">{fmt(s.salaire_base)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(s.date_embauche)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.actif ? <span className="text-green-500">✓</span> : <span className="text-gray-400">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'paie' && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-500">Mois :</label>
            <input
              type="month"
              value={filterMois}
              onChange={e => setFilterMois(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-500">Total net : <strong className="text-gray-900 dark:text-white">{fmt(totalNet)}</strong></span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Personnel</th>
                  <th className="px-4 py-3 text-right font-medium">Base</th>
                  <th className="px-4 py-3 text-right font-medium">Primes</th>
                  <th className="px-4 py-3 text-right font-medium">Retenues</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                  <th className="px-4 py-3 text-left font-medium">Mode</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paiesFiltrees.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune paie ce mois</td></tr>
                ) : paiesFiltrees.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.staff_nom}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(p.salaire_base)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{fmt(p.primes)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(p.retenues)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmt(p.salaire_net)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.mode}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(p.date_paiement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
