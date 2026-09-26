import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmtDate } from '@/lib/utils'
import { Search, Shield } from 'lucide-react'

export default function Audit() {
  const { auditLogs } = useAppStore()
  const [search, setSearch] = useState('')

  const filtered = auditLogs.filter(l => {
    const q = search.toLowerCase()
    if (!q) return true
    return l.action.toLowerCase().includes(q)
      || l.entity.toLowerCase().includes(q)
      || l.user_role.toLowerCase().includes(q)
      || l.reference?.toLowerCase().includes(q)
      || l.details?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Shield className="h-6 w-6 text-purple-500" /> Journal d'audit ({auditLogs.length})
      </h1>

      <div className="relative w-full sm:w-72">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none w-full"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-[620px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Entité</th>
              <th className="px-4 py-3 text-left font-medium">Référence</th>
              <th className="px-4 py-3 text-left font-medium">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune entrée</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(l.date)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    {l.user_role}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.action}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.entity}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.reference ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{l.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
