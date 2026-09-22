import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { pool, withTransaction } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { emitChange } from '../io.js'
import { ROLES } from '../roles.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM cash_closures ORDER BY date DESC LIMIT 90')
    res.json(rows)
  })
)

const closureSchema = z.object({
  date: z.string().min(1),
  solde_physique: z.number().int(),
  observations: z.string().optional().nullable(),
})

router.post(
  '/',
  requirePerm('manageCaisse'),
  asyncHandler(async (req, res) => {
    const body = closureSchema.parse(req.body)

    const result = await withTransaction(async (conn) => {
      const [existing] = await conn.query('SELECT id FROM cash_closures WHERE date = ?', [body.date])
      if (existing[0]) {
        throw Object.assign(new Error('La caisse est déjà clôturée pour cette date.'), { status: 409 })
      }

      const [entreesRows] = await conn.query(
        'SELECT COALESCE(SUM(montant), 0) AS total FROM payments WHERE DATE(date) = ? AND annule = 0',
        [body.date]
      )
      const [sortiesRows] = await conn.query(
        "SELECT COALESCE(SUM(montant), 0) AS total FROM expenses WHERE date = ? AND statut = 'PAYEE'",
        [body.date]
      )
      const [prevRows] = await conn.query(
        'SELECT solde_theorique FROM cash_closures WHERE date < ? ORDER BY date DESC LIMIT 1',
        [body.date]
      )

      const soldeInitial = prevRows[0]?.solde_theorique ?? 0
      const entrees = Number(entreesRows[0].total)
      const sorties = Number(sortiesRows[0].total)
      const soldeTheorique = soldeInitial + entrees - sorties
      const ecart = body.solde_physique - soldeTheorique
      const id = uuid()
      const cloturePar = ROLES[req.auth.role]?.label ?? req.auth.role

      await conn.query(
        `INSERT INTO cash_closures (id, date, solde_initial, entrees, sorties, solde_theorique, solde_physique,
          ecart, cloture_par, observations)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, body.date, soldeInitial, entrees, sorties, soldeTheorique, body.solde_physique, ecart, cloturePar,
         body.observations || null]
      )

      const [rows] = await conn.query('SELECT * FROM cash_closures WHERE id = ?', [id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'CLOTURE', 'Caisse', result.date, `Écart: ${result.ecart} FCFA`)
    emitChange('cash_closures')
    res.status(201).json(result)
  })
)

export default router
