-- ============================================================
-- BASE DE DONNÉES FINANCIÈRE ET ADMINISTRATIVE
-- COURS SECONDAIRE ELITES DIVO (CODE ÉTABLISSEMENT : 01757)
-- ANNÉE SCOLAIRE 2026-2027
-- MIGRATION SQL COMPLÈTE
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL DEFAULT 'COURS SECONDAIRE ELITES DIVO',
  sigle VARCHAR(64) NOT NULL DEFAULT 'CSE DIVO',
  code_etablissement VARCHAR(32) NOT NULL DEFAULT '01757',
  ville VARCHAR(128) NOT NULL DEFAULT 'Divo – Côte d’Ivoire',
  telephone VARCHAR(64),
  email VARCHAR(128),
  annee_scolaire VARCHAR(32) NOT NULL DEFAULT '2026-2027',
  academic_years JSON,
  matricule_counter INT NOT NULL DEFAULT 1,
  recu_counter INT NOT NULL DEFAULT 1,
  dep_counter INT NOT NULL DEFAULT 1,
  vac_counter INT NOT NULL DEFAULT 1,
  pay_counter INT NOT NULL DEFAULT 1,
  taux_horaire_vacataire INT NOT NULL DEFAULT 1500,
  seuil_alerte_montant INT NOT NULL DEFAULT 100000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(64) PRIMARY KEY,
  nom VARCHAR(64) NOT NULL UNIQUE,
  niveau VARCHAR(32) NOT NULL,
  frais INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barèmes de scolarités configurables par année scolaire
CREATE TABLE IF NOT EXISTS tuition_schedules (
  id VARCHAR(64) PRIMARY KEY,
  academic_year VARCHAR(32) NOT NULL DEFAULT '2026-2027',
  student_type ENUM('AFFECTE_ETAT', 'NON_AFFECTE') NOT NULL,
  level_group VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  classes JSON,
  registration_fee INT NOT NULL DEFAULT 0,
  october_due INT NOT NULL DEFAULT 0,
  november_due INT NOT NULL DEFAULT 0,
  december_due INT NOT NULL DEFAULT 0,
  january_due INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'XOF',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_academic_type (academic_year, student_type, level_group)
);

-- Élèves
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  matricule VARCHAR(64) NOT NULL UNIQUE,
  nom VARCHAR(128) NOT NULL,
  prenoms VARCHAR(128) NOT NULL,
  sexe ENUM('M', 'F') NOT NULL DEFAULT 'M',
  student_type ENUM('AFFECTE_ETAT', 'NON_AFFECTE') NOT NULL DEFAULT 'NON_AFFECTE',
  date_naissance DATE,
  classe_id VARCHAR(64),
  classe_nom VARCHAR(64),
  parent_nom VARCHAR(128),
  parent_tel VARCHAR(64),
  scolarite_base INT NOT NULL DEFAULT 0,
  frais_additionnels INT NOT NULL DEFAULT 0,
  remise INT NOT NULL DEFAULT 0,
  total_du INT NOT NULL DEFAULT 0,
  total_paye INT NOT NULL DEFAULT 0,
  statut ENUM('NON_SOLDE', 'SOLDE', 'CREDIT', 'PARTIEL', 'EN_RETARD') NOT NULL DEFAULT 'NON_SOLDE',
  photo LONGTEXT,
  token VARCHAR(128) NOT NULL UNIQUE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  date_inscription DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_classe (classe_id),
  INDEX idx_student_type (student_type),
  INDEX idx_student_statut (statut)
);

-- Paiements de scolarité
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_nom VARCHAR(255) NOT NULL,
  student_matricule VARCHAR(64) NOT NULL,
  classe_nom VARCHAR(64),
  student_type ENUM('AFFECTE_ETAT', 'NON_AFFECTE'),
  montant INT NOT NULL,
  mode VARCHAR(64) NOT NULL DEFAULT 'ESPÈCES',
  motif VARCHAR(128) NOT NULL DEFAULT 'Scolarité',
  reference VARCHAR(128),
  recu_numero VARCHAR(64) NOT NULL UNIQUE,
  caissiere VARCHAR(128) NOT NULL,
  annule BOOLEAN NOT NULL DEFAULT FALSE,
  ancien_solde INT,
  nouveau_solde INT,
  notes TEXT,
  total_du_apres INT,
  total_paye_apres INT,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_student (student_id),
  INDEX idx_payments_date (date)
);

-- Relances aux parents
CREATE TABLE IF NOT EXISTS payment_reminders (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_nom VARCHAR(255) NOT NULL,
  student_matricule VARCHAR(64) NOT NULL,
  classe_nom VARCHAR(64) NOT NULL,
  student_type ENUM('AFFECTE_ETAT', 'NON_AFFECTE'),
  parent_nom VARCHAR(128),
  parent_tel VARCHAR(64),
  amount_due_at_reminder INT NOT NULL,
  overdue_amount INT NOT NULL DEFAULT 0,
  channel ENUM('WHATSAPP', 'SMS', 'EMAIL', 'APPEL', 'IMPRESSION', 'NOTIFICATION') NOT NULL DEFAULT 'WHATSAPP',
  motif ENUM('SCOLARITE_IMPAYEE', 'ECHEANCE_DEPASSEE', 'PAIEMENT_PARTIEL', 'SOLDE_GENERAL') NOT NULL DEFAULT 'SCOLARITE_IMPAYEE',
  message TEXT NOT NULL,
  status ENUM('BROUILLON', 'ENVOYEE', 'DELIVREE', 'ECHOUEE', 'LUE') NOT NULL DEFAULT 'ENVOYEE',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reminders_student (student_id),
  INDEX idx_reminders_date (sent_at)
);

-- Journal d'audit pour transparence financière
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_role VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  reference VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(45)
);

-- ============================================================
-- INSERTION DES BARÈMES OFFICIELS 2026-2027
-- ============================================================

INSERT INTO settings (id, school_name, sigle, code_etablissement, ville, annee_scolaire, academic_years)
VALUES ('main', 'COURS SECONDAIRE ELITES DIVO', 'CSE DIVO', '01757', 'Divo – Côte d’Ivoire', '2026-2027', '["2026-2027", "2027-2028"]')
ON DUPLICATE KEY UPDATE school_name = VALUES(school_name), code_etablissement = VALUES(code_etablissement), annee_scolaire = VALUES(annee_scolaire);

-- Barèmes Affectés de l'État
INSERT INTO tuition_schedules (id, academic_year, student_type, level_group, label, classes, registration_fee, october_due, november_due, december_due, january_due, total_amount, currency, is_active)
VALUES
  ('ts_aff_6_5_4', '2026-2027', 'AFFECTE_ETAT', '6E_5E_4E', 'Affectés de l''État — 6e, 5e, 4e', '["6ème1", "6ème2", "5ème1", "5ème2", "4ème1", "4ème2"]', 30000, 0, 5000, 0, 0, 35000, 'XOF', TRUE),
  ('ts_aff_3e',    '2026-2027', 'AFFECTE_ETAT', '3E',       'Affectés de l''État — 3e',       '["3ème1", "3ème2", "3ème3", "3ème4", "3ème5"]',                     30000, 0, 14000, 0, 0, 44000, 'XOF', TRUE),
  ('ts_aff_2_1',   '2026-2027', 'AFFECTE_ETAT', '2NDE_1ERE', 'Affectés de l''État — 2nde & 1ère', '["2nde C", "2nde A1", "2nde A2", "1ère D", "1ère A1", "1ère A2"]',  30000, 0, 10000, 0, 0, 40000, 'XOF', TRUE),
  ('ts_aff_tle',   '2026-2027', 'AFFECTE_ETAT', 'TLE',       'Affectés de l''État — Tle A & D', '["Tle A1", "Tle A2", "Tle D1", "Tle D2"]',                           30000, 0, 22000, 0, 0, 52000, 'XOF', TRUE)
ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount);

-- Barèmes Non-Affectés
INSERT INTO tuition_schedules (id, academic_year, student_type, level_group, label, classes, registration_fee, october_due, november_due, december_due, january_due, total_amount, currency, is_active)
VALUES
  ('ts_naff_6_5_4', '2026-2027', 'NON_AFFECTE', '6E_5E_4E', 'Non-Affectés — 6e, 5e, 4e', '["6ème1", "6ème2", "5ème1", "5ème2", "4ème1", "4ème2"]', 35000, 30000, 20000, 10000, 5000, 100000, 'XOF', TRUE),
  ('ts_naff_3e',    '2026-2027', 'NON_AFFECTE', '3E',       'Non-Affectés — 3e',       '["3ème1", "3ème2", "3ème3", "3ème4", "3ème5"]',                     44000, 30000, 30000, 15000, 10000, 129000, 'XOF', TRUE),
  ('ts_naff_2nde',  '2026-2027', 'NON_AFFECTE', '2NDE',     'Non-Affectés — 2nde A & C', '["2nde C", "2nde A1", "2nde A2"]',                                 35000, 30000, 30000, 15000, 10000, 120000, 'XOF', TRUE),
  ('ts_naff_1ere',  '2026-2027', 'NON_AFFECTE', '1ERE',     'Non-Affectés — 1ère A & D', '["1ère D", "1ère A1", "1ère A2"]',                                 35000, 30000, 25000, 25000, 25000, 140000, 'XOF', TRUE),
  ('ts_naff_tle',   '2026-2027', 'NON_AFFECTE', 'TLE',      'Non-Affectés — Tle A & D',  '["Tle A1", "Tle A2", "Tle D1", "Tle D2"]',                         47000, 30000, 25000, 25000, 25000, 152000, 'XOF', TRUE)
ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount);
