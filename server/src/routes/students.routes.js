import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { pool, withTransaction } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { emitChange } from '../io.js'
import { statutOf, formatMatricule, nextCounter } from '../utils/business.js'

const router = Router()
router.use(requireAuth)

// ─── Multer — upload photo élève ──────────────────────────────────────────────
const uploadDir = path.resolve('uploads/photos')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, _file, cb) => cb(null, `student_${req.params.id}_${Date.now()}.jpg`),
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Seules les images sont acceptées.'))
  },
})

// ─── GET /api/students ─────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY nom, prenoms')
    res.json(rows)
  })
)

// ─── GET /api/students/qr/:token  (public lookup par token QR) ────────────────
router.get(
  '/qr/:token',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE token = ? OR matricule = ?',
      [req.params.token, req.params.token]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Élève introuvable.' })
    const student = rows[0]
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE student_id = ? AND annule = 0 ORDER BY date DESC LIMIT 10',
      [student.id]
    )
    res.json({ ...student, payments })
  })
)

// ─── GET /api/students/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Élève introuvable.' })
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC',
      [req.params.id]
    )
    res.json({ ...rows[0], payments })
  })
)

// ─── POST /api/students ────────────────────────────────────────────────────────
const studentSchema = z.object({
  nom: z.string().min(1),
  prenoms: z.string().min(1),
  sexe: z.enum(['M', 'F']).default('M'),
  date_naissance: z.string().optional().nullable(),
  classe_id: z.string().optional().nullable(),
  parent_nom: z.string().optional().nullable(),
  parent_tel: z.string().optional().nullable(),
  frais_additionnels: z.number().int().nonnegative().default(0),
})

router.post(
  '/',
  requirePerm('editStudents'),
  asyncHandler(async (req, res) => {
    const body = studentSchema.parse(req.body)

    const result = await withTransaction(async (conn) => {
      let classeNom = null
      let classeFrais = 0
      if (body.classe_id) {
        const [classeRows] = await conn.query('SELECT nom, frais FROM classes WHERE id = ?', [body.classe_id])
        if (!classeRows[0]) throw Object.assign(new Error('Classe introuvable.'), { status: 404 })
        classeNom = classeRows[0].nom
        classeFrais = classeRows[0].frais
      }

      const [settingsRows] = await conn.query("SELECT annee_scolaire FROM settings WHERE id = 'main' FOR UPDATE")
      const counter = await nextCounter(conn, 'matricule_counter')
      const matricule = formatMatricule(settingsRows[0]?.annee_scolaire, counter)

      const totalDu = classeFrais + body.frais_additionnels
      const id = uuid()
      const token = uuid()

      await conn.query(
        `INSERT INTO students (id, matricule, nom, prenoms, sexe, date_naissance, classe_id, classe_nom,
          parent_nom, parent_tel, frais_additionnels, total_du, total_paye, statut, token)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
        [id, matricule, body.nom, body.prenoms, body.sexe, body.date_naissance || null, body.classe_id || null,
         classeNom, body.parent_nom || null, body.parent_tel || null, body.frais_additionnels, totalDu,
         statutOf(totalDu, 0), token]
      )

      const [rows] = await conn.query('SELECT * FROM students WHERE id = ?', [id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'CREATION', 'Élève', `${result.matricule} — ${result.nom} ${result.prenoms}`)
    emitChange('students')
    res.status(201).json(result)
  })
)

// ─── PUT /api/students/:id ─────────────────────────────────────────────────────
const studentUpdateSchema = studentSchema.partial().extend({ actif: z.boolean().optional() })

router.put(
  '/:id',
  requirePerm('editStudents'),
  asyncHandler(async (req, res) => {
    const body = studentUpdateSchema.parse(req.body)

    const result = await withTransaction(async (conn) => {
      const [current] = await conn.query('SELECT * FROM students WHERE id = ? FOR UPDATE', [req.params.id])
      if (!current[0]) throw Object.assign(new Error('Élève introuvable.'), { status: 404 })
      const student = current[0]

      let classeNom = student.classe_nom
      let classeFrais = null
      if (body.classe_id !== undefined && body.classe_id !== student.classe_id) {
        if (body.classe_id) {
          const [classeRows] = await conn.query('SELECT nom, frais FROM classes WHERE id = ?', [body.classe_id])
          if (!classeRows[0]) throw Object.assign(new Error('Classe introuvable.'), { status: 404 })
          classeNom = classeRows[0].nom
          classeFrais = classeRows[0].frais
        } else {
          classeNom = null
          classeFrais = 0
        }
      }

      const fraisAdditionnels = body.frais_additionnels ?? student.frais_additionnels
      const needsRecompute = classeFrais !== null || body.frais_additionnels !== undefined
      let totalDu = student.total_du
      let statut = student.statut
      if (needsRecompute) {
        const baseFrais = classeFrais !== null ? classeFrais : await currentClasseFrais(conn, student.classe_id)
        totalDu = baseFrais + fraisAdditionnels
        statut = statutOf(totalDu, student.total_paye)
      }

      const merged = { ...body, classe_nom: classeNom, total_du: totalDu, statut }
      delete merged.classe_id
      const fields = Object.keys(merged).filter((k) => merged[k] !== undefined)
      if (body.classe_id !== undefined) fields.push('classe_id')
      if (fields.length === 0) return student

      const setClause = fields.map((f) => `${f} = ?`).join(', ')
      const values = fields.map((f) => (f === 'classe_id' ? body.classe_id || null : merged[f]))
      values.push(req.params.id)
      await conn.query(`UPDATE students SET ${setClause} WHERE id = ?`, values)

      const [rows] = await conn.query('SELECT * FROM students WHERE id = ?', [req.params.id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'MODIFICATION', 'Élève', `${result.matricule} — ${result.nom} ${result.prenoms}`)
    emitChange('students')
    res.json(result)
  })
)

// ─── POST /api/students/:id/photo ─────────────────────────────────────────────
router.post(
  '/:id/photo',
  requirePerm('editStudents'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' })

    const [rows] = await pool.query('SELECT id, nom, prenoms, matricule FROM students WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Élève introuvable.' })

    const photoUrl = `/uploads/photos/${req.file.filename}`
    await pool.query('UPDATE students SET photo_url = ? WHERE id = ?', [photoUrl, req.params.id])
    await logAudit(req.auth.role, 'PHOTO_UPLOAD', 'Élève', `${rows[0].matricule} — ${rows[0].nom} ${rows[0].prenoms}`)
    emitChange('students')
    res.json({ photo_url: photoUrl })
  })
)

// ─── DELETE /api/students/:id ──────────────────────────────────────────────────
router.delete(
  '/:id',
  requirePerm('editStudents'),
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('UPDATE students SET actif = 0 WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Élève introuvable.' })
    await logAudit(req.auth.role, 'DESACTIVATION', 'Élève', req.params.id)
    emitChange('students')
    res.json({ ok: true })
  })
)

async function currentClasseFrais(conn, classeId) {
  if (!classeId) return 0
  const [rows] = await conn.query('SELECT frais FROM classes WHERE id = ?', [classeId])
  return rows[0]?.frais ?? 0
}

export default router
