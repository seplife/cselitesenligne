// ============================================================
// CSE DIVO — TypeScript Types
// ============================================================

export type RoleKey = 'directeur' | 'caissiere' | 'secretaire' | 'educateur' | 'comptable' | 'consultation';

export interface RolePermissions {
  editStudents: boolean;
  pay: boolean;
  manageCaisse: boolean;
  validateExpense: boolean;
  manageVacataires: boolean;
  managePersonnel: boolean;
  seeAudit: boolean;
  seeSettings: boolean;
  editClasses: boolean;
  manageDebts: boolean;
  manageDocuments: boolean;
}

export type TabId =
  | 'dashboard' | 'vault' | 'students' | 'payments' | 'qr' | 'reminders'
  | 'stats' | 'alerts' | 'caisse' | 'vacataires' | 'personnel' | 'payrollcal'
  | 'debts' | 'documents' | 'audit' | 'classes' | 'settings';

export interface RoleDef {
  label: string;
  icon: string;
  tabs: TabId[];
  perms: RolePermissions;
}

export interface Settings {
  id: string;
  school_name: string;
  sigle: string;
  ville: string;
  telephone?: string;
  email?: string;
  annee_scolaire: string;
  matricule_counter: number;
  recu_counter: number;
  dep_counter: number;
  vac_counter: number;
  pay_counter: number;
  taux_horaire_vacataire: number;
  seuil_alerte_montant: number;
  created_at: string;
}

export interface Class {
  id: string;
  nom: string;
  niveau: string;
  frais: number;
  actif: boolean;
  created_at: string;
}

export type StudentStatut = 'NON_SOLDE' | 'SOLDE' | 'CREDIT';

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F';
  date_naissance?: string;
  classe_id?: string;
  classe_nom?: string;
  parent_nom?: string;
  parent_tel?: string;
  frais_additionnels: number;
  total_du: number;
  total_paye: number;
  statut: StudentStatut;
  token: string;
  actif: boolean;
  date_inscription: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  student_nom: string;
  student_matricule: string;
  classe_nom?: string;
  montant: number;
  mode: string;
  motif: string;
  recu_numero: string;
  caissiere: string;
  annule: boolean;
  total_du_apres?: number;
  total_paye_apres?: number;
  date: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  student_id: string;
  student_nom: string;
  montant_restant: number;
  message: string;
  date: string;
}

export type ExpenseStatut = 'EN_ATTENTE' | 'VALIDEE' | 'PAYEE' | 'ANNULEE';

export interface Expense {
  id: string;
  numero: string;
  categorie: string;
  beneficiaire?: string;
  montant: number;
  mode: string;
  statut: ExpenseStatut;
  description?: string;
  saisi_par?: string;
  valide_par?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CashClosure {
  id: string;
  date: string;
  solde_initial: number;
  entrees: number;
  sorties: number;
  solde_theorique: number;
  solde_physique: number;
  ecart: number;
  cloture_par: string;
  observations?: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  nom: string;
  prenoms: string;
  matiere?: string;
  telephone?: string;
  rib?: string;
  taux_horaire?: number;
  actif: boolean;
  created_at: string;
}

export type TeacherHourStatut = 'DECLARE' | 'VALIDE' | 'PAYE';

export interface TeacherHour {
  id: string;
  teacher_id: string;
  teacher_nom: string;
  matiere?: string;
  mois: string;
  heures: number;
  taux_horaire: number;
  montant: number;
  statut: TeacherHourStatut;
  valide_par?: string;
  date_paiement?: string;
  observations?: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  nom: string;
  prenoms: string;
  poste?: string;
  salaire_base: number;
  telephone?: string;
  rib?: string;
  date_embauche?: string;
  actif: boolean;
  created_at: string;
}

export interface StaffPayment {
  id: string;
  staff_id: string;
  staff_nom: string;
  mois: string;
  salaire_base: number;
  primes: number;
  retenues: number;
  salaire_net: number;
  mode: string;
  date_paiement: string;
  paye_par?: string;
  observations?: string;
  created_at: string;
}

export type DebtStatut = 'EN_COURS' | 'SOLDE' | 'EN_RETARD';

export interface Debt {
  id: string;
  libelle: string;
  creancier: string;
  montant_initial: number;
  montant_paye: number;
  date_echeance?: string;
  statut: DebtStatut;
  observations?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  titre: string;
  type_doc: string;
  description?: string;
  url?: string;
  taille?: number;
  ajoute_par?: string;
  date: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  date: string;
  user_role: string;
  action: string;
  entity: string;
  reference?: string;
  details?: string;
}

export interface Alert {
  severity: 'red' | 'orange' | 'blue' | 'green';
  tab: TabId;
  message: string;
}

export interface ClassStat {
  classe: string;
  niveau: string;
  nb: number;
  attendu: number;
  encaisse: number;
  reste: number;
  taux: number;
  soldes: number;
  nonSoldes: number;
}

export interface LevelStat {
  niveau: string;
  nb: number;
  attendu: number;
  encaisse: number;
  reste: number;
  taux: number;
  soldes: number;
  nonSoldes: number;
}
