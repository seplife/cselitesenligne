import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { fmt, fmtDateShort, statutOf } from '@/lib/utils'
import { Search, Plus, UserCheck } from 'lucide-react'
import type { Student } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  SOLDE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CREDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  NON_SOLDE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function Students() {
  const { students, classes, hasPerm } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterClasse, setFilterClasse] = useState<string>('all')

  const filtered = students.filter(s => {
    if (!s.actif) return false
    const q = search.toLowerCase()
    if (q && !s.nom.toLowerCase().includes(q) && !s.prenoms.toLowerCase().includes(q) && !s.matricule.toLowerCase().includes(q)) return false
    if (filterStatut !== 'all' && s.statut !== filterStatut) return false
    if (filterClasse !== 'all' && s.classe_id !== filterClasse) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Élèves ({filtered.length})</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
          />
        </div>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="SOLDE">Soldé</option>
          <option value="NON_SOLDE">Non soldé</option>
          <option value="CREDIT">Crédit</option>
        </select>
        <select
          value={filterClasse}
          onChange={e => setFilterClasse(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          <option value="all">Toutes classes</option>
          {classes.filter(c => c.actif).map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Matricule</th>
              <th className="px-4 py-3 text-left font-medium">Nom & Prénoms</th>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-right font-medium">Dû</th>
              <th className="px-4 py-3 text-right font-medium">Payé</th>
              <th className="px-4 py-3 text-right font-medium">Reste</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun élève trouvé</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.matricule}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {s.nom} {s.prenoms}
                  {s.parent_tel && <p className="text-xs text-gray-400">{s.parent_nom} — {s.parent_tel}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.classe_nom ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(s.total_du)}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(s.total_paye)}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(s.total_du - s.total_paye)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[s.statut]}`}>
                    {s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
