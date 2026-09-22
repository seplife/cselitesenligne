import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  requirePerm('seeAudit'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY date DESC LIMIT 400')
    res.json(rows)
  })
)

export default router
