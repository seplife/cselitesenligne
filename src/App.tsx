import React, { useEffect, Suspense, lazy } from 'react'
import { useAppStore } from '@/store/appStore'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import { getToken, ApiError, API_URL } from '@/lib/apiClient'
import { Loader2 } from 'lucide-react'

// Lazy load pages for performance
const Dashboard      = lazy(() => import('@/pages/Dashboard'))
const Vault          = lazy(() => import('@/pages/Vault'))
const Students       = lazy(() => import('@/pages/Students'))
const Payments       = lazy(() => import('@/pages/Payments'))
const QrScanner      = lazy(() => import('@/pages/QrScanner'))
const Reminders      = lazy(() => import('@/pages/Reminders'))
const Stats          = lazy(() => import('@/pages/Stats'))
const Alerts         = lazy(() => import('@/pages/Alerts'))
const Caisse         = lazy(() => import('@/pages/Caisse'))
const Vacataires     = lazy(() => import('@/pages/Vacataires'))
const Personnel      = lazy(() => import('@/pages/Personnel'))
const PayrollCalendar= lazy(() => import('@/pages/PayrollCalendar'))
const Debts          = lazy(() => import('@/pages/Debts'))
const Documents      = lazy(() => import('@/pages/Documents'))
const Audit          = lazy(() => import('@/pages/Audit'))
const Classes        = lazy(() => import('@/pages/Classes'))
const Settings       = lazy(() => import('@/pages/Settings'))
const TuitionManagement = lazy(() => import('@/pages/TuitionManagement'))

const PAGE_MAP = {
  dashboard:  Dashboard,
  vault:      Vault,
  students:   Students,
  tuition:    TuitionManagement,
  payments:   Payments,
  qr:         QrScanner,
  reminders:  Reminders,
  stats:      Stats,
  alerts:     Alerts,
  caisse:     Caisse,
  vacataires: Vacataires,
  personnel:  Personnel,
  payrollcal: PayrollCalendar,
  debts:      Debts,
  documents:  Documents,
  audit:      Audit,
  classes:    Classes,
  settings:   Settings,
} as const

function AppLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white dark:bg-gray-800 shadow-xl mb-5 border border-gray-100 dark:border-gray-700">
          <span className="text-4xl">🏫</span>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-red-600" />
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Chargement en cours…</p>
        </div>
      </div>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-red-600" />
    </div>
  )
}

function ApiErrorMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-sm w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center border border-red-100 dark:border-red-900/30">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 mb-5">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Serveur injoignable</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
          Le serveur <span className="font-mono break-all">{API_URL}</span> ne répond pas. Vérifiez qu'il est bien démarré et accessible.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-bold transition-colors shadow-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

import PublicVerify from '@/pages/PublicVerify'

export default function App() {
  const { role, loading, loadAll, activeTab, hasTab } = useAppStore()
  const [initError, setInitError] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)
  const [verifyData, setVerifyData] = React.useState<any>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('verify') || params.get('qr')
      if (v) {
        if (v.startsWith('{') && v.endsWith('}')) {
          return JSON.parse(v)
        } else {
          return { m: v }
        }
      }
    } catch {}
    return null
  })

  useEffect(() => {
    // Pas de session locale : on affiche directement l'écran de connexion.
    if (!getToken()) {
      setInitialized(true)
      return
    }

    loadAll()
      .then(() => setInitialized(true))
      .catch(e => {
        console.error('Init error', e)
        // 401 : session expirée → le store renvoie déjà vers l'écran de connexion.
        if (!(e instanceof ApiError && e.status === 401)) setInitError(true)
        setInitialized(true)
      })
  }, [])

  if (verifyData) {
    return (
      <PublicVerify
        data={verifyData}
        onClose={() => {
          window.history.replaceState({}, '', window.location.pathname)
          setVerifyData(null)
        }}
      />
    )
  }

  if (!initialized || loading) return <AppLoader />
  if (initError) return <ApiErrorMessage />
  if (!role) return <Login />

  // Get active page component
  const currentTab = hasTab(activeTab) ? activeTab : 'dashboard'
  const PageComponent = PAGE_MAP[currentTab]

  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <PageComponent />
      </Suspense>
    </Layout>
  )
}
