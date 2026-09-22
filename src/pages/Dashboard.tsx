import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDate, monthKey } from '@/lib/utils'
import { Users, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Clock, Search, QrCode } from 'lucide-react'
import { API_URL } from '@/lib/apiClient'
import type { Student } from '@/types'

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { students, payments, expenses, computeAlerts, settings } = useAppStore()
  const [matriculeQuery, setMatriculeQuery] = useState('')
  const [found, setFound] = useState<Student | null | undefined>(undefined)

  function searchMatricule() {
    const q = matriculeQuery.trim().toUpperCase()
    if (!q) return
    const s = students.find(st => st.matricule.toUpperCase() === q || st.token === q)
    setFound(s ?? null)
  }


  const actifs = students.filter(s => s.actif)
  const soldes = actifs.filter(s => s.statut === 'SOLDE' || s.statut === 'CREDIT').length
  const totalDu = actifs.reduce((a, s) => a + s.total_du, 0)
  const totalPaye = actifs.reduce((a, s) => a + s.total_paye, 0)
  const resteGlobal = totalDu - totalPaye

  const mois = monthKey()
  const encaisseMois = payments
    .filter(p => !p.annule && p.date?.slice(0, 7) === mois)
    .reduce((a, p) => a + p.montant, 0)
  const depensesMois = expenses
    .filter(e => e.statut !== 'ANNULEE' && e.date?.slice(0, 7) === mois)
    .reduce((a, e) => a + e.montant, 0)

  const alerts = computeAlerts()

  const recentPayments = payments.filter(p => !p.annule).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {settings?.school_name ?? 'École'} — {settings?.annee_scolaire ?? ''}
          </p>
        </div>

        {/* ─── Recherche rapide par matricule ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm w-full sm:w-auto">
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <QrCode className="h-3.5 w-3.5 text-red-600" /> Recherche rapide par matricule
          </p>
          <div className="flex gap-2">
            <input
              value={matriculeQuery}
              onChange={e => { setMatriculeQuery(e.target.value); if (!e.target.value) setFound(undefined) }}
              onKeyDown={e => e.key === 'Enter' && searchMatricule()}
              placeholder="Ex: CSE-2025-001"
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono w-44"
            />
            <button
              onClick={searchMatricule}
              className="bg-red-700 text-white px-3 py-1.5 rounded-lg hover:bg-red-800 transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {found === null && (
            <p className="text-xs text-red-500 mt-1.5">❌ Aucun élève trouvé</p>
          )}
          {found && (
            <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
              {found.photo_url && (
                <img src={`${API_URL}${found.photo_url}`} alt="" className="w-8 h-10 object-cover rounded shadow" />
              )}
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{found.nom} {found.prenoms}</p>
                <p className="text-xs text-gray-500">{found.classe_nom ?? '—'} · {found.statut === 'SOLDE' ? '✅ Soldé' : `Reste: ${fmt(found.total_du - found.total_paye)}`}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Élèves actifs"
          value={actifs.length.toString()}
          sub={`${soldes} soldés / ${actifs.length - soldes} non soldés`}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-900/30"
        />
        <StatCard
          title="Encaissé ce mois"
          value={fmt(encaisseMois)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          color="bg-green-50 dark:bg-green-900/30"
        />
        <StatCard
          title="Dépenses ce mois"
          value={fmt(depensesMois)}
          icon={<DollarSign className="h-5 w-5 text-red-600" />}
          color="bg-red-50 dark:bg-red-900/30"
        />
        <StatCard
          title="Total dû"
          value={fmt(totalDu)}
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          color="bg-purple-50 dark:bg-purple-900/30"
        />
        <StatCard
          title="Total encaissé"
          value={fmt(totalPaye)}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <StatCard
          title="Reste à recouvrer"
          value={fmt(resteGlobal)}
          sub={`${Math.round((totalPaye / (totalDu || 1)) * 100)}% recouvré`}
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          color="bg-orange-50 dark:bg-orange-900/30"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Alertes actives ({alerts.length})
            </h2>
            <ul className="space-y-2">
              {alerts.slice(0, 5).map((a, i) => (
                <li key={i} className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
                  a.severity === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                  a.severity === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}>
                  <span className="mt-0.5">•</span>
                  {a.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Derniers paiements</h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentPayments.map(p => (
                <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.student_nom}</p>
                    <p className="text-xs text-gray-400">{p.motif} — {fmtDate(p.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 whitespace-nowrap">{fmt(p.montant)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
