import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { emitChange } from '../io.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 'main'")
    res.json(rows[0] ?? null)
  })
)

const settingsSchema = z.object({
  school_name: z.string().min(1).optional(),
  sigle: z.string().min(1).optional(),
  ville: z.string().min(1).optional(),
  telephone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  annee_scolaire: z.string().min(1).optional(),
  taux_horaire_vacataire: z.number().int().nonnegative().optional(),
  seuil_alerte_montant: z.number().int().nonnegative().optional(),
})

router.put(
  '/',
  requirePerm('seeSettings'),
  asyncHandler(async (req, res) => {
    const body = settingsSchema.parse(req.body)
    const fields = Object.keys(body)
    if (fields.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' })
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => body[f])
    await pool.query(`UPDATE settings SET ${setClause} WHERE id = 'main'`, values)
    await logAudit(req.auth.role, 'MODIFICATION', 'Paramètres', '', JSON.stringify(body))
    emitChange('settings')
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 'main'")
    res.json(rows[0])
  })
)

export default router
