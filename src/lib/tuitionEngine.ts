import type {
  TuitionSchedule, Student, Payment, PaymentReminder,
  StudentFinancialAccount, Installment, StudentType, StudentStatut
} from '@/types'
import { fmt } from './utils'

// ============================================================
// BARÈMES OFFICIELS CSE DIVO — ANNÉE SCOLAIRE 2026-2027
// ============================================================
export const DEFAULT_TUITION_SCHEDULES_2026_2027: Omit<TuitionSchedule, 'id' | 'created_at' | 'updated_at'>[] = [
  // --- AFFECTÉS DE L'ÉTAT ---
  {
    academic_year: '2026-2027',
    student_type: 'AFFECTE_ETAT',
    level_group: '6E_5E_4E',
    label: 'Affectés de l\'État — 6e, 5e, 4e',
    classes: ['6ème1', '6ème2', '5ème1', '5ème2', '4ème1', '4ème2'],
    registration_fee: 30000,
    october_due: 0,
    november_due: 5000,
    december_due: 0,
    january_due: 0,
    total_amount: 35000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'AFFECTE_ETAT',
    level_group: '3E',
    label: 'Affectés de l\'État — 3e',
    classes: ['3ème1', '3ème2', '3ème3', '3ème4', '3ème5'],
    registration_fee: 30000,
    october_due: 0,
    november_due: 14000,
    december_due: 0,
    january_due: 0,
    total_amount: 44000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'AFFECTE_ETAT',
    level_group: '2NDE_1ERE',
    label: 'Affectés de l\'État — 2nde & 1ère',
    classes: ['2nde C', '2nde A1', '2nde A2', '1ère D', '1ère A1', '1ère A2'],
    registration_fee: 30000,
    october_due: 0,
    november_due: 10000,
    december_due: 0,
    january_due: 0,
    total_amount: 40000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'AFFECTE_ETAT',
    level_group: 'TLE',
    label: 'Affectés de l\'État — Tle A & D',
    classes: ['Tle A1', 'Tle A2', 'Tle D1', 'Tle D2'],
    registration_fee: 30000,
    october_due: 0,
    november_due: 22000,
    december_due: 0,
    january_due: 0,
    total_amount: 52000,
    currency: 'XOF',
    is_active: true,
  },

  // --- NON-AFFECTÉS ---
  {
    academic_year: '2026-2027',
    student_type: 'NON_AFFECTE',
    level_group: '6E_5E_4E',
    label: 'Non-Affectés — 6e, 5e, 4e',
    classes: ['6ème1', '6ème2', '5ème1', '5ème2', '4ème1', '4ème2'],
    registration_fee: 35000,
    october_due: 30000,
    november_due: 20000,
    december_due: 10000,
    january_due: 5000,
    total_amount: 100000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'NON_AFFECTE',
    level_group: '3E',
    label: 'Non-Affectés — 3e',
    classes: ['3ème1', '3ème2', '3ème3', '3ème4', '3ème5'],
    registration_fee: 44000,
    october_due: 30000,
    november_due: 30000,
    december_due: 15000,
    january_due: 10000,
    total_amount: 129000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'NON_AFFECTE',
    level_group: '2NDE',
    label: 'Non-Affectés — 2nde A & C',
    classes: ['2nde C', '2nde A1', '2nde A2'],
    registration_fee: 35000,
    october_due: 30000,
    november_due: 30000,
    december_due: 15000,
    january_due: 10000,
    total_amount: 120000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'NON_AFFECTE',
    level_group: '1ERE',
    label: 'Non-Affectés — 1ère A & D',
    classes: ['1ère D', '1ère A1', '1ère A2'],
    registration_fee: 35000,
    october_due: 30000,
    november_due: 25000,
    december_due: 25000,
    january_due: 25000,
    total_amount: 140000,
    currency: 'XOF',
    is_active: true,
  },
  {
    academic_year: '2026-2027',
    student_type: 'NON_AFFECTE',
    level_group: 'TLE',
    label: 'Non-Affectés — Tle A & D',
    classes: ['Tle A1', 'Tle A2', 'Tle D1', 'Tle D2'],
    registration_fee: 47000,
    october_due: 30000,
    november_due: 25000,
    december_due: 25000,
    january_due: 25000,
    total_amount: 152000,
    currency: 'XOF',
    is_active: true,
  },
]

/**
 * Normalise un nom de classe ou de niveau pour la recherche de correspondance
 */
export function normalizeClassName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Recherche le barème officiel applicable à un élève
 */
export function findTuitionSchedule(
  schedules: TuitionSchedule[],
  studentType: StudentType = 'NON_AFFECTE',
  classeNom = '',
  academicYear = '2026-2027'
): TuitionSchedule | undefined {
  const normClasse = normalizeClassName(classeNom)
  const activeSchedules = schedules.filter(s => s.is_active && (!s.academic_year || s.academic_year === academicYear))

  // 1. Recherche par classe explicite dans le tableau des classes associées
  const byClass = activeSchedules.find(s =>
    s.student_type === studentType &&
    s.classes &&
    s.classes.some(c => normalizeClassName(c) === normClasse)
  )
  if (byClass) return byClass

  // 2. Recherche par niveau déduit du nom de la classe
  let level = ''
  if (/^6/i.test(normClasse) || /6e/i.test(normClasse) || /^5/i.test(normClasse) || /5e/i.test(normClasse) || /^4/i.test(normClasse) || /4e/i.test(normClasse)) {
    level = '6E_5E_4E'
  } else if (/^3/i.test(normClasse) || /3e/i.test(normClasse)) {
    level = '3E'
  } else if (/2nde/i.test(normClasse) || /^2/i.test(normClasse)) {
    level = studentType === 'AFFECTE_ETAT' ? '2NDE_1ERE' : '2NDE'
  } else if (/1[èe]re/i.test(normClasse) || /^1/i.test(normClasse)) {
    level = studentType === 'AFFECTE_ETAT' ? '2NDE_1ERE' : '1ERE'
  } else if (/tle/i.test(normClasse) || /term/i.test(normClasse)) {
    level = 'TLE'
  }

  if (level) {
    const byLevel = activeSchedules.find(s => s.student_type === studentType && s.level_group === level)
    if (byLevel) return byLevel
  }

  // Fallback si pas de niveau trouvé
  return activeSchedules.find(s => s.student_type === studentType)
}

/**
 * Dates limites d'échéances pour une année scolaire donnée
 */
export function getScheduleDueDates(academicYear = '2026-2027'): {
  inscription: string;
  octobre: string;
  novembre: string;
  decembre: string;
  janvier: string;
} {
  const startYear = parseInt(academicYear.slice(0, 4), 10) || 2026
  const nextYear = startYear + 1
  return {
    inscription: `${startYear}-09-15`,
    octobre: `${startYear}-10-31`,
    novembre: `${startYear}-11-30`,
    decembre: `${startYear}-12-31`,
    janvier: `${nextYear}-01-31`,
  }
}

/**
 * Calcule l'échéancier individuel d'un élève avec ventilation FIFO des paiements
 */
export function computeInstallments(
  schedule: TuitionSchedule | undefined,
  totalPaye: number,
  academicYear = '2026-2027',
  currentDate = new Date()
): Installment[] {
  const dueDates = getScheduleDueDates(academicYear)
  const todayStr = currentDate.toISOString().slice(0, 10)

  const tranches: { id: string; label: string; date: string; amount: number }[] = [
    { id: 'inscription', label: 'Inscription', date: dueDates.inscription, amount: schedule?.registration_fee ?? 0 },
    { id: 'octobre',     label: 'Fin Octobre',  date: dueDates.octobre,     amount: schedule?.october_due ?? 0 },
    { id: 'novembre',    label: 'Fin Novembre', date: dueDates.novembre,    amount: schedule?.november_due ?? 0 },
    { id: 'decembre',    label: 'Fin Décembre', date: dueDates.decembre,    amount: schedule?.december_due ?? 0 },
    { id: 'janvier',     label: 'Fin Janvier',  date: dueDates.janvier,     amount: schedule?.january_due ?? 0 },
  ]

  let paymentPool = Math.max(0, totalPaye)
  const installments: Installment[] = []

  for (const t of tranches) {
    if (t.amount <= 0) continue

    const payeSurTranche = Math.min(paymentPool, t.amount)
    paymentPool -= payeSurTranche
    const resteTranche = t.amount - payeSurTranche
    const isPast = t.date < todayStr

    let statut: Installment['statut'] = 'A_VENIR'
    let retardJours = 0

    if (resteTranche === 0) {
      statut = 'PAYE'
    } else if (payeSurTranche > 0) {
      if (isPast) {
        statut = 'EN_RETARD'
        const diffMs = currentDate.getTime() - new Date(t.date).getTime()
        retardJours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      } else {
        statut = 'PARTIEL'
      }
    } else {
      if (isPast) {
        statut = 'EN_RETARD'
        const diffMs = currentDate.getTime() - new Date(t.date).getTime()
        retardJours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      } else {
        statut = 'A_VENIR'
      }
    }

    installments.push({
      id: t.id,
      label: t.label,
      due_date: t.date,
      montant_prevu: t.amount,
      montant_paye: payeSurTranche,
      reste: resteTranche,
      statut,
      retard_jours: retardJours,
    })
  }

  return installments
}

/**
 * Calcule le compte financier complet d'un élève
 */
export function computeFinancialAccount(
  student: Student,
  schedule: TuitionSchedule | undefined,
  reminders: PaymentReminder[] = [],
  academicYear = '2026-2027',
  currentDate = new Date()
): StudentFinancialAccount {
  const totalScolarite = schedule?.total_amount ?? student.total_du
  const fraisAdditionnels = student.frais_additionnels ?? 0
  const remise = student.remise ?? 0
  const totalDu = Math.max(0, totalScolarite + fraisAdditionnels - remise)
  const totalPaye = student.total_paye ?? 0
  const reste = Math.max(0, totalDu - totalPaye)
  const pourcentagePaye = totalDu > 0 ? Math.min(100, Math.round((totalPaye / totalDu) * 10000) / 100) : 100

  const installments = computeInstallments(schedule, totalPaye, academicYear, currentDate)

  // Montant échu (somme des restes sur les échéances dont la date est dépassée)
  const montantEchu = installments
    .filter(inst => inst.statut === 'EN_RETARD' || (inst.statut === 'PARTIEL' && inst.due_date < currentDate.toISOString().slice(0, 10)))
    .reduce((a, inst) => a + inst.reste, 0)

  const retardMaxJours = installments.reduce((max, inst) => Math.max(max, inst.retard_jours), 0)

  // Détermination du statut global
  let statut: StudentStatut = 'NON_SOLDE'
  if (totalPaye > totalDu) {
    statut = 'CREDIT'
  } else if (reste === 0) {
    statut = 'SOLDE'
  } else if (montantEchu > 0) {
    statut = 'EN_RETARD'
  } else if (totalPaye > 0) {
    statut = 'PARTIEL'
  } else {
    statut = 'NON_SOLDE'
  }

  const studentReminders = reminders
    .filter(r => r.student_id === student.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return {
    student_id: student.id,
    student_nom: `${student.nom} ${student.prenoms}`.trim(),
    student_matricule: student.matricule,
    classe_nom: student.classe_nom || 'Non affecté',
    student_type: student.student_type || 'NON_AFFECTE',
    schedule,
    total_scolarite: totalScolarite,
    frais_additionnels: fraisAdditionnels,
    total_du: totalDu,
    total_paye: totalPaye,
    reste,
    pourcentage_paye: pourcentagePaye,
    statut,
    montant_echu: montantEchu,
    retard_max_jours: retardMaxJours,
    installments,
    derniere_relance: studentReminders[0],
    nombre_relances: studentReminders.length,
  }
}

/**
 * Modèle de message officiel de relance avec substitution dynamique des tags
 */
export function buildReminderMessage(
  account: StudentFinancialAccount,
  schoolName = 'Cours Secondaire Elites Divo',
  schoolCode = '01757'
): string {
  return `Madame, Monsieur,\n\nNous vous informons que la scolarité de votre enfant ${account.student_nom}, matricule ${account.student_matricule}, classe ${account.classe_nom}, présente actuellement un montant restant de ${fmt(account.reste)} FCFA${account.montant_echu > 0 ? ` (dont ${fmt(account.montant_echu)} FCFA d'échéances échues)` : ''}.\n\nNous vous prions de bien vouloir procéder au règlement du montant restant dans les meilleurs délais.\n\nPour toute information complémentaire, veuillez contacter l'administration du ${schoolName}.\n\nCordialement,\n\nLa Direction\n${schoolName}\nCode établissement : ${schoolCode}`
}
