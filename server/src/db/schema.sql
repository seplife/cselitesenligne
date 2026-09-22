-- ============================================================
-- CSE DIVO — Gestion Financière Scolaire
-- Schéma MySQL (remplace la version Supabase/PostgreSQL)
-- ============================================================
-- Applique via `npm run migrate` (server/src/db/migrate.js).
-- Toutes les clés primaires sont des UUID (CHAR(36)) générés côté
-- application (Node `uuid`), pour rester portable entre MySQL
-- 5.7/8.0 et éviter toute divergence de fonction UUID() selon la
-- version du serveur.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---- USERS (comptes réels — login par username + password) ----
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36) PRIMARY KEY,
  username      VARCHAR(60) NOT NULL UNIQUE,
  nom_complet   VARCHAR(120) NOT NULL,
  role          VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  actif         TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_users_role CHECK (role IN ('directeur','caissiere','secretaire','educateur','comptable','consultation'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- SETTINGS ----
CREATE TABLE IF NOT EXISTS settings (
  id                     VARCHAR(10) PRIMARY KEY DEFAULT 'main',
  school_name            VARCHAR(200) NOT NULL DEFAULT 'COURS SECONDAIRE ELITES DIVO',
  sigle                  VARCHAR(40) NOT NULL DEFAULT 'CSE Divo',
  ville                  VARCHAR(120) NOT NULL DEFAULT 'Divo, Côte d''Ivoire',
  telephone              VARCHAR(30),
  email                  VARCHAR(150),
  annee_scolaire         VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  matricule_counter      INT NOT NULL DEFAULT 1,
  recu_counter           INT NOT NULL DEFAULT 1,
  dep_counter            INT NOT NULL DEFAULT 1,
  vac_counter            INT NOT NULL DEFAULT 1,
  pay_counter            INT NOT NULL DEFAULT 1,
  taux_horaire_vacataire INT NOT NULL DEFAULT 1500,
  seuil_alerte_montant   INT NOT NULL DEFAULT 100000,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO settings (id) VALUES ('main');

-- ---- CLASSES ----
CREATE TABLE IF NOT EXISTS classes (
  id         CHAR(36) PRIMARY KEY,
  nom        VARCHAR(60) NOT NULL UNIQUE,
  niveau     VARCHAR(30) NOT NULL,
  frais      INT NOT NULL DEFAULT 0,
  actif      TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- STUDENTS ----
CREATE TABLE IF NOT EXISTS students (
  id                 CHAR(36) PRIMARY KEY,
  matricule          VARCHAR(30) NOT NULL UNIQUE,
  nom                VARCHAR(100) NOT NULL,
  prenoms            VARCHAR(100) NOT NULL,
  sexe               VARCHAR(1) NOT NULL DEFAULT 'M',
  date_naissance     DATE NULL,
  classe_id          CHAR(36) NULL,
  classe_nom         VARCHAR(60),
  parent_nom         VARCHAR(120),
  parent_tel         VARCHAR(30),
  frais_additionnels INT NOT NULL DEFAULT 0,
  total_du           INT NOT NULL DEFAULT 0,
  total_paye         INT NOT NULL DEFAULT 0,
  statut             VARCHAR(12) NOT NULL DEFAULT 'NON_SOLDE',
  token              CHAR(36) NOT NULL,
  photo_url          TEXT NULL,
  actif              TINYINT(1) NOT NULL DEFAULT 1,
  date_inscription   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_students_sexe CHECK (sexe IN ('M','F')),
  CONSTRAINT chk_students_statut CHECK (statut IN ('NON_SOLDE','SOLDE','CREDIT')),
  CONSTRAINT fk_students_classe FOREIGN KEY (classe_id) REFERENCES classes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_students_classe_id ON students(classe_id);
CREATE INDEX idx_students_statut ON students(statut);
CREATE INDEX idx_students_token ON students(token);

-- ---- PAYMENTS ----
CREATE TABLE IF NOT EXISTS payments (
  id                 CHAR(36) PRIMARY KEY,
  student_id         CHAR(36) NOT NULL,
  student_nom        VARCHAR(200) NOT NULL,
  student_matricule  VARCHAR(30) NOT NULL,
  classe_nom         VARCHAR(60),
  montant            INT NOT NULL,
  mode               VARCHAR(30) NOT NULL DEFAULT 'Espèces',
  motif              VARCHAR(80) NOT NULL DEFAULT 'Scolarité',
  recu_numero        VARCHAR(30) NOT NULL UNIQUE,
  caissiere          VARCHAR(80) NOT NULL,
  annule             TINYINT(1) NOT NULL DEFAULT 0,
  total_du_apres     INT,
  total_paye_apres   INT,
  date               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(date DESC);

-- ---- REMINDERS ----
CREATE TABLE IF NOT EXISTS reminders (
  id               CHAR(36) PRIMARY KEY,
  student_id       CHAR(36) NOT NULL,
  student_nom      VARCHAR(200) NOT NULL,
  montant_restant  INT NOT NULL,
  message          TEXT NOT NULL,
  date             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminders_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_reminders_student_id ON reminders(student_id);

-- ---- EXPENSES ----
CREATE TABLE IF NOT EXISTS expenses (
  id            CHAR(36) PRIMARY KEY,
  numero        VARCHAR(30) NOT NULL UNIQUE,
  categorie     VARCHAR(80) NOT NULL,
  beneficiaire  VARCHAR(150),
  montant       INT NOT NULL,
  mode          VARCHAR(30) NOT NULL DEFAULT 'Espèces',
  statut        VARCHAR(12) NOT NULL DEFAULT 'EN_ATTENTE',
  description   TEXT,
  saisi_par     VARCHAR(80),
  valide_par    VARCHAR(80),
  date          DATE NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_expenses_statut CHECK (statut IN ('EN_ATTENTE','VALIDEE','PAYEE','ANNULEE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_expenses_statut ON expenses(statut);
CREATE INDEX idx_expenses_date ON expenses(date DESC);

-- ---- CASH CLOSURES ----
CREATE TABLE IF NOT EXISTS cash_closures (
  id               CHAR(36) PRIMARY KEY,
  date             DATE NOT NULL UNIQUE,
  solde_initial    INT NOT NULL DEFAULT 0,
  entrees          INT NOT NULL DEFAULT 0,
  sorties          INT NOT NULL DEFAULT 0,
  solde_theorique  INT NOT NULL DEFAULT 0,
  solde_physique   INT NOT NULL DEFAULT 0,
  ecart            INT NOT NULL DEFAULT 0,
  cloture_par      VARCHAR(80) NOT NULL,
  observations     TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_cash_closures_date ON cash_closures(date DESC);

-- ---- TEACHERS (Vacataires) ----
CREATE TABLE IF NOT EXISTS teachers (
  id            CHAR(36) PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  prenoms       VARCHAR(100) NOT NULL,
  matiere       VARCHAR(80),
  telephone     VARCHAR(30),
  rib           VARCHAR(60),
  taux_horaire  INT,
  actif         TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- TEACHER HOURS ----
CREATE TABLE IF NOT EXISTS teacher_hours (
  id             CHAR(36) PRIMARY KEY,
  teacher_id     CHAR(36) NOT NULL,
  teacher_nom    VARCHAR(200) NOT NULL,
  matiere        VARCHAR(80),
  mois           VARCHAR(7) NOT NULL,
  heures         DECIMAL(5,1) NOT NULL DEFAULT 0,
  taux_horaire   INT NOT NULL DEFAULT 1500,
  montant        INT NOT NULL DEFAULT 0,
  statut         VARCHAR(12) NOT NULL DEFAULT 'DECLARE',
  valide_par     VARCHAR(80),
  date_paiement  DATETIME,
  observations   TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_teacher_hours_statut CHECK (statut IN ('DECLARE','VALIDE','PAYE')),
  CONSTRAINT fk_teacher_hours_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_teacher_hours_teacher_id ON teacher_hours(teacher_id);
CREATE INDEX idx_teacher_hours_mois ON teacher_hours(mois DESC);

-- ---- STAFF (Personnel permanent) ----
CREATE TABLE IF NOT EXISTS staff (
  id             CHAR(36) PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL,
  prenoms        VARCHAR(100) NOT NULL,
  poste          VARCHAR(80),
  salaire_base   INT NOT NULL DEFAULT 0,
  telephone      VARCHAR(30),
  rib            VARCHAR(60),
  date_embauche  DATE,
  actif          TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- STAFF PAYMENTS ----
CREATE TABLE IF NOT EXISTS staff_payments (
  id             CHAR(36) PRIMARY KEY,
  staff_id       CHAR(36) NOT NULL,
  staff_nom      VARCHAR(200) NOT NULL,
  mois           VARCHAR(7) NOT NULL,
  salaire_base   INT NOT NULL DEFAULT 0,
  primes         INT NOT NULL DEFAULT 0,
  retenues       INT NOT NULL DEFAULT 0,
  salaire_net    INT NOT NULL DEFAULT 0,
  mode           VARCHAR(30) NOT NULL DEFAULT 'Virement bancaire',
  date_paiement  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paye_par       VARCHAR(80),
  observations   TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_payments_staff FOREIGN KEY (staff_id) REFERENCES staff(id),
  CONSTRAINT uq_staff_payments_staff_mois UNIQUE (staff_id, mois)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_staff_payments_staff_id ON staff_payments(staff_id);
CREATE INDEX idx_staff_payments_mois ON staff_payments(mois DESC);

-- ---- DEBTS ----
CREATE TABLE IF NOT EXISTS debts (
  id               CHAR(36) PRIMARY KEY,
  libelle          VARCHAR(160) NOT NULL,
  creancier        VARCHAR(120) NOT NULL,
  montant_initial  INT NOT NULL,
  montant_paye     INT NOT NULL DEFAULT 0,
  date_echeance    DATE,
  statut           VARCHAR(12) NOT NULL DEFAULT 'EN_COURS',
  observations     TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_debts_statut CHECK (statut IN ('EN_COURS','SOLDE','EN_RETARD'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- DOCUMENTS ----
CREATE TABLE IF NOT EXISTS documents (
  id          CHAR(36) PRIMARY KEY,
  titre       VARCHAR(160) NOT NULL,
  type_doc    VARCHAR(60) NOT NULL,
  description TEXT,
  url         TEXT,
  taille      INT,
  ajoute_par  VARCHAR(80),
  date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- AUDIT LOGS ----
CREATE TABLE IF NOT EXISTS audit_logs (
  id         CHAR(36) PRIMARY KEY,
  date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_role  VARCHAR(20) NOT NULL,
  action     VARCHAR(80) NOT NULL,
  entity     VARCHAR(80) NOT NULL,
  reference  VARCHAR(160),
  details    TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_audit_logs_date ON audit_logs(date DESC);

SET FOREIGN_KEY_CHECKS = 1;
