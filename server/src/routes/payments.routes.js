import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { pool, withTransaction } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { emitChange } from '../io.js'
import { statutOf, formatRecu, nextCounter } from '../utils/business.js'
import { ROLES } from '../roles.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM payments ORDER BY date DESC LIMIT 500')
    res.json(rows)
  })
)

const paymentSchema = z.object({
  student_id: z.string().min(1),
  montant: z.number().int().positive(),
  mode: z.string().min(1).default('Espèces'),
  motif: z.string().min(1).default('Scolarité'),
})

router.post(
  '/',
  requirePerm('pay'),
  asyncHandler(async (req, res) => {
    const body = paymentSchema.parse(req.body)

    const result = await withTransaction(async (conn) => {
      const [studentRows] = await conn.query('SELECT * FROM students WHERE id = ? FOR UPDATE', [body.student_id])
      const student = studentRows[0]
      if (!student) throw Object.assign(new Error('Élève introuvable.'), { status: 404 })

      const [settingsRows] = await conn.query("SELECT annee_scolaire FROM settings WHERE id = 'main' FOR UPDATE")
      const counter = await nextCounter(conn, 'recu_counter')
      const recuNumero = formatRecu(settingsRows[0]?.annee_scolaire, counter)

      const newTotalPaye = student.total_paye + body.montant
      const newStatut = statutOf(student.total_du, newTotalPaye)

      const id = uuid()
      const caissiere = ROLES[req.auth.role]?.label ?? req.auth.role

      await conn.query(
        `INSERT INTO payments (id, student_id, student_nom, student_matricule, classe_nom, montant, mode, motif,
          recu_numero, caissiere, total_du_apres, total_paye_apres)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, student.id, `${student.nom} ${student.prenoms}`, student.matricule, student.classe_nom, body.montant,
         body.mode, body.motif, recuNumero, caissiere, student.total_du, newTotalPaye]
      )

      await conn.query('UPDATE students SET total_paye = ?, statut = ? WHERE id = ?', [
        newTotalPaye, newStatut, student.id,
      ])

      const [rows] = await conn.query('SELECT * FROM payments WHERE id = ?', [id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'PAIEMENT', 'Paiement', `${result.recu_numero} — ${result.student_nom}`,
      `${result.montant} FCFA`)
    emitChange('payments')
    emitChange('students')
    res.status(201).json(result)
  })
)

router.post(
  '/:id/annuler',
  requirePerm('pay'),
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (conn) => {
      const [paymentRows] = await conn.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [req.params.id])
      const payment = paymentRows[0]
      if (!payment) throw Object.assign(new Error('Paiement introuvable.'), { status: 404 })
      if (payment.annule) throw Object.assign(new Error('Ce paiement est déjà annulé.'), { status: 409 })

      const [studentRows] = await conn.query('SELECT * FROM students WHERE id = ? FOR UPDATE', [payment.student_id])
      const student = studentRows[0]
      if (!student) throw Object.assign(new Error('Élève introuvable.'), { status: 404 })

      const newTotalPaye = Math.max(0, student.total_paye - payment.montant)
      const newStatut = statutOf(student.total_du, newTotalPaye)

      await conn.query('UPDATE students SET total_paye = ?, statut = ? WHERE id = ?', [
        newTotalPaye, newStatut, student.id,
      ])
      await conn.query('UPDATE payments SET annule = 1 WHERE id = ?', [payment.id])

      const [rows] = await conn.query('SELECT * FROM payments WHERE id = ?', [payment.id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'ANNULATION', 'Paiement', `${result.recu_numero} — ${result.student_nom}`,
      `${result.montant} FCFA`)
    emitChange('payments')
    emitChange('students')
    res.json(result)
  })
)

export default router
