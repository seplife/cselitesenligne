import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort, monthKey } from '@/lib/utils'

const STATUT_COLORS: Record<string, string> = {
  DECLARE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  VALIDE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAYE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

export default function Vacataires() {
  const { teachers, teacherHours } = useAppStore()
  const [tab, setTab] = useState<'heures' | 'vacataires'>('heures')
  const [filterMois, setFilterMois] = useState(monthKey())

  const heuresFiltrees = teacherHours.filter(h => !filterMois || h.mois === filterMois)
  const totalValide = heuresFiltrees
    .filter(h => h.statut === 'VALIDE' || h.statut === 'PAYE')
    .reduce((a, h) => a + h.montant, 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vacataires</h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['heures', 'vacataires'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'heures' ? 'Déclarations d\'heures' : 'Liste vacataires'}
          </button>
        ))}
      </div>

      {tab === 'heures' && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-500">Mois :</label>
            <input
              type="month"
              value={filterMois}
              onChange={e => setFilterMois(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-500">Total à payer : <strong className="text-gray-900 dark:text-white">{fmt(totalValide)}</strong></span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-[650px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Vacataire</th>
                  <th className="px-4 py-3 text-left font-medium">Matière</th>
                  <th className="px-4 py-3 text-right font-medium">Heures</th>
                  <th className="px-4 py-3 text-right font-medium">Taux</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {heuresFiltrees.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune déclaration</td></tr>
                ) : heuresFiltrees.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{h.teacher_nom}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{h.matiere ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{h.heures}h</td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmt(h.taux_horaire)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">{fmt(h.montant)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[h.statut]}`}>
                        {h.statut === 'DECLARE' ? 'Déclaré' : h.statut === 'VALIDE' ? 'Validé' : 'Payé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.mois}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vacataires' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Matière</th>
                <th className="px-4 py-3 text-left font-medium">Téléphone</th>
                <th className="px-4 py-3 text-right font-medium">Taux horaire</th>
                <th className="px-4 py-3 text-center font-medium">Actif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {teachers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun vacataire</td></tr>
              ) : teachers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.nom} {t.prenoms}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.matiere ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{t.taux_horaire ? fmt(t.taux_horaire) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {t.actif
                      ? <span className="text-green-500">✓</span>
                      : <span className="text-gray-400">✗</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
