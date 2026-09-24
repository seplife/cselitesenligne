import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmtDate, fmtDateShort } from '@/lib/utils'
import { FileText, Search } from 'lucide-react'

export default function Documents() {
  const { documents } = useAppStore()
  const [search, setSearch] = useState('')

  const filtered = documents.filter(d => {
    const q = search.toLowerCase()
    if (!q) return true
    return d.titre.toLowerCase().includes(q)
      || d.type_doc.toLowerCase().includes(q)
      || d.description?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <FileText className="h-6 w-6 text-blue-500" /> Documents ({documents.length})
      </h1>

      <div className="relative w-64">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
          Aucun document trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{d.titre}</p>
                  <p className="text-xs text-gray-400">{d.type_doc}</p>
                </div>
              </div>
              {d.description && <p className="text-sm text-gray-500">{d.description}</p>}
              <div className="flex items-center justify-between mt-auto text-xs text-gray-400">
                <span>{fmtDateShort(d.date)}</span>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Ouvrir ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
