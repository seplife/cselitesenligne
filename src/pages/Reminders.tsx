import React from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDate } from '@/lib/utils'
import { Bell } from 'lucide-react'

export default function Reminders() {
  const { reminders } = useAppStore()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Bell className="h-6 w-6 text-orange-500" /> Relances ({reminders.length})
      </h1>

      {reminders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
          Aucune relance enregistrée.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Élève</th>
                <th className="px-4 py-3 text-right font-medium">Montant restant</th>
                <th className="px-4 py-3 text-left font-medium">Message</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reminders.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.student_nom}</td>
                  <td className="px-4 py-3 text-right text-red-500 font-semibold">{fmt(r.montant_restant)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.message}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
