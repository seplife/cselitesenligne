/**
 * Migration v2 — Ajout du système d'inscription + photo élèves
 * Ajoute les colonnes manquantes sans détruire les données existantes.
 */
import { pool } from './pool.js'

async function migrate() {
  try {
    console.log('🔄 Migration v2 — démarrage…')

    // 1. Ajouter username à users (si absent)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(60) NULL,
      ADD COLUMN IF NOT EXISTS nom_complet VARCHAR(120) NULL
    `).catch(() => null)

    // Remplir username depuis role pour les comptes existants (migration douce)
    await pool.query(`
      UPDATE users SET username = role WHERE username IS NULL OR username = ''
    `)
    await pool.query(`
      UPDATE users SET nom_complet = label WHERE (nom_complet IS NULL OR nom_complet = '') AND label IS NOT NULL
    `)
    await pool.query(`
      UPDATE users SET nom_complet = role WHERE nom_complet IS NULL OR nom_complet = ''
    `)

    // Tenter de rendre username NOT NULL et UNIQUE (après avoir rempli les valeurs)
    await pool.query(`
      ALTER TABLE users MODIFY COLUMN username VARCHAR(60) NOT NULL
    `).catch(() => null)

    await pool.query(`
      ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS idx_users_username (username)
    `).catch(() => null)

    // 2. Ajouter photo_url à students (si absent)
    await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS photo_url TEXT NULL
    `).catch(() => null)

    console.log('✅ Migration v2 terminée avec succès.')
    console.log('   - users.username   : OK')
    console.log('   - users.nom_complet: OK')
    console.log('   - students.photo_url: OK')
  } catch (err) {
    console.error('❌ Échec migration v2 :', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

migrate()
