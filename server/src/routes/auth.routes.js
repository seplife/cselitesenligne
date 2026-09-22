import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { ROLES } from '../roles.js'

const router = Router()

// Limite les tentatives de connexion (10 par 15 min par IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
})

// ─── INSCRIPTION ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string().min(3, 'Le nom d\'utilisateur doit faire au moins 3 caractères.').max(60),
  nom_complet: z.string().min(2, 'Le nom complet est requis.').max(120),
  role: z.enum(['directeur', 'caissiere', 'secretaire', 'educateur', 'comptable', 'consultation']),
  password: z.string().min(4, 'Le mot de passe doit faire au moins 4 caractères.'),
})

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, nom_complet, role, password } = registerSchema.parse(req.body)

    // Vérifier si le username est déjà pris
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà utilisé.' })
    }

    const hash = await bcrypt.hash(password, 10)
    const id = uuid()

    await pool.query(
      'INSERT INTO users (id, username, nom_complet, role, password_hash) VALUES (?,?,?,?,?)',
      [id, username, nom_complet, role, hash]
    )

    // Connexion automatique après inscription
    const token = jwt.sign(
      { sub: id, role, label: nom_complet },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    )

    await logAudit(role, 'INSCRIPTION', 'Session', `${nom_complet} (${username})`, 'Nouveau compte créé')
    res.status(201).json({ token, user: { id, role, label: nom_complet, username } })
  })
)

// ─── CONNEXION ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body)

    // Chercher par username ou par role (compatibilité anciens comptes seed)
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE (username = ? OR role = ?) AND actif = 1',
      [username, username]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await logAudit(user.role, 'CONNEXION_ECHOUEE', 'Session', user.nom_complet || user.label, 'Mot de passe incorrect')
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' })
    }

    const label = user.nom_complet || user.label || user.username
    const token = jwt.sign(
      { sub: user.id, role: user.role, label },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    )

    await logAudit(user.role, 'CONNEXION', 'Session', label, 'Connexion réussie')
    res.json({ token, user: { id: user.id, role: user.role, label, username: user.username || user.role } })
  })
)

// ─── ME ────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.auth.sub, role: req.auth.role, label: req.auth.label } })
})

// ─── DÉCONNEXION ───────────────────────────────────────────────────────────────
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await logAudit(req.auth.role, 'DECONNEXION', 'Session', req.auth.label, 'Déconnexion')
    res.json({ ok: true })
  })
)

// ─── CHANGEMENT MOT DE PASSE ───────────────────────────────────────────────────
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
    await logAudit(req.auth.role, 'CHANGEMENT_MOT_DE_PASSE', 'Session', req.auth.label)
    res.json({ ok: true })
  })
)

// ─── RÉINITIALISATION (directeur) ─────────────────────────────────────────────
const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(4),
})

router.put(
  '/reset-password',
  requireAuth,
  requireRole('directeur'),
  asyncHandler(async (req, res) => {
    const { userId, newPassword } = resetPasswordSchema.parse(req.body)
    const hash = await bcrypt.hash(newPassword, 10)
    const [result] = await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Compte introuvable.' })
    await logAudit(req.auth.role, 'REINITIALISATION_MOT_DE_PASSE', 'Session', userId)
    res.json({ ok: true })
  })
)

// ─── LISTE DES UTILISATEURS (directeur) ───────────────────────────────────────
router.get(
  '/users',
  requireAuth,
  requireRole('directeur'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT id, username, nom_complet, role, actif, created_at FROM users ORDER BY created_at'
    )
    res.json(rows)
  })
)

export default router
