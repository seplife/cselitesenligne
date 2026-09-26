import React from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort, todayKey } from '@/lib/utils'
import type { DebtStatut } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  EN_COURS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SOLDE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  EN_RETARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function computeStatut(debt: { montant_initial: number; montant_paye: number; date_echeance?: string; statut: DebtStatut }): DebtStatut {
  const solde = debt.montant_initial - debt.montant_paye
  if (solde <= 0) return 'SOLDE'
  if (debt.date_echeance && debt.date_echeance < todayKey()) return 'EN_RETARD'
  return 'EN_COURS'
}

export default function Debts() {
  const { debts } = useAppStore()

  const totalInitial = debts.reduce((a, d) => a + d.montant_initial, 0)
  const totalRestant = debts.reduce((a, d) => a + Math.max(0, d.montant_initial - d.montant_paye), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dettes & Créances</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500">Total initial</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{fmt(totalInitial)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500">Restant dû</p>
          <p className="text-lg font-bold text-red-500 mt-1">{fmt(totalRestant)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500">Nombre</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{debts.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-[650px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Libellé</th>
              <th className="px-4 py-3 text-left font-medium">Créancier</th>
              <th className="px-4 py-3 text-right font-medium">Initial</th>
              <th className="px-4 py-3 text-right font-medium">Payé</th>
              <th className="px-4 py-3 text-right font-medium">Restant</th>
              <th className="px-4 py-3 text-left font-medium">Échéance</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {debts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune dette enregistrée</td></tr>
            ) : debts.map(d => {
              const statut = computeStatut(d)
              const restant = Math.max(0, d.montant_initial - d.montant_paye)
              return (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.libelle}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.creancier}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(d.montant_initial)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(d.montant_paye)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(restant)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(d.date_echeance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[statut]}`}>
                      {statut === 'SOLDE' ? 'Soldé' : statut === 'EN_RETARD' ? 'En retard' : 'En cours'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
