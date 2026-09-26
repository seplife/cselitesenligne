// ─────────────────────────────────────────────────────────────────────────────
// Backend local (dans le navigateur)
//
// GitHub Pages n'héberge que des fichiers statiques : aucun serveur Node/MySQL
// ne peut y tourner. Ce module reproduit les routes de l'ancienne API Express
// (/api/auth, /api/students, /api/payments, …) et stocke les données dans le
// localStorage du navigateur. Il est utilisé automatiquement quand
// VITE_API_URL n'est pas défini au moment du build.
//
// Les mots de passe sont hachés (PBKDF2-SHA256 + sel) avant d'être stockés.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Settings, Class, Student, Payment, Expense, CashClosure, AuditLog, RoleKey, Staff,
  TuitionSchedule, PaymentReminder, StudentType, ReminderChannel, ReminderMotif, ReminderStatus
} from '@/types'
import {
  DEFAULT_TUITION_SCHEDULES_2026_2027, findTuitionSchedule,
  computeFinancialAccount, computeInstallments, buildReminderMessage
} from './tuitionEngine'

const DB_KEY = 'cse_divo_db_v1'
const SESSION_KEY = 'cse_divo_local_session'

export class LocalApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface LocalUser {
  id: string
  username: string
  nom_complet: string
  role: RoleKey
  password_hash: string
  salt: string
  actif: boolean
  created_at: string
}

interface Db {
  version: 1
  settings: Settings
  users: LocalUser[]
  sessions: Record<string, string> // token -> userId
  classes: Class[]
  students: Student[]
  payments: Payment[]
  tuition_schedules: TuitionSchedule[]
  reminders: unknown[]
  payment_reminders: PaymentReminder[]
  expenses: Expense[]
  cash_closures: CashClosure[]
  teachers: unknown[]
  teacher_hours: unknown[]
  staff: Staff[]
  staff_payments: unknown[]
  debts: unknown[]
  documents: unknown[]
  audit_logs: AuditLog[]
}

const ROLE_LABELS: Record<RoleKey, string> = {
  directeur: 'Directeur',
  caissiere: 'Caissière',
  secretaire: 'Secrétaire',
  educateur: 'Éducateur',
  comptable: 'Comptable / Contrôleur',
  consultation: 'Consultation',
}
const ROLE_KEYS = Object.keys(ROLE_LABELS) as RoleKey[]

// Doit rester aligné avec ROLES dans store/appStore.ts
const PERMS: Record<RoleKey, string[]> = {
  directeur: ['editStudents', 'pay', 'manageCaisse', 'validateExpense', 'manageVacataires', 'managePersonnel', 'seeAudit', 'seeSettings', 'editClasses', 'manageDebts', 'manageDocuments'],
  caissiere: ['editStudents', 'pay', 'manageCaisse', 'manageDocuments'],
  secretaire: ['editStudents', 'manageDocuments'],
  educateur: [],
  comptable: ['seeAudit'],
  consultation: [],
}

const DEFAULT_ACCOUNTS: { role: RoleKey; password: string }[] = [
  { role: 'directeur', password: '1234' },
  { role: 'caissiere', password: '0000' },
  { role: 'secretaire', password: '0000' },
  { role: 'educateur', password: '0000' },
  { role: 'comptable', password: '0000' },
  { role: 'consultation', password: '0000' },
]

const DEFAULT_CLASSES: [string, string][] = [
  ['6ème1', '6e'], ['6ème2', '6e'],
  ['5ème1', '5e'], ['5ème2', '5e'],
  ['4ème1', '4e'], ['4ème2', '4e'],
  ['3ème1', '3e'], ['3ème2', '3e'], ['3ème3', '3e'], ['3ème4', '3e'], ['3ème5', '3e'],
  ['2nde C', '2nde'], ['2nde A1', '2nde'], ['2nde A2', '2nde'],
  ['1ère D', '1ère'], ['1ère A1', '1ère'], ['1ère A2', '1ère'],
  ['Tle A1', 'Tle'], ['Tle A2', 'Tle'], ['Tle D1', 'Tle'], ['Tle D2', 'Tle'],
]

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const nowIso = () => new Date().toISOString()
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Contexte non sécurisé (http:// hors localhost) : repli simple
    let h = 0
    for (const ch of salt + password) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
    return 'weak:' + h.toString(16)
  }
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256,
  )
  return toHex(bits)
}

function newSalt(): string {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return toHex(a)
}

function statutOf(totalDu: number, totalPaye: number): Student['statut'] {
  if (totalDu === 0) return 'SOLDE'
  if (totalPaye >= totalDu) return totalPaye > totalDu ? 'CREDIT' : 'SOLDE'
  return 'NON_SOLDE'
}
const yearPrefix = (a?: string) => (a || '').slice(0, 4) || String(new Date().getFullYear())
const fmtCounter = (p: string, a: string | undefined, n: number, w: number) => `${p}${yearPrefix(a)}-${String(n).padStart(w, '0')}`

function defaultSettings(): Settings {
  return {
    id: 'main',
    school_name: 'COURS SECONDAIRE ELITES DIVO',
    code_etablissement: '01757',
    sigle: 'CSE Divo',
    ville: "Divo, Côte d'Ivoire",
    telephone: '+225 07 00 00 00 00',
    email: 'contact@csedivo.ci',
    annee_scolaire: '2026-2027',
    academic_years: ['2026-2027', '2027-2028', '2028-2029'],
    matricule_counter: 1,
    recu_counter: 1,
    dep_counter: 1,
    vac_counter: 1,
    pay_counter: 1,
    taux_horaire_vacataire: 1500,
    seuil_alerte_montant: 100000,
    created_at: nowIso(),
  }
}

// ─── Persistance ─────────────────────────────────────────────────────────────
let cache: Db | null = null

function emptyDb(): Db {
  return {
    version: 1,
    settings: defaultSettings(),
    users: [],
    sessions: {},
    classes: DEFAULT_CLASSES.map(([nom, niveau]) => ({
      id: uuid(), nom, niveau, frais: 0, actif: true, created_at: nowIso(),
    })),
    students: [],
    payments: [],
    tuition_schedules: DEFAULT_TUITION_SCHEDULES_2026_2027.map(s => ({
      ...s,
      id: uuid(),
      created_at: nowIso(),
      updated_at: nowIso(),
    })),
    reminders: [],
    payment_reminders: [],
    expenses: [],
    cash_closures: [],
    teachers: [],
    teacher_hours: [],
    staff: [],
    staff_payments: [],
    debts: [],
    documents: [],
    audit_logs: [],
  }
}

async function ensureDefaultAccounts(db: Db) {
  for (const { role, password } of DEFAULT_ACCOUNTS) {
    if (db.users.some(u => u.username === role)) continue
    const salt = newSalt()
    db.users.push({
      id: uuid(), username: role, nom_complet: ROLE_LABELS[role], role,
      salt, password_hash: await hashPassword(password, salt), actif: true, created_at: nowIso(),
    })
  }
}

function readDb(): Db | null {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Db
    const db: Db = { ...emptyDb(), ...parsed, settings: { ...defaultSettings(), ...parsed.settings } }
    if (!Array.isArray(db.tuition_schedules) || db.tuition_schedules.length === 0) {
      db.tuition_schedules = DEFAULT_TUITION_SCHEDULES_2026_2027.map(s => ({
        ...s,
        id: uuid(),
        created_at: nowIso(),
        updated_at: nowIso(),
      }))
    }
    if (!Array.isArray(db.payment_reminders)) {
      db.payment_reminders = []
    }
    // Assurer que chaque membre du personnel a un matricule
    if (Array.isArray(db.staff)) {
      db.staff.forEach((s, idx) => {
        if (!s.matricule) {
          s.matricule = `PER-${String(idx + 1).padStart(3, '0')}`
        }
      })
    }
    return db
  } catch {
    return null
  }
}

async function load(): Promise<Db> {
  // Relire à chaque requête : un autre onglet a pu modifier les données.
  const fromDisk = readDb()
  if (fromDisk) { cache = fromDisk; return cache }
  if (!cache) {
    cache = emptyDb()
    await ensureDefaultAccounts(cache)
    save(cache)
  }
  return cache
}

function save(db: Db) {
  cache = db
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch (e) {
    throw new LocalApiError("Impossible d'enregistrer : l'espace de stockage du navigateur est plein ou bloqué.", 507)
  }
}

// ─── Notifications de changement (remplace Socket.IO) ────────────────────────
type Listener = (table: string) => void
const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cse_divo_changes') : null
channel?.addEventListener('message', ev => listeners.forEach(l => l(String(ev.data))))

function emitChange(...tables: string[]) {
  for (const t of tables) {
    listeners.forEach(l => l(t))
    channel?.postMessage(t)
  }
}

export function subscribeLocalChanges(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ─── Session ─────────────────────────────────────────────────────────────────
interface Auth { user: LocalUser }

function audit(db: Db, role: string, action: string, entity: string, reference = '', details = '') {
  db.audit_logs.unshift({
    id: uuid(), date: nowIso(),
    user_role: ROLE_LABELS[role as RoleKey] ?? role ?? 'Inconnu',
    action, entity, reference, details,
  })
  if (db.audit_logs.length > 2000) db.audit_logs.length = 2000
}

function requireAuth(db: Db, token: string | null): Auth {
  const userId = token ? db.sessions[token] : undefined
  const user = userId ? db.users.find(u => u.id === userId && u.actif) : undefined
  if (!user) throw new LocalApiError('Session expirée. Veuillez vous reconnecter.', 401)
  return { user }
}

function requirePerm(auth: Auth, perm: string) {
  if (!PERMS[auth.user.role]?.includes(perm)) {
    throw new LocalApiError("Vous n'avez pas les droits pour effectuer cette action.", 403)
  }
}

function sessionPayload(db: Db, user: LocalUser) {
  const token = uuid()
  db.sessions[token] = user.id
  return { token, user: { id: user.id, role: user.role, label: user.nom_complet, username: user.username } }
}

// ─── Validation légère ───────────────────────────────────────────────────────
type Body = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())
const optStr = (v: unknown) => { const s = str(v); return s ? s : undefined }
function int(v: unknown, label: string, { positive = false, min = -Infinity } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new LocalApiError(`${label} invalide.`, 400)
  if (positive && n <= 0) throw new LocalApiError(`${label} doit être supérieur à 0.`, 400)
  if (n < min) throw new LocalApiError(`${label} invalide.`, 400)
  return n
}
function required(v: unknown, label: string) {
  const s = str(v)
  if (!s) throw new LocalApiError(`${label} est obligatoire.`, 400)
  return s
}

// ─── Routes ──────────────────────────────────────────────────────────────────
type Handler = (ctx: { db: Db; body: Body; params: string[]; token: string | null }) => Promise<unknown> | unknown

const routes: { method: string; pattern: RegExp; handler: Handler }[] = []
const route = (method: string, path: string, handler: Handler) => {
  const pattern = new RegExp('^' + path.replace(/:[a-z_]+/g, '([^/]+)') + '$')
  routes.push({ method, pattern, handler })
}

const LIST_TABLES = ['reminders', 'teachers', 'teacher_hours', 'staff', 'staff_payments', 'debts', 'documents'] as const

route('GET', '/api/health', () => ({ ok: true, mode: 'local' }))

// Auth
route('POST', '/api/auth/register', async ({ db, body }) => {
  const username = required(body.username, "Le nom d'utilisateur").toLowerCase()
  const nom_complet = required(body.nom_complet, 'Le nom complet')
  const password = str(body.password)
  const role = str(body.role) as RoleKey
  if (username.length < 3) throw new LocalApiError("Le nom d'utilisateur doit faire au moins 3 caractères.", 400)
  if (/\s/.test(username)) throw new LocalApiError("Le nom d'utilisateur ne doit pas contenir d'espace.", 400)
  if (password.length < 4) throw new LocalApiError('Le mot de passe doit faire au moins 4 caractères.', 400)
  if (!ROLE_KEYS.includes(role)) throw new LocalApiError('Profil invalide.', 400)
  if (db.users.some(u => u.username.toLowerCase() === username)) {
    throw new LocalApiError("Ce nom d'utilisateur est déjà utilisé.", 409)
  }
  const salt = newSalt()
  const user: LocalUser = {
    id: uuid(), username, nom_complet, role, salt,
    password_hash: await hashPassword(password, salt), actif: true, created_at: nowIso(),
  }
  db.users.push(user)
  audit(db, role, 'INSCRIPTION', 'Session', `${nom_complet} (${username})`, 'Nouveau compte créé')
  return sessionPayload(db, user)
})

route('POST', '/api/auth/login', async ({ db, body }) => {
  const username = str(body.username).toLowerCase()
  const password = str(body.password)
  if (!username || !password) throw new LocalApiError('Identifiant et mot de passe requis.', 400)
  const user = db.users.find(u => u.actif && u.username.toLowerCase() === username)
  if (!user || (await hashPassword(password, user.salt)) !== user.password_hash) {
    if (user) audit(db, user.role, 'CONNEXION_ECHOUEE', 'Session', user.nom_complet, 'Mot de passe incorrect')
    throw new LocalApiError('Identifiant ou mot de passe incorrect.', 401)
  }
  audit(db, user.role, 'CONNEXION', 'Session', user.nom_complet, 'Connexion réussie')
  return sessionPayload(db, user)
})

route('POST', '/api/auth/logout', ({ db, token }) => {
  if (token && db.sessions[token]) {
    const user = db.users.find(u => u.id === db.sessions[token])
    if (user) audit(db, user.role, 'DECONNEXION', 'Session', user.nom_complet, 'Déconnexion')
    delete db.sessions[token]
  }
  return { ok: true }
})

route('GET', '/api/auth/me', ({ db, token }) => {
  const { user } = requireAuth(db, token)
  return { user: { id: user.id, role: user.role, label: user.nom_complet, username: user.username } }
})

route('PUT', '/api/auth/password', async ({ db, body, token }) => {
  const { user } = requireAuth(db, token)
  const current = str(body.currentPassword)
  const next = str(body.newPassword)
  if ((await hashPassword(current, user.salt)) !== user.password_hash) {
    throw new LocalApiError('Mot de passe actuel incorrect.', 401)
  }
  if (next.length < 4) throw new LocalApiError('Le nouveau mot de passe doit faire au moins 4 caractères.', 400)
  user.salt = newSalt()
  user.password_hash = await hashPassword(next, user.salt)
  audit(db, user.role, 'CHANGEMENT_MOT_DE_PASSE', 'Session', user.nom_complet)
  return { ok: true }
})

route('GET', '/api/auth/users', ({ db, token }) => {
  const { user } = requireAuth(db, token)
  if (user.role !== 'directeur') throw new LocalApiError('Réservé au Directeur.', 403)
  return db.users.map(({ password_hash: _p, salt: _s, ...u }) => u)
})

route('PUT', '/api/auth/reset-password', async ({ db, body, token }) => {
  const { user } = requireAuth(db, token)
  if (user.role !== 'directeur') throw new LocalApiError('Réservé au Directeur.', 403)
  const target = db.users.find(u => u.id === str(body.userId))
  if (!target) throw new LocalApiError('Compte introuvable.', 404)
  const next = str(body.newPassword)
  if (next.length < 4) throw new LocalApiError('Le mot de passe doit faire au moins 4 caractères.', 400)
  target.salt = newSalt()
  target.password_hash = await hashPassword(next, target.salt)
  audit(db, user.role, 'REINITIALISATION_MOT_DE_PASSE', 'Session', target.username)
  return { ok: true }
})

// Paramètres
route('GET', '/api/settings', ({ db, token }) => { requireAuth(db, token); return db.settings })
route('PUT', '/api/settings', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'seeSettings')
  const s = db.settings
  for (const k of ['school_name', 'sigle', 'code_etablissement', 'ville', 'annee_scolaire'] as const) {
    if (body[k] !== undefined && str(body[k])) s[k] = str(body[k])
  }
  for (const k of ['telephone', 'email'] as const) if (body[k] !== undefined) s[k] = str(body[k])
  for (const k of ['taux_horaire_vacataire', 'seuil_alerte_montant'] as const) {
    if (body[k] !== undefined) s[k] = int(body[k], k, { min: 0 })
  }
  audit(db, auth.user.role, 'MODIFICATION', 'Paramètres', '', JSON.stringify(body))
  emitChange('settings')
  return s
})

// Classes
route('GET', '/api/classes', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.classes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }))
})
route('POST', '/api/classes', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'editClasses')
  const nom = required(body.nom, 'Le nom de la classe')
  if (db.classes.some(c => c.nom.toLowerCase() === nom.toLowerCase())) {
    throw new LocalApiError('Une classe porte déjà ce nom.', 409)
  }
  const c: Class = {
    id: uuid(), nom, niveau: required(body.niveau, 'Le niveau'),
    frais: body.frais === undefined ? 0 : int(body.frais, 'Les frais', { min: 0 }),
    actif: true, created_at: nowIso(),
  }
  db.classes.push(c)
  audit(db, auth.user.role, 'CREATION', 'Classe', c.nom)
  emitChange('classes')
  return c
})
route('PUT', '/api/classes/:id', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'editClasses')
  const c = db.classes.find(x => x.id === params[0])
  if (!c) throw new LocalApiError('Classe introuvable.', 404)
  if (body.nom !== undefined) c.nom = required(body.nom, 'Le nom de la classe')
  if (body.niveau !== undefined) c.niveau = required(body.niveau, 'Le niveau')
  if (body.actif !== undefined) c.actif = !!body.actif
  let fraisChanged = false
  if (body.frais !== undefined) {
    const f = int(body.frais, 'Les frais', { min: 0 })
    fraisChanged = f !== c.frais
    c.frais = f
  }
  // Répercute nom et frais sur les élèves de la classe
  for (const s of db.students) {
    if (s.classe_id !== c.id) continue
    s.classe_nom = c.nom
    if (fraisChanged) {
      // Re-évaluer selon barème ou frais
      const matched = findTuitionSchedule(db.tuition_schedules, s.student_type || 'NON_AFFECTE', c.nom, db.settings.annee_scolaire)
      s.scolarite_base = matched ? matched.total_amount : c.frais
      s.total_du = Math.max(0, s.scolarite_base + (s.frais_additionnels || 0) - (s.remise || 0))
      s.statut = statutOf(s.total_du, s.total_paye)
      s.updated_at = nowIso()
    }
  }
  audit(db, auth.user.role, 'MODIFICATION', 'Classe', c.nom, JSON.stringify(body))
  emitChange('classes', 'students')
  return c
})

// Élèves
route('GET', '/api/students', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.students].sort((a, b) => `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr'))
})

function applyStudentFields(db: Db, s: Partial<Student>, body: Body, isNew: boolean) {
  if (isNew || body.nom !== undefined) s.nom = required(body.nom, "Le nom de l'élève").toUpperCase()
  if (isNew || body.prenoms !== undefined) s.prenoms = required(body.prenoms, "Les prénoms de l'élève")
  if (isNew || body.sexe !== undefined) s.sexe = body.sexe === 'F' ? 'F' : 'M'
  for (const k of ['date_naissance', 'parent_nom', 'parent_tel'] as const) {
    if (isNew || body[k] !== undefined) s[k] = optStr(body[k])
  }
  if (isNew || body.student_type !== undefined) {
    s.student_type = body.student_type === 'AFFECTE_ETAT' ? 'AFFECTE_ETAT' : 'NON_AFFECTE'
  } else if (isNew && !s.student_type) {
    s.student_type = 'AFFECTE_ETAT'
  }
  if (isNew || body.frais_additionnels !== undefined) {
    s.frais_additionnels = body.frais_additionnels == null ? 0 : int(body.frais_additionnels, 'Les frais additionnels', { min: 0 })
  }
  if (isNew || body.remise !== undefined) {
    s.remise = body.remise == null ? 0 : int(body.remise, 'La remise', { min: 0 })
  }
  if (isNew || body.classe_id !== undefined) {
    const cid = optStr(body.classe_id)
    if (cid) {
      const c = db.classes.find(x => x.id === cid)
      if (!c) throw new LocalApiError('Classe introuvable.', 404)
      s.classe_id = c.id
      s.classe_nom = c.nom
    } else {
      s.classe_id = undefined
      s.classe_nom = undefined
    }
  }
  if (body.actif !== undefined) s.actif = !!body.actif
  if (body.photo !== undefined) s.photo = optStr(body.photo)

  // Attribution automatique de la scolarité officielle selon le type d'élève et la classe
  const annee = db.settings.annee_scolaire || '2026-2027'
  const studentType: StudentType = s.student_type || 'AFFECTE_ETAT'
  const matchedSchedule = findTuitionSchedule(db.tuition_schedules, studentType, s.classe_nom || '', annee)

  if (body.scolarite_base !== undefined && body.scolarite_base !== null && Number(body.scolarite_base) >= 0) {
    s.scolarite_base = int(body.scolarite_base, 'La scolarité de base', { min: 0 })
  } else if (matchedSchedule) {
    s.scolarite_base = matchedSchedule.total_amount
  } else {
    const frais = s.classe_id ? db.classes.find(c => c.id === s.classe_id)?.frais ?? 0 : 0
    s.scolarite_base = frais
  }

  s.total_du = Math.max(0, (s.scolarite_base ?? 0) + (s.frais_additionnels ?? 0) - (s.remise ?? 0))
  s.statut = statutOf(s.total_du, s.total_paye ?? 0)
}

function uniqueMatricule(db: Db, wanted: string, exceptId?: string) {
  const m = wanted.toUpperCase()
  if (db.students.some(s => s.id !== exceptId && s.matricule.toUpperCase() === m)) {
    throw new LocalApiError(`Le matricule ${m} est déjà attribué à un autre élève.`, 409)
  }
  return m
}

route('POST', '/api/students', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'editStudents')
  const s: Partial<Student> = {
    id: uuid(), token: uuid(), total_paye: 0, actif: true,
    date_inscription: todayStr(), created_at: nowIso(), updated_at: nowIso(),
  }
  applyStudentFields(db, s, body, true)
  const wanted = optStr(body.matricule)
  if (wanted) {
    s.matricule = uniqueMatricule(db, wanted)
  } else {
    let m: string
    do {
      m = fmtCounter('E', db.settings.annee_scolaire, db.settings.matricule_counter++, 4)
    } while (db.students.some(x => x.matricule === m))
    s.matricule = m
  }
  db.students.push(s as Student)
  audit(db, auth.user.role, 'CREATION', 'Élève', `${s.matricule} — ${s.nom} ${s.prenoms}`)
  emitChange('students')
  return s
})

route('PUT', '/api/students/:id', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'editStudents')
  const s = db.students.find(x => x.id === params[0])
  if (!s) throw new LocalApiError('Élève introuvable.', 404)
  applyStudentFields(db, s, body, false)
  const wanted = optStr(body.matricule)
  if (wanted) s.matricule = uniqueMatricule(db, wanted, s.id)
  s.updated_at = nowIso()
  audit(db, auth.user.role, 'MODIFICATION', 'Élève', `${s.matricule} — ${s.nom} ${s.prenoms}`)
  emitChange('students')
  return s
})

route('DELETE', '/api/students/:id', ({ db, params, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'editStudents')
  const idx = db.students.findIndex(x => x.id === params[0])
  if (idx === -1) throw new LocalApiError('Élève introuvable.', 404)
  const s = db.students[idx]
  const hasPayments = db.payments.some(p => p.student_id === s.id)
  const force = !!(body && (body as Record<string, unknown>).force)

  if (force || !hasPayments) {
    db.students.splice(idx, 1)
    audit(db, auth.user.role, 'SUPPRESSION', 'Élève', `${s.matricule} — ${s.nom} ${s.prenoms}`, 'Suppression définitive')
    emitChange('students')
    return { ok: true, deleted: true, message: 'Élève supprimé définitivement.' }
  } else {
    s.actif = false
    s.updated_at = nowIso()
    audit(db, auth.user.role, 'DESACTIVATION', 'Élève', `${s.matricule} — ${s.nom} ${s.prenoms}`, 'Désactivé car des versements sont associés')
    emitChange('students')
    return { ok: true, deleted: false, message: 'Élève désactivé (des versements sont associés).' }
  }
})

// Paiements
route('GET', '/api/payments', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.payments].sort((a, b) => b.date.localeCompare(a.date))
})
route('POST', '/api/payments', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'pay')
  const student = db.students.find(s => s.id === str(body.student_id))
  if (!student) throw new LocalApiError('Élève introuvable.', 404)
  const montant = int(body.montant, 'Le montant', { positive: true })

  // Validation du mode de paiement
  const mode = str(body.mode) || 'Espèces'
  const reference = optStr(body.reference)
  const electronicModes = ['ORANGE MONEY', 'MTN MONEY', 'MOOV MONEY', 'WAVE', 'VIREMENT BANCAIRE', 'CHÈQUE']
  const isElectronic = electronicModes.some(m => m.toLowerCase() === mode.toLowerCase())
  if (isElectronic && !reference) {
    throw new LocalApiError(`La référence ou le numéro de transaction est obligatoire pour les règlements par ${mode}.`, 400)
  }

  // Interdiction stricte de trop-perçu sauf autorisation explicite de crédit
  const resteAvant = Math.max(0, student.total_du - student.total_paye)
  const allowCredit = !!body.allow_credit
  if (montant > resteAvant && !allowCredit) {
    throw new LocalApiError(
      `Le montant saisi (${montant.toLocaleString('fr-FR')} FCFA) dépasse le solde restant de l'élève (${resteAvant.toLocaleString('fr-FR')} FCFA). Activez "Autoriser le trop-perçu (crédit)" si vous désirez enregistrer un crédit.`,
      400
    )
  }

  const ancienSolde = resteAvant
  student.total_paye += montant
  const nouveauSolde = Math.max(0, student.total_du - student.total_paye)
  student.statut = statutOf(student.total_du, student.total_paye)
  student.updated_at = nowIso()

  const p: Payment = {
    id: uuid(),
    student_id: student.id,
    student_nom: `${student.nom} ${student.prenoms}`,
    student_matricule: student.matricule,
    classe_nom: student.classe_nom,
    student_type: student.student_type,
    montant,
    mode,
    motif: str(body.motif) || 'Scolarité',
    reference,
    recu_numero: fmtCounter('R', db.settings.annee_scolaire, db.settings.recu_counter++, 5),
    caissiere: auth.user.nom_complet,
    annule: false,
    ancien_solde: ancienSolde,
    nouveau_solde: nouveauSolde,
    notes: optStr(body.notes),
    total_du_apres: student.total_du,
    total_paye_apres: student.total_paye,
    date: str(body.date) ? str(body.date) : nowIso(),
    created_at: nowIso(),
  }
  db.payments.push(p)

  // Mettre à jour les relances en attente si l'élève est désormais soldé
  if (student.statut === 'SOLDE' && Array.isArray(db.payment_reminders)) {
    db.payment_reminders.forEach(r => {
      if (r.student_id === student.id && r.status === 'BROUILLON') {
        r.status = 'DELIVREE'
      }
    })
  }

  audit(db, auth.user.role, 'PAIEMENT', 'Paiement', `${p.recu_numero} — ${p.student_nom}`, `${p.montant} FCFA (${p.mode}${p.reference ? ' - Réf: ' + p.reference : ''})`)
  emitChange('payments', 'students', 'payment_reminders')
  return p
})
route('POST', '/api/payments/:id/annuler', ({ db, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'pay')
  const p = db.payments.find(x => x.id === params[0])
  if (!p) throw new LocalApiError('Paiement introuvable.', 404)
  if (p.annule) throw new LocalApiError('Ce paiement est déjà annulé.', 409)
  const s = db.students.find(x => x.id === p.student_id)
  if (s) {
    s.total_paye = Math.max(0, s.total_paye - p.montant)
    s.statut = statutOf(s.total_du, s.total_paye)
    s.updated_at = nowIso()
  }
  p.annule = true
  audit(db, auth.user.role, 'ANNULATION', 'Paiement', `${p.recu_numero} — ${p.student_nom}`, `${p.montant} FCFA`)
  emitChange('payments', 'students')
  return p
})

// Dépenses
route('GET', '/api/expenses', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.expenses].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at))
})
route('POST', '/api/expenses', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'manageCaisse')
  const e: Expense = {
    id: uuid(),
    numero: fmtCounter('D', db.settings.annee_scolaire, db.settings.dep_counter++, 4),
    categorie: required(body.categorie, 'La catégorie'),
    beneficiaire: optStr(body.beneficiaire),
    montant: int(body.montant, 'Le montant', { positive: true }),
    mode: str(body.mode) || 'Espèces',
    statut: 'EN_ATTENTE',
    description: optStr(body.description),
    saisi_par: auth.user.nom_complet,
    date: required(body.date, 'La date'),
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  db.expenses.push(e)
  audit(db, auth.user.role, 'CREATION', 'Dépense', `${e.numero} — ${e.categorie}`, `${e.montant} FCFA`)
  emitChange('expenses')
  return e
})
const TRANSITIONS: Record<string, { perm: string; from: Expense['statut'][]; to: Expense['statut']; label: string; action: string }> = {
  valider: { perm: 'validateExpense', from: ['EN_ATTENTE'], to: 'VALIDEE', label: 'validée', action: 'VALIDATION' },
  payer: { perm: 'manageCaisse', from: ['VALIDEE'], to: 'PAYEE', label: 'payée', action: 'PAIEMENT' },
  annuler: { perm: 'manageCaisse', from: ['EN_ATTENTE', 'VALIDEE'], to: 'ANNULEE', label: 'annulée', action: 'ANNULATION' },
}
route('POST', '/api/expenses/:id/:action', ({ db, params, token }) => {
  const auth = requireAuth(db, token)
  const t = TRANSITIONS[params[1]]
  if (!t) throw new LocalApiError('Action inconnue.', 404)
  requirePerm(auth, t.perm)
  const e = db.expenses.find(x => x.id === params[0])
  if (!e) throw new LocalApiError('Dépense introuvable.', 404)
  if (!t.from.includes(e.statut)) {
    throw new LocalApiError(`Cette dépense est au statut "${e.statut}" et ne peut pas être ${t.label}.`, 409)
  }
  e.statut = t.to
  if (t.to === 'VALIDEE') e.valide_par = auth.user.nom_complet
  e.updated_at = nowIso()
  audit(db, auth.user.role, t.action, 'Dépense', `${e.numero} — ${e.categorie}`, `${e.montant} FCFA`)
  emitChange('expenses')
  return e
})

// Clôtures de caisse
route('GET', '/api/cash_closures', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.cash_closures].sort((a, b) => b.date.localeCompare(a.date))
})
route('POST', '/api/cash_closures', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'manageCaisse')
  const date = required(body.date, 'La date')
  if (db.cash_closures.some(c => c.date === date)) {
    throw new LocalApiError('La caisse est déjà clôturée pour cette date.', 409)
  }
  const localDay = (iso: string) => {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso.slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const entrees = db.payments.filter(p => !p.annule && localDay(p.date) === date).reduce((a, p) => a + p.montant, 0)
  const sorties = db.expenses.filter(e => e.statut === 'PAYEE' && e.date === date).reduce((a, e) => a + e.montant, 0)
  const prev = db.cash_closures.filter(c => c.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]
  const solde_initial = prev?.solde_theorique ?? 0
  const solde_theorique = solde_initial + entrees - sorties
  const solde_physique = int(body.solde_physique, 'Le solde physique')
  const c: CashClosure = {
    id: uuid(), date, solde_initial, entrees, sorties, solde_theorique, solde_physique,
    ecart: solde_physique - solde_theorique,
    cloture_par: auth.user.nom_complet,
    observations: optStr(body.observations),
    created_at: nowIso(),
  }
  db.cash_closures.push(c)
  audit(db, auth.user.role, 'CLOTURE', 'Caisse', c.date, `Écart: ${c.ecart} FCFA`)
  emitChange('cash_closures')
  return c
})

// Journal d'audit
route('GET', '/api/audit_logs', ({ db, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'seeAudit')
  return db.audit_logs.slice(0, 1000)
})

// Personnel (CRUD)
route('POST', '/api/staff', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'managePersonnel')
  const nom = required(body.nom, 'Le nom').toUpperCase()
  const prenoms = required(body.prenoms, 'Les prénoms')
  let matricule = optStr(body.matricule)?.toUpperCase()
  if (!matricule) {
    const count = db.staff.length + 1
    matricule = `PER-${String(count).padStart(3, '0')}`
  }
  const s: Staff = {
    id: uuid(),
    matricule,
    nom,
    prenoms,
    poste: optStr(body.poste),
    salaire_base: body.salaire_base !== undefined ? int(body.salaire_base, 'Le salaire de base', { min: 0 }) : 0,
    telephone: optStr(body.telephone),
    rib: optStr(body.rib),
    date_embauche: optStr(body.date_embauche) || todayStr(),
    actif: body.actif !== undefined ? !!body.actif : true,
    created_at: nowIso(),
  }
  db.staff.push(s)
  audit(db, auth.user.role, 'CREATION', 'Personnel', `${s.matricule ?? ''} — ${s.nom} ${s.prenoms}`.trim())
  emitChange('staff')
  return s
})

route('PUT', '/api/staff/:id', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'managePersonnel')
  const s = db.staff.find(x => x.id === params[0])
  if (!s) throw new LocalApiError('Personnel introuvable.', 404)
  if (body.nom !== undefined) s.nom = required(body.nom, 'Le nom').toUpperCase()
  if (body.prenoms !== undefined) s.prenoms = required(body.prenoms, 'Les prénoms')
  if (body.matricule !== undefined) s.matricule = optStr(body.matricule)?.toUpperCase()
  if (body.poste !== undefined) s.poste = optStr(body.poste)
  if (body.salaire_base !== undefined) s.salaire_base = int(body.salaire_base, 'Le salaire de base', { min: 0 })
  if (body.telephone !== undefined) s.telephone = optStr(body.telephone)
  if (body.rib !== undefined) s.rib = optStr(body.rib)
  if (body.date_embauche !== undefined) s.date_embauche = optStr(body.date_embauche)
  if (body.actif !== undefined) s.actif = !!body.actif
  audit(db, auth.user.role, 'MODIFICATION', 'Personnel', `${s.matricule ?? ''} — ${s.nom} ${s.prenoms}`.trim())
  emitChange('staff')
  return s
})

route('DELETE', '/api/staff/:id', ({ db, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'managePersonnel')
  const idx = db.staff.findIndex(x => x.id === params[0])
  if (idx === -1) throw new LocalApiError('Personnel introuvable.', 404)
  const s = db.staff[idx]
  db.staff.splice(idx, 1)
  audit(db, auth.user.role, 'SUPPRESSION', 'Personnel', `${s.matricule ?? ''} — ${s.nom} ${s.prenoms}`.trim())
  emitChange('staff')
  return { ok: true }
})

// ─────────────────────────────────────────────────────────────────────────────
// Barèmes de scolarité
// ─────────────────────────────────────────────────────────────────────────────
route('GET', '/api/tuition-schedules', ({ db, token }) => {
  requireAuth(db, token)
  return [...db.tuition_schedules].sort((a, b) => {
    if (a.academic_year !== b.academic_year) return b.academic_year.localeCompare(a.academic_year)
    if (a.student_type !== b.student_type) return a.student_type.localeCompare(b.student_type)
    return a.label.localeCompare(b.label, 'fr')
  })
})

route('POST', '/api/tuition-schedules', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'seeSettings')
  const academic_year = required(body.academic_year, "L'année scolaire")
  const student_type: StudentType = body.student_type === 'AFFECTE_ETAT' ? 'AFFECTE_ETAT' : 'NON_AFFECTE'
  const level_group = required(body.level_group, 'Le groupe de niveaux')
  const label = required(body.label, 'Le libellé du barème')
  const registration_fee = int(body.registration_fee ?? 0, "Les frais d'inscription", { min: 0 })
  const october_due = int(body.october_due ?? 0, "L'échéance d'octobre", { min: 0 })
  const november_due = int(body.november_due ?? 0, "L'échéance de novembre", { min: 0 })
  const december_due = int(body.december_due ?? 0, "L'échéance de décembre", { min: 0 })
  const january_due = int(body.january_due ?? 0, "L'échéance de janvier", { min: 0 })
  const total_amount = registration_fee + october_due + november_due + december_due + january_due
  const classes = Array.isArray(body.classes) ? (body.classes as string[]).map(c => String(c).trim()).filter(Boolean) : []

  const item: TuitionSchedule = {
    id: uuid(),
    academic_year,
    student_type,
    level_group,
    label,
    classes,
    registration_fee,
    october_due,
    november_due,
    december_due,
    january_due,
    total_amount,
    currency: 'XOF',
    is_active: body.is_active !== undefined ? !!body.is_active : true,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  db.tuition_schedules.push(item)
  audit(db, auth.user.role, 'CREATION', 'Barème Scolarité', item.label, `${item.total_amount} FCFA`)
  emitChange('tuition_schedules')
  return item
})

route('PUT', '/api/tuition-schedules/:id', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'seeSettings')
  const item = db.tuition_schedules.find(x => x.id === params[0])
  if (!item) throw new LocalApiError('Barème introuvable.', 404)

  if (body.academic_year !== undefined) item.academic_year = required(body.academic_year, "L'année scolaire")
  if (body.student_type !== undefined) item.student_type = body.student_type === 'AFFECTE_ETAT' ? 'AFFECTE_ETAT' : 'NON_AFFECTE'
  if (body.level_group !== undefined) item.level_group = required(body.level_group, 'Le groupe de niveaux')
  if (body.label !== undefined) item.label = required(body.label, 'Le libellé')
  if (body.registration_fee !== undefined) item.registration_fee = int(body.registration_fee, "Frais d'inscription", { min: 0 })
  if (body.october_due !== undefined) item.october_due = int(body.october_due, "Échéance octobre", { min: 0 })
  if (body.november_due !== undefined) item.november_due = int(body.november_due, "Échéance novembre", { min: 0 })
  if (body.december_due !== undefined) item.december_due = int(body.december_due, "Échéance décembre", { min: 0 })
  if (body.january_due !== undefined) item.january_due = int(body.january_due, "Échéance janvier", { min: 0 })
  item.total_amount = item.registration_fee + item.october_due + item.november_due + item.december_due + item.january_due
  if (body.classes !== undefined && Array.isArray(body.classes)) {
    item.classes = (body.classes as string[]).map(c => String(c).trim()).filter(Boolean)
  }
  if (body.is_active !== undefined) item.is_active = !!body.is_active
  item.updated_at = nowIso()

  audit(db, auth.user.role, 'MODIFICATION', 'Barème Scolarité', item.label, `${item.total_amount} FCFA`)
  emitChange('tuition_schedules')
  return item
})

route('DELETE', '/api/tuition-schedules/:id', ({ db, params, token }) => {
  const auth = requireAuth(db, token)
  requirePerm(auth, 'seeSettings')
  const idx = db.tuition_schedules.findIndex(x => x.id === params[0])
  if (idx === -1) throw new LocalApiError('Barème introuvable.', 404)
  const item = db.tuition_schedules[idx]
  db.tuition_schedules.splice(idx, 1)
  audit(db, auth.user.role, 'SUPPRESSION', 'Barème Scolarité', item.label)
  emitChange('tuition_schedules')
  return { ok: true }
})

// ─────────────────────────────────────────────────────────────────────────────
// Comptes financiers & Échéanciers élèves
// ─────────────────────────────────────────────────────────────────────────────
route('GET', '/api/students/:id/financial-account', ({ db, params, token }) => {
  requireAuth(db, token)
  const student = db.students.find(s => s.id === params[0])
  if (!student) throw new LocalApiError('Élève introuvable.', 404)
  const annee = db.settings.annee_scolaire || '2026-2027'
  const schedule = findTuitionSchedule(db.tuition_schedules, student.student_type || 'AFFECTE_ETAT', student.classe_nom || '', annee)
  return computeFinancialAccount(student, schedule, db.payment_reminders || [], annee)
})

route('GET', '/api/students/:id/payment-schedule', ({ db, params, token }) => {
  requireAuth(db, token)
  const student = db.students.find(s => s.id === params[0])
  if (!student) throw new LocalApiError('Élève introuvable.', 404)
  const annee = db.settings.annee_scolaire || '2026-2027'
  const schedule = findTuitionSchedule(db.tuition_schedules, student.student_type || 'AFFECTE_ETAT', student.classe_nom || '', annee)
  return computeInstallments(schedule, student.total_paye || 0, annee)
})

// ─────────────────────────────────────────────────────────────────────────────
// Relances des paiements
// ─────────────────────────────────────────────────────────────────────────────
route('GET', '/api/payment-reminders', ({ db, token }) => {
  requireAuth(db, token)
  return [...(db.payment_reminders || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
})

route('GET', '/api/students/:id/reminders', ({ db, params, token }) => {
  requireAuth(db, token)
  return (db.payment_reminders || [])
    .filter(r => r.student_id === params[0])
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
})

route('POST', '/api/students/:id/reminders', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  const student = db.students.find(s => s.id === params[0])
  if (!student) throw new LocalApiError('Élève introuvable.', 404)

  const reste = Math.max(0, student.total_du - student.total_paye)
  if (reste === 0) {
    throw new LocalApiError("Cet élève est intégralement soldé. Les relances sont automatiquement désactivées.", 400)
  }

  const annee = db.settings.annee_scolaire || '2026-2027'
  const schedule = findTuitionSchedule(db.tuition_schedules, student.student_type || 'AFFECTE_ETAT', student.classe_nom || '', annee)
  const account = computeFinancialAccount(student, schedule, db.payment_reminders || [], annee)

  const channel: ReminderChannel = (str(body.channel) as ReminderChannel) || 'WHATSAPP'
  const motif: ReminderMotif = (str(body.motif) as ReminderMotif) || (account.montant_echu > 0 ? 'ECHEANCE_DEPASSEE' : 'SCOLARITE_IMPAYEE')
  const message = str(body.message) || buildReminderMessage(account, db.settings.school_name, db.settings.code_etablissement)

  const reminder: PaymentReminder = {
    id: uuid(),
    student_id: student.id,
    student_nom: `${student.nom} ${student.prenoms}`.trim(),
    student_matricule: student.matricule,
    classe_nom: student.classe_nom || '',
    student_type: student.student_type,
    parent_nom: student.parent_nom,
    parent_tel: student.parent_tel,
    amount_due_at_reminder: reste,
    overdue_amount: account.montant_echu,
    channel,
    motif,
    message,
    status: 'ENVOYEE',
    sent_at: nowIso(),
    created_by: auth.user.nom_complet,
    created_at: nowIso(),
    updated_at: nowIso(),
  }

  if (!Array.isArray(db.payment_reminders)) db.payment_reminders = []
  db.payment_reminders.unshift(reminder)

  audit(db, auth.user.role, 'RELANCE', 'Relance Paiement', `${student.matricule} — ${reminder.channel}`, `${reste} FCFA`)
  emitChange('payment_reminders')
  return reminder
})

route('POST', '/api/reminders/bulk', ({ db, body, token }) => {
  const auth = requireAuth(db, token)
  const channel: ReminderChannel = (str(body.channel) as ReminderChannel) || 'WHATSAPP'
  const classe_nom = optStr(body.classe_nom)
  const filter_statut = optStr(body.statut) // 'EN_RETARD', 'NON_SOLDE', 'ALL'
  const annee = db.settings.annee_scolaire || '2026-2027'

  let candidates = db.students.filter(s => s.actif && (s.total_du - s.total_paye) > 0)
  if (classe_nom) {
    candidates = candidates.filter(s => s.classe_nom === classe_nom)
  }

  const generated: PaymentReminder[] = []

  for (const s of candidates) {
    const schedule = findTuitionSchedule(db.tuition_schedules, s.student_type || 'AFFECTE_ETAT', s.classe_nom || '', annee)
    const account = computeFinancialAccount(s, schedule, db.payment_reminders || [], annee)

    if (filter_statut === 'EN_RETARD' && account.montant_echu <= 0) continue

    const motif: ReminderMotif = account.montant_echu > 0 ? 'ECHEANCE_DEPASSEE' : 'SCOLARITE_IMPAYEE'
    const message = buildReminderMessage(account, db.settings.school_name, db.settings.code_etablissement)

    const r: PaymentReminder = {
      id: uuid(),
      student_id: s.id,
      student_nom: `${s.nom} ${s.prenoms}`.trim(),
      student_matricule: s.matricule,
      classe_nom: s.classe_nom || '',
      student_type: s.student_type,
      parent_nom: s.parent_nom,
      parent_tel: s.parent_tel,
      amount_due_at_reminder: account.reste,
      overdue_amount: account.montant_echu,
      channel,
      motif,
      message,
      status: 'ENVOYEE',
      sent_at: nowIso(),
      created_by: auth.user.nom_complet,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    generated.push(r)
  }

  if (!Array.isArray(db.payment_reminders)) db.payment_reminders = []
  db.payment_reminders = [...generated, ...db.payment_reminders]

  audit(db, auth.user.role, 'RELANCE_GROUPEE', 'Relances', `${generated.length} relances envoyées`, `Canal: ${channel}`)
  emitChange('payment_reminders')
  return { ok: true, count: generated.length, reminders: generated }
})

route('PUT', '/api/payment-reminders/:id/status', ({ db, body, params, token }) => {
  const auth = requireAuth(db, token)
  const item = (db.payment_reminders || []).find(r => r.id === params[0])
  if (!item) throw new LocalApiError('Relance introuvable.', 404)
  item.status = required(body.status, 'Le statut') as ReminderStatus
  item.updated_at = nowIso()
  emitChange('payment_reminders')
  return item
})

// ─────────────────────────────────────────────────────────────────────────────
// Rapports de scolarité & Recouvrement
// ─────────────────────────────────────────────────────────────────────────────
route('GET', '/api/reports/tuition', ({ db, token }) => {
  requireAuth(db, token)
  const annee = db.settings.annee_scolaire || '2026-2027'
  const accounts = db.students.filter(s => s.actif).map(s => {
    const schedule = findTuitionSchedule(db.tuition_schedules, s.student_type || 'AFFECTE_ETAT', s.classe_nom || '', annee)
    return computeFinancialAccount(s, schedule, db.payment_reminders || [], annee)
  })

  const totalAttendu = accounts.reduce((a, acc) => a + acc.total_du, 0)
  const totalEncaisse = accounts.reduce((a, acc) => a + acc.total_paye, 0)
  const totalRestant = accounts.reduce((a, acc) => a + acc.reste, 0)
  const totalEchu = accounts.reduce((a, acc) => a + acc.montant_echu, 0)
  const tauxGlobal = totalAttendu > 0 ? Math.round((totalEncaisse / totalAttendu) * 10000) / 100 : 100

  // Statistiques par type d'élève
  const affectes = accounts.filter(a => a.student_type === 'AFFECTE_ETAT')
  const nonAffectes = accounts.filter(a => a.student_type === 'NON_AFFECTE')

  const affectesAttendu = affectes.reduce((a, c) => a + c.total_du, 0)
  const affectesEncaisse = affectes.reduce((a, c) => a + c.total_paye, 0)
  const affectesRestant = affectes.reduce((a, c) => a + c.reste, 0)

  const nonAffectesAttendu = nonAffectes.reduce((a, c) => a + c.total_du, 0)
  const nonAffectesEncaisse = nonAffectes.reduce((a, c) => a + c.total_paye, 0)
  const nonAffectesRestant = nonAffectes.reduce((a, c) => a + c.reste, 0)

  // Statistiques par classe
  const parClasse: Record<string, { classe: string; effectif: number; attendu: number; paye: number; restant: number; taux: number; soldes: number }> = {}
  for (const acc of accounts) {
    const cl = acc.classe_nom || 'Non renseignée'
    if (!parClasse[cl]) parClasse[cl] = { classe: cl, effectif: 0, attendu: 0, paye: 0, restant: 0, taux: 0, soldes: 0 }
    parClasse[cl].effectif += 1
    parClasse[cl].attendu += acc.total_du
    parClasse[cl].paye += acc.total_paye
    parClasse[cl].restant += acc.reste
    if (acc.reste === 0) parClasse[cl].soldes += 1
  }
  Object.values(parClasse).forEach(c => {
    c.taux = c.attendu > 0 ? Math.round((c.paye / c.attendu) * 10000) / 100 : 100
  })

  return {
    annee_scolaire: annee,
    code_etablissement: db.settings.code_etablissement || '01757',
    school_name: db.settings.school_name,
    effectif_total: accounts.length,
    effectif_soldes: accounts.filter(a => a.reste === 0).length,
    effectif_retard: accounts.filter(a => a.montant_echu > 0).length,
    total_attendu: totalAttendu,
    total_encaisse: totalEncaisse,
    total_restant: totalRestant,
    total_echu: totalEchu,
    taux_recouvrement: tauxGlobal,
    affectes: {
      effectif: affectes.length,
      attendu: affectesAttendu,
      encaisse: affectesEncaisse,
      restant: affectesRestant,
      taux: affectesAttendu > 0 ? Math.round((affectesEncaisse / affectesAttendu) * 10000) / 100 : 100,
    },
    non_affectes: {
      effectif: nonAffectes.length,
      attendu: nonAffectesAttendu,
      encaisse: nonAffectesEncaisse,
      restant: nonAffectesRestant,
      taux: nonAffectesAttendu > 0 ? Math.round((nonAffectesEncaisse / nonAffectesAttendu) * 10000) / 100 : 100,
    },
    classes: Object.values(parClasse).sort((a, b) => a.classe.localeCompare(b.classe, 'fr', { numeric: true })),
  }
})

route('GET', '/api/reports/unpaid-students', ({ db, token }) => {
  requireAuth(db, token)
  const annee = db.settings.annee_scolaire || '2026-2027'
  return db.students
    .filter(s => s.actif && (s.total_du - s.total_paye) > 0)
    .map(s => {
      const schedule = findTuitionSchedule(db.tuition_schedules, s.student_type || 'AFFECTE_ETAT', s.classe_nom || '', annee)
      return computeFinancialAccount(s, schedule, db.payment_reminders || [], annee)
    })
    .sort((a, b) => b.reste - a.reste)
})

// Tables en lecture seule (vacataires, dettes, documents…)
for (const t of LIST_TABLES) {
  route('GET', `/api/${t}`, ({ db, token }) => { requireAuth(db, token); return db[t] })
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────
export async function localRequest<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  const cleanPath = path.split('?')[0].replace(/\/$/, '')
  for (const r of routes) {
    if (r.method !== method) continue
    const m = cleanPath.match(r.pattern)
    if (!m) continue
    const db = await load()
    const result = await r.handler({ db, body: (body ?? {}) as Body, params: m.slice(1).map(decodeURIComponent), token })
    if (method !== 'GET') save(db)
    // Copie profonde : l'appelant ne doit pas pouvoir modifier la base par référence
    return JSON.parse(JSON.stringify(result ?? null)) as T
  }
  throw new LocalApiError(`Route inconnue : ${method} ${cleanPath}`, 404)
}

// ─── Sauvegarde / restauration ───────────────────────────────────────────────
export async function exportBackup(): Promise<string> {
  const db = await load()
  const { sessions: _s, ...rest } = db
  return JSON.stringify({ app: 'cse-divo', exported_at: nowIso(), data: rest }, null, 2)
}

export async function importBackup(json: string): Promise<void> {
  let parsed: { app?: string; data?: Partial<Db> }
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new LocalApiError("Le fichier n'est pas une sauvegarde valide (JSON illisible).", 400)
  }
  const data = parsed?.data
  if (parsed?.app !== 'cse-divo' || !data || !Array.isArray(data.users) || !Array.isArray(data.students)) {
    throw new LocalApiError("Le fichier n'est pas une sauvegarde CSE Divo.", 400)
  }
  const current = await load()
  const db: Db = { ...emptyDb(), ...data, settings: { ...defaultSettings(), ...data.settings }, sessions: current.sessions, version: 1 }
  save(db)
  emitChange('settings', 'classes', 'students', 'payments', 'expenses', 'cash_closures', 'audit_logs', 'tuition_schedules', 'payment_reminders')
}
