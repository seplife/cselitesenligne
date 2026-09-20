-- ============================================================
-- CSE DIVO — Gestion Financière Scolaire
-- Migration initiale Supabase (PostgreSQL)
-- ============================================================

-- ---- SETTINGS ----
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  school_name TEXT NOT NULL DEFAULT 'COURS SECONDAIRE ELITES DIVO',
  sigle TEXT NOT NULL DEFAULT 'CSE Divo',
  ville TEXT NOT NULL DEFAULT 'Divo, Côte d''Ivoire',
  telephone TEXT,
  email TEXT,
  annee_scolaire TEXT NOT NULL DEFAULT '2026-2027',
  pins JSONB NOT NULL DEFAULT '{"directeur":"1234","caissiere":"0000","secretaire":"0000","educateur":"0000","comptable":"0000","consultation":"0000"}',
  matricule_counter INTEGER NOT NULL DEFAULT 1,
  recu_counter INTEGER NOT NULL DEFAULT 1,
  dep_counter INTEGER NOT NULL DEFAULT 1,
  vac_counter INTEGER NOT NULL DEFAULT 1,
  pay_counter INTEGER NOT NULL DEFAULT 1,
  taux_horaire_vacataire INTEGER NOT NULL DEFAULT 1500,
  seuil_alerte_montant INTEGER NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed settings
INSERT INTO settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- ---- CLASSES ----
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  niveau TEXT NOT NULL,
  frais INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed classes par défaut
INSERT INTO classes (nom, niveau, frais) VALUES
  ('6ème1', '6e', 0), ('6ème2', '6e', 0),
  ('5ème1', '5e', 0), ('5ème2', '5e', 0),
  ('4ème1', '4e', 0), ('4ème2', '4e', 0),
  ('3ème1', '3e', 0), ('3ème2', '3e', 0), ('3ème3', '3e', 0), ('3ème4', '3e', 0), ('3ème5', '3e', 0),
  ('2nde C', '2nde', 0), ('2nde A1', '2nde', 0), ('2nde A2', '2nde', 0),
  ('1ère D', '1ère', 0), ('1ère A1', '1ère', 0), ('1ère A2', '1ère', 0),
  ('Tle A1', 'Tle', 0), ('Tle A2', 'Tle', 0), ('Tle D1', 'Tle', 0), ('Tle D2', 'Tle', 0)
ON CONFLICT (nom) DO NOTHING;

-- ---- STUDENTS ----
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  sexe TEXT NOT NULL DEFAULT 'M',
  date_naissance DATE,
  classe_id UUID REFERENCES classes(id),
  classe_nom TEXT,
  parent_nom TEXT,
  parent_tel TEXT,
  frais_additionnels INTEGER NOT NULL DEFAULT 0,
  total_du INTEGER NOT NULL DEFAULT 0,
  total_paye INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'NON_SOLDE' CHECK (statut IN ('NON_SOLDE', 'SOLDE', 'CREDIT')),
  token TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_classe_id ON students(classe_id);
CREATE INDEX IF NOT EXISTS idx_students_statut ON students(statut);
CREATE INDEX IF NOT EXISTS idx_students_token ON students(token);

-- ---- PAYMENTS ----
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  student_nom TEXT NOT NULL,
  student_matricule TEXT NOT NULL,
  classe_nom TEXT,
  montant INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'Espèces',
  motif TEXT NOT NULL DEFAULT 'Scolarité',
  recu_numero TEXT NOT NULL UNIQUE,
  caissiere TEXT NOT NULL,
  annule BOOLEAN NOT NULL DEFAULT FALSE,
  total_du_apres INTEGER,
  total_paye_apres INTEGER,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date DESC);

-- ---- REMINDERS ----
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  student_nom TEXT NOT NULL,
  montant_restant INTEGER NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_student_id ON reminders(student_id);

-- ---- EXPENSES ----
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL,
  beneficiaire TEXT,
  montant INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'Espèces',
  statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDEE', 'PAYEE', 'ANNULEE')),
  description TEXT,
  saisi_par TEXT,
  valide_par TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_statut ON expenses(statut);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- ---- CASH CLOSURES ----
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  solde_initial INTEGER NOT NULL DEFAULT 0,
  entrees INTEGER NOT NULL DEFAULT 0,
  sorties INTEGER NOT NULL DEFAULT 0,
  solde_theorique INTEGER NOT NULL DEFAULT 0,
  solde_physique INTEGER NOT NULL DEFAULT 0,
  ecart INTEGER NOT NULL DEFAULT 0,
  cloture_par TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_closures_date ON cash_closures(date DESC);

-- ---- TEACHERS (Vacataires) ----
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  matiere TEXT,
  telephone TEXT,
  rib TEXT,
  taux_horaire INTEGER,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- TEACHER HOURS ----
CREATE TABLE IF NOT EXISTS teacher_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  teacher_nom TEXT NOT NULL,
  matiere TEXT,
  mois TEXT NOT NULL,
  heures NUMERIC(5,1) NOT NULL DEFAULT 0,
  taux_horaire INTEGER NOT NULL DEFAULT 1500,
  montant INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'DECLARE' CHECK (statut IN ('DECLARE', 'VALIDE', 'PAYE')),
  valide_par TEXT,
  date_paiement TIMESTAMPTZ,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_hours_teacher_id ON teacher_hours(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_hours_mois ON teacher_hours(mois DESC);

-- ---- STAFF (Personnel permanent) ----
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  poste TEXT,
  salaire_base INTEGER NOT NULL DEFAULT 0,
  telephone TEXT,
  rib TEXT,
  date_embauche DATE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- STAFF PAYMENTS ----
CREATE TABLE IF NOT EXISTS staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  staff_nom TEXT NOT NULL,
  mois TEXT NOT NULL,
  salaire_base INTEGER NOT NULL DEFAULT 0,
  primes INTEGER NOT NULL DEFAULT 0,
  retenues INTEGER NOT NULL DEFAULT 0,
  salaire_net INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'Virement bancaire',
  date_paiement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paye_par TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_id ON staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_mois ON staff_payments(mois DESC);

-- ---- DEBTS ----
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle TEXT NOT NULL,
  creancier TEXT NOT NULL,
  montant_initial INTEGER NOT NULL,
  montant_paye INTEGER NOT NULL DEFAULT 0,
  date_echeance DATE,
  statut TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'SOLDE', 'EN_RETARD')),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- DOCUMENTS ----
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  type_doc TEXT NOT NULL,
  description TEXT,
  url TEXT,
  taille INTEGER,
  ajoute_par TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- AUDIT LOGS ----
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  reference TEXT,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(date DESC);

-- ============================================================
-- ROW LEVEL SECURITY (optionnel — décommenter si besoin)
-- ============================================================
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON settings FOR ALL USING (true);
-- (Répéter pour chaque table si vous activez l'auth Supabase)

-- ============================================================
-- REALTIME — activer pour les tables nécessaires
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_closures;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_hours;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE debts;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
