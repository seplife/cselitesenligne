import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort, expenseStatutLabel } from '@/lib/utils'
import type { Expense } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  VALIDEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAYEE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ANNULEE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

export default function Caisse() {
  const { expenses, cashClosures, hasPerm } = useAppStore()
  const [tab, setTab] = useState<'depenses' | 'clotures'>('depenses')

  const totDepenses = expenses.filter(e => e.statut === 'PAYEE').reduce((a, e) => a + e.montant, 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caisse</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['depenses', 'clotures'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'depenses' ? 'Dépenses' : 'Clôtures de caisse'}
          </button>
        ))}
      </div>

      {tab === 'depenses' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
            Total décaissé (Payées) : <span className="font-semibold text-gray-800 dark:text-white">{fmt(totDepenses)}</span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">N°</th>
                <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium">Bénéficiaire</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 text-center font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune dépense</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.numero}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{e.categorie}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.beneficiaire ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(e.montant)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[e.statut]}`}>
                      {expenseStatutLabel(e.statut)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(e.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'clotures' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Entrées</th>
                <th className="px-4 py-3 text-right font-medium">Sorties</th>
                <th className="px-4 py-3 text-right font-medium">Solde théorique</th>
                <th className="px-4 py-3 text-right font-medium">Solde physique</th>
                <th className="px-4 py-3 text-right font-medium">Écart</th>
                <th className="px-4 py-3 text-left font-medium">Clôturé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cashClosures.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune clôture</td></tr>
              ) : cashClosures.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{fmtDateShort(c.date)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(c.entrees)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmt(c.sorties)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(c.solde_theorique)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(c.solde_physique)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${c.ecart !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {c.ecart !== 0 ? fmt(c.ecart) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.cloture_par}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
