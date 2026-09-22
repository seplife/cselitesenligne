import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM staff_payments ORDER BY mois DESC, staff_nom')
    res.json(rows)
  })
)

export default router
