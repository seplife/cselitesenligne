import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { pool, withTransaction } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { logAudit } from '../utils/audit.js'
import { emitChange } from '../io.js'
import { formatDepense, nextCounter } from '../utils/business.js'
import { ROLES } from '../roles.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC LIMIT 500')
    res.json(rows)
  })
)

const expenseSchema = z.object({
  categorie: z.string().min(1),
  beneficiaire: z.string().optional().nullable(),
  montant: z.number().int().positive(),
  mode: z.string().min(1).default('Espèces'),
  description: z.string().optional().nullable(),
  date: z.string().min(1),
})

router.post(
  '/',
  requirePerm('manageCaisse'),
  asyncHandler(async (req, res) => {
    const body = expenseSchema.parse(req.body)

    const result = await withTransaction(async (conn) => {
      const [settingsRows] = await conn.query("SELECT annee_scolaire FROM settings WHERE id = 'main' FOR UPDATE")
      const counter = await nextCounter(conn, 'dep_counter')
      const numero = formatDepense(settingsRows[0]?.annee_scolaire, counter)
      const id = uuid()
      const saisiPar = ROLES[req.auth.role]?.label ?? req.auth.role

      await conn.query(
        `INSERT INTO expenses (id, numero, categorie, beneficiaire, montant, mode, statut, description, saisi_par, date)
         VALUES (?,?,?,?,?,?,'EN_ATTENTE',?,?,?)`,
        [id, numero, body.categorie, body.beneficiaire || null, body.montant, body.mode, body.description || null,
         saisiPar, body.date]
      )

      const [rows] = await conn.query('SELECT * FROM expenses WHERE id = ?', [id])
      return rows[0]
    })

    await logAudit(req.auth.role, 'CREATION', 'Dépense', `${result.numero} — ${result.categorie}`, `${result.montant} FCFA`)
    emitChange('expenses')
    res.status(201).json(result)
  })
)

async function transitionExpense(req, res, { from, to, action, extra }) {
  const result = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM expenses WHERE id = ? FOR UPDATE', [req.params.id])
    const expense = rows[0]
    if (!expense) throw Object.assign(new Error('Dépense introuvable.'), { status: 404 })
    if (!from.includes(expense.statut)) {
      throw Object.assign(new Error(`Cette dépense est au statut "${expense.statut}" et ne peut pas être ${action}.`), { status: 409 })
    }

    const fields = { statut: to, ...extra(req) }
    const setClause = Object.keys(fields).map((f) => `${f} = ?`).join(', ')
    const values = [...Object.values(fields), req.params.id]
    await conn.query(`UPDATE expenses SET ${setClause} WHERE id = ?`, values)

    const [updated] = await conn.query('SELECT * FROM expenses WHERE id = ?', [req.params.id])
    return updated[0]
  })
  return result
}

router.post(
  '/:id/valider',
  requirePerm('validateExpense'),
  asyncHandler(async (req, res) => {
    const result = await transitionExpense(req, res, {
      from: ['EN_ATTENTE'],
      to: 'VALIDEE',
      action: 'validée',
      extra: (r) => ({ valide_par: ROLES[r.auth.role]?.label ?? r.auth.role }),
    })
    await logAudit(req.auth.role, 'VALIDATION', 'Dépense', `${result.numero} — ${result.categorie}`)
    emitChange('expenses')
    res.json(result)
  })
)

router.post(
  '/:id/payer',
  requirePerm('manageCaisse'),
  asyncHandler(async (req, res) => {
    const result = await transitionExpense(req, res, {
      from: ['VALIDEE'],
      to: 'PAYEE',
      action: 'payée',
      extra: () => ({}),
    })
    await logAudit(req.auth.role, 'PAIEMENT', 'Dépense', `${result.numero} — ${result.categorie}`, `${result.montant} FCFA`)
    emitChange('expenses')
    res.json(result)
  })
)

router.post(
  '/:id/annuler',
  requirePerm('manageCaisse'),
  asyncHandler(async (req, res) => {
    const result = await transitionExpense(req, res, {
      from: ['EN_ATTENTE', 'VALIDEE'],
      to: 'ANNULEE',
      action: 'annulée',
      extra: () => ({}),
    })
    await logAudit(req.auth.role, 'ANNULATION', 'Dépense', `${result.numero} — ${result.categorie}`)
    emitChange('expenses')
    res.json(result)
  })
)

export default router
