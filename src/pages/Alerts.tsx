import React from 'react'
import { useAppStore } from '@/store/appStore'
import { AlertTriangle } from 'lucide-react'

const SEVERITY_STYLES = {
  red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300',
}

const SEVERITY_ICONS = {
  red: '🔴',
  orange: '🟠',
  blue: '🔵',
  green: '🟢',
}

export default function Alerts() {
  const { computeAlerts, setActiveTab } = useAppStore()
  const alerts = computeAlerts()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-orange-500" /> Alertes
      </h1>

      {alerts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-500">Aucune alerte active. Tout est en ordre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity ${SEVERITY_STYLES[a.severity]}`}
              onClick={() => setActiveTab(a.tab)}
            >
              <span className="text-xl mt-0.5">{SEVERITY_ICONS[a.severity]}</span>
              <div>
                <p className="font-medium">{a.message}</p>
                <p className="text-xs mt-1 opacity-70">Cliquer pour accéder à la section concernée → {a.tab}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
