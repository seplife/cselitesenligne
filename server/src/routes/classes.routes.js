import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
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
    const [rows] = await pool.query('SELECT * FROM classes ORDER BY nom')
    res.json(rows)
  })
)

const classSchema = z.object({
  nom: z.string().min(1),
  niveau: z.string().min(1),
  frais: z.number().int().nonnegative().default(0),
})

router.post(
  '/',
  requirePerm('editClasses'),
  asyncHandler(async (req, res) => {
    const body = classSchema.parse(req.body)
    const id = uuid()
    await pool.query('INSERT INTO classes (id, nom, niveau, frais) VALUES (?,?,?,?)', [
      id, body.nom, body.niveau, body.frais,
    ])
    await logAudit(req.auth.role, 'CREATION', 'Classe', body.nom)
    emitChange('classes')
    const [rows] = await pool.query('SELECT * FROM classes WHERE id = ?', [id])
    res.status(201).json(rows[0])
  })
)

const classUpdateSchema = classSchema.partial().extend({ actif: z.boolean().optional() })

router.put(
  '/:id',
  requirePerm('editClasses'),
  asyncHandler(async (req, res) => {
    const body = classUpdateSchema.parse(req.body)
    const fields = Object.keys(body)
    if (fields.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' })
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => body[f])
    values.push(req.params.id)
    const [result] = await pool.query(`UPDATE classes SET ${setClause} WHERE id = ?`, values)
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Classe introuvable.' })
    await logAudit(req.auth.role, 'MODIFICATION', 'Classe', req.params.id, JSON.stringify(body))
    emitChange('classes')
    const [rows] = await pool.query('SELECT * FROM classes WHERE id = ?', [req.params.id])
    res.json(rows[0])
  })
)

export default router
