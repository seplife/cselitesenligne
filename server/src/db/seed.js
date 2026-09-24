import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { pool } from './pool.js'

const CLASSES = [
  ['6ème1', '6e'], ['6ème2', '6e'],
  ['5ème1', '5e'], ['5ème2', '5e'],
  ['4ème1', '4e'], ['4ème2', '4e'],
  ['3ème1', '3e'], ['3ème2', '3e'], ['3ème3', '3e'], ['3ème4', '3e'], ['3ème5', '3e'],
  ['2nde C', '2nde'], ['2nde A1', '2nde'], ['2nde A2', '2nde'],
  ['1ère D', '1ère'], ['1ère A1', '1ère'], ['1ère A2', '1ère'],
  ['Tle A1', 'Tle'], ['Tle A2', 'Tle'], ['Tle D1', 'Tle'], ['Tle D2', 'Tle'],
]

const ROLES = [
  { role: 'directeur', label: 'Directeur', password: '1234' },
  { role: 'caissiere', label: 'Caissière', password: '0000' },
  { role: 'secretaire', label: 'Secrétaire', password: '0000' },
  { role: 'educateur', label: 'Éducateur', password: '0000' },
  { role: 'comptable', label: 'Comptable / Contrôleur', password: '0000' },
  { role: 'consultation', label: 'Consultation', password: '0000' },
]

async function seed() {
  try {
    console.log('Insertion des données de démonstration…')

    for (const { role, label, password } of ROLES) {
      // username = role par défaut (ex: "directeur") — l'utilisateur peut en
      // créer d'autres depuis l'écran "Créer un compte" avec un vrai username.
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [role])
      if (existing.length > 0) continue
      const hash = await bcrypt.hash(password, 10)
      await pool.query(
        'INSERT INTO users (id, username, nom_complet, role, password_hash) VALUES (?,?,?,?,?)',
        [uuid(), role, label, role, hash]
      )
    }

    for (const [nom, niveau] of CLASSES) {
      await pool.query(
        'INSERT IGNORE INTO classes (id, nom, niveau, frais) VALUES (?,?,?,0)',
        [uuid(), nom, niveau]
      )
    }

    console.log('')
    console.log('======================================')
    console.log('      SEED TERMINÉ AVEC SUCCÈS')
    console.log('======================================')
    console.log('')
    console.log('Comptes créés (un par profil) :')
    console.log('')
    for (const { role, label, password } of ROLES) {
      console.log(`  ${label.padEnd(24)} rôle="${role}"  mot de passe="${password}"`)
    }
    console.log('')
    console.log('⚠️  Changez ces mots de passe avant toute mise en production')
    console.log('    (Paramètres → Sécurité, une fois connecté en Directeur).')
    console.log('')
  } catch (err) {
    console.error('❌ Échec du seed :', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

seed()
