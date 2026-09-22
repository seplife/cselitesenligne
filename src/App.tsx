import React, { useEffect, Suspense, lazy } from 'react'
import { useAppStore } from '@/store/appStore'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import { getToken } from '@/lib/apiClient'
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

const PAGE_MAP = {
  dashboard:  Dashboard,
  vault:      Vault,
  students:   Students,
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
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="text-5xl mb-4">🏫</div>
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
        <p className="text-gray-500 mt-3 text-sm">Chargement en cours…</p>
      </div>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
    </div>
  )
}

function ApiErrorMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Serveur injoignable</h2>
        <p className="text-gray-500 text-sm mb-4">
          Impossible de contacter l'API. Vérifiez que le serveur backend est démarré et que
          <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1">VITE_API_URL</code>
          pointe vers la bonne adresse dans le fichier <code className="bg-gray-100 px-1.5 py-0.5 rounded">.env</code>.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { role, loading, loadAll, activeTab, hasTab } = useAppStore()
  const [initError, setInitError] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)

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
        setInitError(true)
        setInitialized(true)
      })
  }, [])

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
