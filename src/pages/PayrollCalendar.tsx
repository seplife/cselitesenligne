import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, monthKey } from '@/lib/utils'
import type { Staff, StaffPayment } from '@/types'

export default function PayrollCalendar() {
  const { staff, staffPayments } = useAppStore()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    return `${selectedYear}-${m}`
  })

  const activeStaff = staff.filter(s => s.actif)

  const isPaid = (staffId: string, mois: string) =>
    staffPayments.some(p => p.staff_id === staffId && p.mois === mois)

  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier de paie</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Année :</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-[750px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Personnel</th>
              {monthLabels.map(m => (
                <th key={m} className="px-3 py-3 text-center font-medium">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeStaff.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">Aucun personnel actif</td></tr>
            ) : activeStaff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900 z-10">
                  {s.nom} {s.prenoms}
                  <span className="text-xs text-gray-400 block">{fmt(s.salaire_base)}</span>
                </td>
                {months.map((mois, idx) => (
                  <td key={mois} className="px-3 py-3 text-center">
                    {isPaid(s.id, mois)
                      ? <span title="Payé" className="inline-block w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 text-xs flex items-center justify-center">✓</span>
                      : <span title="Non payé" className="inline-block w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-300 text-xs flex items-center justify-center">—</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/40 inline-block" /> Payé</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 inline-block" /> Non payé</span>
      </div>
    </div>
  )
}
