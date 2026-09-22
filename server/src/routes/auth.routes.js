import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { ROLES } from '../roles.js'

const router = Router()

// Limite les tentatives de connexion (10 par 15 min par IP) pour dissuader le bruteforce des mots de passe.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
})

const loginSchema = z.object({
  role: z.enum(['directeur', 'caissiere', 'secretaire', 'educateur', 'comptable', 'consultation']),
  password: z.string().min(1),
})

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { role, password } = loginSchema.parse(req.body)
    const [rows] = await pool.query('SELECT * FROM users WHERE role = ? AND actif = 1', [role])
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Profil invalide.' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await logAudit(role, 'CONNEXION_ECHOUEE', 'Session', ROLES[role]?.label, 'Mot de passe incorrect')
      return res.status(401).json({ error: 'Mot de passe incorrect.' })
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, label: user.label },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    )

    await logAudit(role, 'CONNEXION', 'Session', ROLES[role]?.label, 'Connexion réussie')
    res.json({ token, user: { id: user.id, role: user.role, label: user.label } })
  })
)

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.auth.sub, role: req.auth.role, label: req.auth.label } })
})

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await logAudit(req.auth.role, 'DECONNEXION', 'Session', ROLES[req.auth.role]?.label, 'Déconnexion')
    res.json({ ok: true })
  })
)

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4),
})

router.put(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.auth.sub])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' })

    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id])
    await logAudit(req.auth.role, 'CHANGEMENT_MOT_DE_PASSE', 'Session', ROLES[req.auth.role]?.label)
    res.json({ ok: true })
  })
)

const resetPasswordSchema = z.object({
  role: z.enum(['directeur', 'caissiere', 'secretaire', 'educateur', 'comptable', 'consultation']),
  newPassword: z.string().min(4),
})

// Le directeur peut réinitialiser le mot de passe d'un autre profil (personnel qui l'a oublié).
router.put(
  '/reset-password',
  requireAuth,
  requireRole('directeur'),
  asyncHandler(async (req, res) => {
    const { role, newPassword } = resetPasswordSchema.parse(req.body)
    const hash = await bcrypt.hash(newPassword, 10)
    const [result] = await pool.query('UPDATE users SET password_hash = ? WHERE role = ?', [hash, role])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Profil introuvable.' })
    await logAudit(req.auth.role, 'REINITIALISATION_MOT_DE_PASSE', 'Session', ROLES[role]?.label)
    res.json({ ok: true })
  })
)

export default router
