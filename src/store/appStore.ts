import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { todayKey, monthKey, isToday, isThisMonth, statutOf } from '@/lib/utils'
import type {
  RoleKey, Settings, Class, Student, Payment, Reminder,
  Expense, CashClosure, Teacher, TeacherHour, Staff, StaffPayment,
  Debt, Document, AuditLog, Alert, TabId
} from '@/types'

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
  setRole: (role: RoleKey | null) => void
  setActiveTab: (tab: TabId) => void
  loadAll: () => Promise<void>
  logAudit: (action: string, entity: string, reference?: string, details?: string) => Promise<void>
  computeAlerts: () => Alert[]

  // Helpers
  roleDef: () => typeof ROLES[RoleKey]
  hasPerm: (key: keyof typeof ROLES['directeur']['perms']) => boolean
  hasTab: (tab: TabId) => boolean
}

const subs: (() => void)[] = []

export const useAppStore = create<AppStore>((set, get) => ({
  role: null,
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

  setRole: (role) => set({ role, activeTab: 'dashboard' }),
  setActiveTab: (tab) => set({ activeTab: tab }),

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

  loadAll: async () => {
    set({ loading: true })
    try {
      // Load all data in parallel
      const [
        settingsRes, classesRes, studentsRes, paymentsRes, remindersRes,
        expensesRes, closuresRes, teachersRes, teacherHoursRes, staffRes,
        staffPaymentsRes, debtsRes, documentsRes, auditRes
      ] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 'main').single(),
        supabase.from('classes').select('*').order('nom'),
        supabase.from('students').select('*').order('nom'),
        supabase.from('payments').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('reminders').select('*').order('date', { ascending: false }).limit(300),
        supabase.from('expenses').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('cash_closures').select('*').order('date', { ascending: false }).limit(90),
        supabase.from('teachers').select('*').order('nom'),
        supabase.from('teacher_hours').select('*').order('mois', { ascending: false }).limit(500),
        supabase.from('staff').select('*').order('nom'),
        supabase.from('staff_payments').select('*').order('mois', { ascending: false }).limit(500),
        supabase.from('debts').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('documents').select('*').order('date', { ascending: false }).limit(300),
        supabase.from('audit_logs').select('*').order('date', { ascending: false }).limit(400),
      ])

      set({
        settings: settingsRes.data as Settings,
        classes: (classesRes.data ?? []) as Class[],
        students: (studentsRes.data ?? []) as Student[],
        payments: (paymentsRes.data ?? []) as Payment[],
        reminders: (remindersRes.data ?? []) as Reminder[],
        expenses: (expensesRes.data ?? []) as Expense[],
        cashClosures: (closuresRes.data ?? []) as CashClosure[],
        teachers: (teachersRes.data ?? []) as Teacher[],
        teacherHours: (teacherHoursRes.data ?? []) as TeacherHour[],
        staff: (staffRes.data ?? []) as Staff[],
        staffPayments: (staffPaymentsRes.data ?? []) as StaffPayment[],
        debts: (debtsRes.data ?? []) as Debt[],
        documents: (documentsRes.data ?? []) as Document[],
        auditLogs: (auditRes.data ?? []) as AuditLog[],
        loading: false,
      })

      // Subscribe to realtime changes
      setupRealtime(set, get)
    } catch (e) {
      console.error('Erreur chargement données', e)
      set({ loading: false })
    }
  },

  logAudit: async (action, entity, reference = '', details = '') => {
    const { role } = get()
    const roleLabel = role ? ROLES[role].label : 'Inconnu'
    try {
      await supabase.from('audit_logs').insert({
        date: new Date().toISOString(),
        user_role: roleLabel,
        action, entity, reference, details,
      })
    } catch (e) {
      console.error('Audit log failed', e)
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

function setupRealtime(
  set: (state: Partial<AppStore>) => void,
  get: () => AppStore
) {
  // Unsubscribe previous
  subs.forEach(fn => fn())
  subs.length = 0

  const sub = (table: string, key: keyof AppStore) => {
    const ch = supabase.channel(`rt-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
        const { data } = await supabase.from(table).select('*')
          .order(table === 'cash_closures' ? 'date' : (table === 'audit_logs' ? 'date' : 'created_at'), { ascending: false })
          .limit(table === 'students' ? 2000 : 500)
        if (data) set({ [key]: data } as Partial<AppStore>)
      })
      .subscribe()
    subs.push(() => supabase.removeChannel(ch))
  }

  sub('students', 'students')
  sub('payments', 'payments')
  sub('expenses', 'expenses')
  sub('cash_closures', 'cashClosures')
  sub('teacher_hours', 'teacherHours')
  sub('staff_payments', 'staffPayments')
  sub('debts', 'debts')
  sub('audit_logs', 'auditLogs')
}

// Export ROLES type helper
export type { RoleKey }
