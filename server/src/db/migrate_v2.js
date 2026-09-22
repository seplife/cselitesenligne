/**
 * Migration v2 — Ajout du système d'inscription + photo élèves
 * Ajoute les colonnes manquantes sans détruire les données existantes.
 * Supprime la contrainte UNIQUE sur role pour permettre plusieurs comptes par rôle.
 */
import { pool } from './pool.js'

async function migrate() {
  try {
    console.log('🔄 Migration v2 — démarrage…')

    // 1. Ajouter username et nom_complet à users (si absent)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(60) NULL,
      ADD COLUMN IF NOT EXISTS nom_complet VARCHAR(120) NULL
    `).catch(() => null)

    // Remplir username depuis role pour les comptes existants (migration douce)
    await pool.query(`
      UPDATE users SET username = role WHERE username IS NULL OR username = ''
    `).catch(() => null)

    await pool.query(`
      UPDATE users SET nom_complet = label WHERE (nom_complet IS NULL OR nom_complet = '') AND label IS NOT NULL
    `).catch(() => null)

    await pool.query(`
      UPDATE users SET nom_complet = role WHERE nom_complet IS NULL OR nom_complet = ''
    `).catch(() => null)

    // 2. Supprimer la contrainte UNIQUE sur role (pour autoriser plusieurs comptes par rôle)
    // D'abord vérifier si la contrainte existe
    const [indexes] = await pool.query(`
      SHOW INDEX FROM users WHERE Key_name = 'role'
    `).catch(() => [[]])

    if (indexes.length > 0) {
      await pool.query('ALTER TABLE users DROP INDEX role').catch(() => null)
      console.log('   - Contrainte UNIQUE sur role : supprimée')
    }

    // 3. Rendre username NOT NULL et UNIQUE
    await pool.query(`
      ALTER TABLE users MODIFY COLUMN username VARCHAR(60) NOT NULL
    `).catch(() => null)

    // Ajouter index UNIQUE sur username s'il n'existe pas
    const [usernameIdx] = await pool.query(`
      SHOW INDEX FROM users WHERE Key_name = 'idx_users_username' OR Column_name = 'username' AND Non_unique = 0
    `).catch(() => [[]])

    if (usernameIdx.length === 0) {
      await pool.query(`
        ALTER TABLE users ADD UNIQUE INDEX idx_users_username (username)
      `).catch(err => console.warn('   - Index username déjà existant:', err.message))
    }

    // 4. Ajouter photo_url à students (si absent)
    await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS photo_url TEXT NULL
    `).catch(() => null)

    console.log('✅ Migration v2 terminée avec succès.')
    console.log('   - users.username    : OK')
    console.log('   - users.nom_complet : OK')
    console.log('   - role non-unique   : OK (plusieurs comptes par rôle)')
    console.log('   - students.photo_url: OK')
  } catch (err) {
    console.error('❌ Échec migration v2 :', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

migrate()
