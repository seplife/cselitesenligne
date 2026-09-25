import { v4 as uuid } from 'uuid'
import { pool } from '../db/pool.js'
import { ROLES } from '../roles.js'

/** Journalise une action. Ne lève jamais — un échec d'audit ne doit pas casser l'action elle-même. */
export async function logAudit(role, action, entity, reference = '', details = '') {
  try {
    const roleLabel = ROLES[role]?.label ?? role ?? 'Inconnu'
    await pool.query(
      'INSERT INTO audit_logs (id, date, user_role, action, entity, reference, details) VALUES (?, NOW(), ?, ?, ?, ?, ?)',
      [uuid(), roleLabel, action, entity, reference, details]
    )
  } catch (e) {
    console.error('Audit log failed', e)
  }
}
