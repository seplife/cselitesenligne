import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDateShort, expenseStatutLabel, todayKey } from '@/lib/utils'
import { Plus, CheckCircle2, Wallet, XCircle, LockKeyhole } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'
import type { Expense } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  VALIDEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAYEE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ANNULEE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const CATEGORIES = ['Fournitures', 'Entretien', 'Électricité / Eau', 'Transport', 'Restauration', 'Réparations', 'Communication', 'Autre']

export default function Caisse() {
  const { expenses, cashClosures, hasPerm, loadAll } = useAppStore()
  const [tab, setTab] = useState<'depenses' | 'clotures'>('depenses')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [expenseModal, setExpenseModal] = useState(false)
  const [categorie, setCategorie] = useState(CATEGORIES[0])
  const [beneficiaire, setBeneficiaire] = useState('')
  const [montant, setMontant] = useState('')
  const [mode, setMode] = useState('Espèces')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayKey())
  const [savingExpense, setSavingExpense] = useState(false)

  const [closureModal, setClosureModal] = useState(false)
  const [closureDate, setClosureDate] = useState(todayKey())
  const [soldePhysique, setSoldePhysique] = useState('')
  const [observations, setObservations] = useState('')
  const [savingClosure, setSavingClosure] = useState(false)

  const totDepenses = expenses.filter(e => e.statut === 'PAYEE').reduce((a, e) => a + e.montant, 0)

  function openExpenseModal() {
    setCategorie(CATEGORIES[0]); setBeneficiaire(''); setMontant(''); setMode('Espèces')
    setDescription(''); setDate(todayKey())
    setExpenseModal(true)
  }

  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(montant)
    if (!m || m <= 0) { toast.error('Montant invalide.'); return }
    setSavingExpense(true)
    try {
      await api.post('/api/expenses', { categorie, beneficiaire: beneficiaire || null, montant: m, mode, description: description || null, date })
      toast.success('Dépense enregistrée, en attente de validation.')
      setExpenseModal(false)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSavingExpense(false)
    }
  }

  async function transition(expense: Expense, action: 'valider' | 'payer' | 'annuler') {
    setBusyId(expense.id)
    try {
      await api.post(`/api/expenses/${expense.id}/${action}`)
      toast.success(action === 'valider' ? 'Dépense validée.' : action === 'payer' ? 'Dépense payée.' : 'Dépense annulée.')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusyId(null)
    }
  }

  function openClosureModal() {
    setClosureDate(todayKey()); setSoldePhysique(''); setObservations('')
    setClosureModal(true)
  }

  async function handleSubmitClosure(e: React.FormEvent) {
    e.preventDefault()
    const sp = Number(soldePhysique)
    if (Number.isNaN(sp)) { toast.error('Solde physique invalide.'); return }
    setSavingClosure(true)
    try {
      await api.post('/api/cash_closures', { date: closureDate, solde_physique: sp, observations: observations || null })
      toast.success('Caisse clôturée.')
      setClosureModal(false)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSavingClosure(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caisse</h1>
        {hasPerm('manageCaisse') && tab === 'depenses' && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openExpenseModal}>Nouvelle dépense</Button>
        )}
        {hasPerm('manageCaisse') && tab === 'clotures' && (
          <Button icon={<LockKeyhole className="h-4 w-4" />} onClick={openClosureModal}>Clôturer la caisse</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['depenses', 'clotures'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'depenses' ? 'Dépenses' : 'Clôtures de caisse'}
          </button>
        ))}
      </div>

      {tab === 'depenses' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
            Total décaissé (Payées) : <span className="font-semibold text-gray-800 dark:text-white">{fmt(totDepenses)}</span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">N°</th>
                <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium">Bénéficiaire</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 text-center font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                {(hasPerm('manageCaisse') || hasPerm('validateExpense')) && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune dépense</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.numero}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{e.categorie}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.beneficiaire ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(e.montant)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[e.statut]}`}>
                      {expenseStatutLabel(e.statut)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(e.date)}</td>
                  {(hasPerm('manageCaisse') || hasPerm('validateExpense')) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {e.statut === 'EN_ATTENTE' && hasPerm('validateExpense') && (
                          <button disabled={busyId === e.id} onClick={() => transition(e, 'valider')} title="Valider" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {e.statut === 'VALIDEE' && hasPerm('manageCaisse') && (
                          <button disabled={busyId === e.id} onClick={() => transition(e, 'payer')} title="Payer" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-40">
                            <Wallet className="h-4 w-4" />
                          </button>
                        )}
                        {(e.statut === 'EN_ATTENTE' || e.statut === 'VALIDEE') && hasPerm('manageCaisse') && (
                          <button
                            disabled={busyId === e.id}
                            onClick={() => { if (confirm('Annuler cette dépense ?')) transition(e, 'annuler') }}
                            title="Annuler"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'clotures' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Entrées</th>
                <th className="px-4 py-3 text-right font-medium">Sorties</th>
                <th className="px-4 py-3 text-right font-medium">Solde théorique</th>
                <th className="px-4 py-3 text-right font-medium">Solde physique</th>
                <th className="px-4 py-3 text-right font-medium">Écart</th>
                <th className="px-4 py-3 text-left font-medium">Clôturé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cashClosures.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune clôture</td></tr>
              ) : cashClosures.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{fmtDateShort(c.date)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(c.entrees)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmt(c.sorties)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(c.solde_theorique)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(c.solde_physique)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${c.ecart !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {c.ecart !== 0 ? fmt(c.ecart) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.cloture_par}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New expense modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Nouvelle dépense" maxWidth="sm">
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <Select label="Catégorie" value={categorie} onChange={e => setCategorie(e.target.value)} options={CATEGORIES} />
          <Input label="Bénéficiaire" value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)} />
          <Input label="Montant (FCFA)" type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)} required autoFocus />
          <Select label="Mode de paiement" value={mode} onChange={e => setMode(e.target.value)} options={['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque']} />
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <Textarea label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExpenseModal(false)}>Annuler</Button>
            <Button type="submit" loading={savingExpense}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Cash closure modal */}
      <Modal open={closureModal} onClose={() => setClosureModal(false)} title="Clôturer la caisse" maxWidth="sm">
        <form onSubmit={handleSubmitClosure} className="space-y-4">
          <Input label="Date" type="date" value={closureDate} onChange={e => setClosureDate(e.target.value)} required autoFocus />
          <Input
            label="Solde physique compté (FCFA)"
            type="number"
            value={soldePhysique}
            onChange={e => setSoldePhysique(e.target.value)}
            required
            hint="Montant réellement compté dans la caisse à la fin de la journée."
          />
          <Textarea label="Observations" rows={2} value={observations} onChange={e => setObservations(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setClosureModal(false)}>Annuler</Button>
            <Button type="submit" loading={savingClosure}>Clôturer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
