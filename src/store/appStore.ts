import { create } from 'zustand'
import { api, login as apiLogin, setSession, clearSession, getStoredUser } from '@/lib/apiClient'
import { connectRealtime, disconnectRealtime } from '@/lib/realtime'
import { todayKey, isToday, isThisMonth } from '@/lib/utils'
import type {
  RoleKey, Settings, Class, Student, Payment, Reminder,
  Expense, CashClosure, Teacher, TeacherHour, Staff, StaffPayment,
  Debt, Document, AuditLog, Alert, TabId
} from '@/types'

// Copie côté client des permissions — sert uniquement à l'affichage
// (cacher des boutons, des onglets). L'autorisation réelle est appliquée
// par le serveur (server/src/roles.js) ; cette copie ne protège rien.
export const ROLES = {
  directeur: {
    label: 'Directeur', icon: '👔',
    tabs: ['dashboard','vault','students','payments','qr','reminders','stats','alerts','caisse','vacataires','personnel','payrollcal','debts','documents','audit','classes','settings'] as TabId[],
    perms: { editStudents:true, pay:true, manageCaisse:true, validateExpense:true, manageVacataires:true, managePersonnel:true, seeAudit:true, seeSettings:true, editClasses:true, manageDebts:true, manageDocuments:true }
  },
  caissiere: {
    label: 'Caissière', icon: '💰',
    tabs: ['dashboard','students','payments','qr','reminders','stats','alerts','caisse','vacataires','personnel','payrollcal','documents','classes'] as TabId[],
    perms: { editStudents:true, pay:true, manageCaisse:true, validateExpense:false, manageVacataires:false, managePersonnel:false, seeAudit:false, seeSettings:false, editClasses:false, manageDebts:false, manageDocuments:true }
  },
  secretaire: {
    label: 'Secrétaire', icon: '🗂️',
    tabs: ['dashboard','students','qr','reminders','stats','documents','classes'] as TabId[],
    perms: { editStudents:true, pay:false, manageCaisse:false, validateExpense:false, manageVacataires:false, managePersonnel:false, seeAudit:false, seeSettings:false, editClasses:false, manageDebts:false, manageDocuments:true }
  },
  educateur: {
    label: 'Éducateur', icon: '🎒',
    tabs: ['dashboard','students','qr','stats'] as TabId[],
    perms: { editStudents:false, pay:false, manageCaisse:false, validateExpense:false, manageVacataires:false, managePersonnel:false, seeAudit:false, seeSettings:false, editClasses:false, manageDebts:false, manageDocuments:false }
  },
  comptable: {
    label: 'Comptable / Contrôleur', icon: '📊',
    tabs: ['dashboard','stats','alerts','caisse','vacataires','personnel','payrollcal','debts','documents','audit','classes'] as TabId[],
    perms: { editStudents:false, pay:false, manageCaisse:false, validateExpense:false, manageVacataires:false, managePersonnel:false, seeAudit:true, seeSettings:false, editClasses:false, manageDebts:false, manageDocuments:false }
  },
  consultation: {
    label: 'Consultation', icon: '👁️',
    tabs: ['dashboard','students','stats','caisse','vacataires','personnel','payrollcal','debts','documents','classes'] as TabId[],
    perms: { editStudents:false, pay:false, manageCaisse:false, validateExpense:false, manageVacataires:false, managePersonnel:false, seeAudit:false, seeSettings:false, editClasses:false, manageDebts:false, manageDocuments:false }
  },
} as const

interface AppStore {
  // Auth
  role: RoleKey | null
  userLabel: string | null
  // Data
  settings: Settings | null
  classes: Class[]
  students: Student[]
  payments: Payment[]
  reminders: Reminder[]
  expenses: Expense[]
  cashClosures: CashClosure[]
  teachers: Teacher[]
  teacherHours: TeacherHour[]
  staff: Staff[]
  staffPayments: StaffPayment[]
  debts: Debt[]
  documents: Document[]
  auditLogs: AuditLog[]
  // UI
  loading: boolean
  activeTab: TabId

  // Actions
  login: (role: RoleKey, password: string) => Promise<void>
  logout: () => Promise<void>
  setActiveTab: (tab: TabId) => void
  loadAll: () => Promise<void>
  refreshTable: (table: string) => Promise<void>
  computeAlerts: () => Alert[]

  // Helpers
  roleDef: () => typeof ROLES[RoleKey]
  hasPerm: (key: keyof typeof ROLES['directeur']['perms']) => boolean
  hasTab: (tab: TabId) => boolean
}

// Mappe le nom de table renvoyé par le serveur (evenement Socket.IO ou
// endpoint REST) vers la clé du store et le chemin d'API correspondant.
const TABLE_MAP: Record<string, { key: keyof AppStore; path: string; single?: boolean }> = {
  settings: { key: 'settings', path: '/api/settings', single: true },
  classes: { key: 'classes', path: '/api/classes' },
  students: { key: 'students', path: '/api/students' },
  payments: { key: 'payments', path: '/api/payments' },
  reminders: { key: 'reminders', path: '/api/reminders' },
  expenses: { key: 'expenses', path: '/api/expenses' },
  cash_closures: { key: 'cashClosures', path: '/api/cash_closures' },
  teachers: { key: 'teachers', path: '/api/teachers' },
  teacher_hours: { key: 'teacherHours', path: '/api/teacher_hours' },
  staff: { key: 'staff', path: '/api/staff' },
  staff_payments: { key: 'staffPayments', path: '/api/staff_payments' },
  debts: { key: 'debts', path: '/api/debts' },
  documents: { key: 'documents', path: '/api/documents' },
  audit_logs: { key: 'auditLogs', path: '/api/audit_logs' },
}

let disconnect: (() => void) | null = null

export const useAppStore = create<AppStore>((set, get) => ({
  role: null,
  userLabel: null,
  settings: null,
  classes: [],
  students: [],
  payments: [],
  reminders: [],
  expenses: [],
  cashClosures: [],
  teachers: [],
  teacherHours: [],
  staff: [],
  staffPayments: [],
  debts: [],
  documents: [],
  auditLogs: [],
  loading: false,
  activeTab: 'dashboard',

  roleDef: () => {
    const { role } = get()
    return ROLES[role ?? 'consultation']
  },
  hasPerm: (key) => {
    return !!get().roleDef().perms[key]
  },
  hasTab: (tab) => {
    return get().roleDef().tabs.includes(tab)
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  login: async (role, password) => {
    const { token, user } = await apiLogin(role, password)
    setSession(token, user)
    set({ role: user.role as RoleKey, userLabel: user.label, activeTab: 'dashboard' })
    await get().loadAll()
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // On se déconnecte localement même si l'appel échoue (session déjà expirée, etc.)
    }
    disconnectRealtime()
    if (disconnect) { disconnect(); disconnect = null }
    clearSession()
    set({
      role: null, userLabel: null, settings: null, classes: [], students: [], payments: [],
      reminders: [], expenses: [], cashClosures: [], teachers: [], teacherHours: [], staff: [],
      staffPayments: [], debts: [], documents: [], auditLogs: [],
    })
  },

  loadAll: async () => {
    set({ loading: true })
    try {
      const [
        settings, classes, students, payments, reminders,
        expenses, cashClosures, teachers, teacherHours, staff,
        staffPayments, debts, documents, auditLogs
      ] = await Promise.all([
        api.get<Settings>('/api/settings'),
        api.get<Class[]>('/api/classes'),
        api.get<Student[]>('/api/students'),
        api.get<Payment[]>('/api/payments'),
        api.get<Reminder[]>('/api/reminders'),
        api.get<Expense[]>('/api/expenses'),
        api.get<CashClosure[]>('/api/cash_closures'),
        api.get<Teacher[]>('/api/teachers'),
        api.get<TeacherHour[]>('/api/teacher_hours'),
        api.get<Staff[]>('/api/staff'),
        api.get<StaffPayment[]>('/api/staff_payments'),
        api.get<Debt[]>('/api/debts'),
        api.get<Document[]>('/api/documents'),
        get().hasPerm('seeAudit') ? api.get<AuditLog[]>('/api/audit_logs') : Promise.resolve([]),
      ])

      set({
        settings, classes, students, payments, reminders, expenses, cashClosures,
        teachers, teacherHours, staff, staffPayments, debts, documents, auditLogs,
        loading: false,
      })

      if (disconnect) disconnect()
      disconnect = connectRealtime((table) => {
        get().refreshTable(table)
      })
    } catch (e) {
      console.error('Erreur chargement données', e)
      set({ loading: false })
    }
  },

  refreshTable: async (table) => {
    const mapping = TABLE_MAP[table]
    if (!mapping) return
    try {
      const data = await api.get(mapping.path)
      set({ [mapping.key]: data } as Partial<AppStore>)
    } catch (e) {
      console.error(`Erreur rafraîchissement ${table}`, e)
    }
  },

  computeAlerts: () => {
    const { students, expenses, teacherHours, cashClosures, payments, staff, staffPayments, debts, settings } = get()
    const alerts: Alert[] = []
    const seuil = settings?.seuil_alerte_montant ?? 100000

    const grosImpayes = students.filter(s => (s.total_du - s.total_paye) > seuil)
    if (grosImpayes.length) alerts.push({ severity: 'red', tab: 'reminders', message: `${grosImpayes.length} élève(s) ont un solde restant supérieur à ${seuil.toLocaleString('fr-FR')} FCFA` })

    const depEnAttente = expenses.filter(e => e.statut === 'EN_ATTENTE')
    if (depEnAttente.length) alerts.push({ severity: 'orange', tab: 'caisse', message: `${depEnAttente.length} dépense(s) en attente de validation` })

    const heuresNonValidees = teacherHours.filter(h => h.statut === 'DECLARE')
    if (heuresNonValidees.length) alerts.push({ severity: 'orange', tab: 'vacataires', message: `${heuresNonValidees.length} déclaration(s) d'heures vacataires en attente de validation` })

    const heuresAPayer = teacherHours.filter(h => h.statut === 'VALIDE')
    if (heuresAPayer.length) {
      const total = heuresAPayer.reduce((a, h) => a + h.montant, 0)
      alerts.push({ severity: 'blue', tab: 'vacataires', message: `${heuresAPayer.length} vacation(s) validée(s) en attente de paiement — ${total.toLocaleString('fr-FR')} FCFA` })
    }

    const recentEcarts = cashClosures.filter(c => c.ecart !== 0).slice(0, 5)
    if (recentEcarts.length) alerts.push({ severity: 'red', tab: 'caisse', message: `${recentEcarts.length} clôture(s) de caisse récente(s) avec un écart de contrôle` })

    const todaysClosure = cashClosures.find(c => c.date === todayKey())
    const hasActivityToday = payments.some(p => isToday(p.date)) || expenses.some(e => isToday(e.date))
    if (hasActivityToday && !todaysClosure) alerts.push({ severity: 'orange', tab: 'caisse', message: `La clôture de caisse du jour n'a pas encore été effectuée` })

    const staffUnpaid = staff.filter(p => !staffPayments.some(sp => sp.staff_id === p.id && isThisMonth(sp.date_paiement)))
    if (staffUnpaid.length) alerts.push({ severity: 'blue', tab: 'personnel', message: `${staffUnpaid.length} membre(s) du personnel sans paie enregistrée ce mois-ci` })

    const byKey: Record<string, number> = {}
    payments.filter(p => !p.annule).forEach(p => {
      const k = `${p.student_id}|${p.montant}|${p.date?.slice(0, 10)}`
      byKey[k] = (byKey[k] ?? 0) + 1
    })
    const doublons = Object.values(byKey).filter(n => n > 1).length
    if (doublons) alerts.push({ severity: 'red', tab: 'payments', message: `${doublons} cas de paiements potentiellement en double à vérifier` })

    const dettesEnRetard = debts.filter(d => {
      const solde = d.montant_initial - d.montant_paye
      return solde > 0 && d.date_echeance && d.date_echeance < todayKey()
    })
    if (dettesEnRetard.length) alerts.push({ severity: 'red', tab: 'debts', message: `${dettesEnRetard.length} dette(s) arrivée(s) à échéance et non soldée(s)` })

    return alerts
  },
}))

// Restaure la session depuis localStorage au chargement du module (rafraîchissement de page).
const storedUser = getStoredUser()
if (storedUser) {
  useAppStore.setState({ role: storedUser.role as RoleKey, userLabel: storedUser.label })
}

export type { RoleKey }
