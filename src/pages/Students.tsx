import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDateShort, statutOf } from '@/lib/utils'
import { Search, Plus, Wallet, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'
import type { Student } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  SOLDE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CREDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  NON_SOLDE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

interface StudentFormState {
  matricule: string
  nom: string
  prenoms: string
  sexe: 'M' | 'F'
  date_naissance: string
  classe_id: string
  parent_nom: string
  parent_tel: string
  frais_additionnels: string
}

const EMPTY_FORM: StudentFormState = {
  matricule: '', nom: '', prenoms: '', sexe: 'M', date_naissance: '', classe_id: '', parent_nom: '', parent_tel: '', frais_additionnels: '0',
}

export default function Students() {
  const { students, classes, hasPerm, loadAll } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterClasse, setFilterClasse] = useState<string>('all')

  const [studentModal, setStudentModal] = useState<{ open: boolean; editing: Student | null }>({ open: false, editing: null })
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [payModal, setPayModal] = useState<Student | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('Espèces')
  const [payMotif, setPayMotif] = useState('Scolarité')
  const [paying, setPaying] = useState(false)

  const filtered = students.filter(s => {
    if (!s.actif) return false
    const q = search.toLowerCase()
    if (q && !s.nom.toLowerCase().includes(q) && !s.prenoms.toLowerCase().includes(q) && !s.matricule.toLowerCase().includes(q)) return false
    if (filterStatut !== 'all' && s.statut !== filterStatut) return false
    if (filterClasse !== 'all' && s.classe_id !== filterClasse) return false
    return true
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setStudentModal({ open: true, editing: null })
  }

  function openEdit(s: Student) {
    setForm({
      matricule: s.matricule ?? '',
      nom: s.nom, prenoms: s.prenoms, sexe: s.sexe, date_naissance: s.date_naissance ?? '',
      classe_id: s.classe_id ?? '', parent_nom: s.parent_nom ?? '', parent_tel: s.parent_tel ?? '',
      frais_additionnels: String(s.frais_additionnels ?? 0),
    })
    setStudentModal({ open: true, editing: s })
  }

  async function handleSubmitStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!form.matricule.trim()) {
      toast.error('Le matricule est requis.')
      return
    }
    if (!form.nom.trim() || !form.prenoms.trim()) {
      toast.error('Nom et prénoms requis.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        matricule: form.matricule.trim().toUpperCase(),
        nom: form.nom.trim(),
        prenoms: form.prenoms.trim(),
        sexe: form.sexe,
        date_naissance: form.date_naissance || null,
        classe_id: form.classe_id || null,
        parent_nom: form.parent_nom || null,
        parent_tel: form.parent_tel || null,
        frais_additionnels: Number(form.frais_additionnels) || 0,
      }
      if (studentModal.editing) {
        await api.put(`/api/students/${studentModal.editing.id}`, payload)
        toast.success('Élève mis à jour.')
      } else {
        await api.post('/api/students', payload)
        toast.success('Élève inscrit avec succès.')
      }
      setStudentModal({ open: false, editing: null })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payModal) return
    const montant = Number(payAmount)
    if (!montant || montant <= 0) {
      toast.error('Montant invalide.')
      return
    }
    setPaying(true)
    try {
      await api.post('/api/payments', {
        student_id: payModal.id,
        montant,
        mode: payMode,
        motif: payMotif,
      })
      toast.success('Paiement enregistré.')
      setPayModal(null)
      setPayAmount('')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Élèves ({filtered.length})</h1>
        {hasPerm('editStudents') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Nouvel élève</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
          />
        </div>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="SOLDE">Soldé</option>
          <option value="NON_SOLDE">Non soldé</option>
          <option value="CREDIT">Crédit</option>
        </select>
        <select
          value={filterClasse}
          onChange={e => setFilterClasse(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          <option value="all">Toutes classes</option>
          {classes.filter(c => c.actif).map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Matricule</th>
              <th className="px-4 py-3 text-left font-medium">Nom & Prénoms</th>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-right font-medium">Dû</th>
              <th className="px-4 py-3 text-right font-medium">Payé</th>
              <th className="px-4 py-3 text-right font-medium">Reste</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
              {hasPerm('editStudents') && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun élève trouvé</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.matricule}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {s.nom} {s.prenoms}
                  {s.parent_tel && <p className="text-xs text-gray-400">{s.parent_nom} — {s.parent_tel}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.classe_nom ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(s.total_du)}</td>
                <td className="px-4 py-3 text-right text-green-600">{fmt(s.total_paye)}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(s.total_du - s.total_paye)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[s.statut]}`}>
                    {s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}
                  </span>
                </td>
                {hasPerm('editStudents') && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {hasPerm('pay') && (
                        <button
                          onClick={() => { setPayModal(s); setPayAmount(''); setPayMode('Espèces'); setPayMotif('Scolarité') }}
                          title="Encaisser un paiement"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(s)}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / edit student modal */}
      <Modal
        open={studentModal.open}
        onClose={() => setStudentModal({ open: false, editing: null })}
        title={studentModal.editing ? 'Modifier l’élève' : 'Nouvel élève'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitStudent} className="space-y-4">
          {/* Matricule — saisi manuellement */}
          <Input
            label="Matricule *"
            value={form.matricule}
            onChange={e => setForm(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
            placeholder="Ex : CSE-2025-001"
            required
            autoFocus
            hint={studentModal.editing ? 'Modifiable si erreur de saisie initiale.' : 'Identifiant unique de l\'élève — saisir manuellement.'}
            className="font-mono tracking-widest"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
            <Input label="Prénoms" value={form.prenoms} onChange={e => setForm(f => ({ ...f, prenoms: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sexe"
              value={form.sexe}
              onChange={e => setForm(f => ({ ...f, sexe: e.target.value as 'M' | 'F' }))}
              options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
            />
            <Input label="Date de naissance" type="date" value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
          </div>
          <Select
            label="Classe"
            value={form.classe_id}
            onChange={e => setForm(f => ({ ...f, classe_id: e.target.value }))}
            options={[{ value: '', label: 'Aucune classe' }, ...classes.filter(c => c.actif).map(c => ({ value: c.id, label: `${c.nom} (${fmt(c.frais)})` }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom du parent" value={form.parent_nom} onChange={e => setForm(f => ({ ...f, parent_nom: e.target.value }))} />
            <Input label="Téléphone parent" value={form.parent_tel} onChange={e => setForm(f => ({ ...f, parent_tel: e.target.value }))} />
          </div>
          <Input
            label="Frais additionnels (FCFA)"
            type="number"
            min={0}
            value={form.frais_additionnels}
            onChange={e => setForm(f => ({ ...f, frais_additionnels: e.target.value }))}
            hint="Cantine, transport, etc. — s'ajoute aux frais de la classe pour calculer le total dû."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStudentModal({ open: false, editing: null })}>Annuler</Button>
            <Button type="submit" loading={saving}>{studentModal.editing ? 'Enregistrer' : 'Inscrire'}</Button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Encaisser un paiement" maxWidth="sm">
        {payModal && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-800 dark:text-white">{payModal.nom} {payModal.prenoms}</p>
              <p className="text-xs text-gray-500">{payModal.matricule} — {payModal.classe_nom ?? 'Sans classe'}</p>
              <p className="mt-1 text-xs text-gray-500">
                Dû : <strong>{fmt(payModal.total_du)}</strong> · Payé : <strong className="text-green-600">{fmt(payModal.total_paye)}</strong> · Reste : <strong className="text-red-500">{fmt(payModal.total_du - payModal.total_paye)}</strong>
              </p>
            </div>
            <Input label="Montant (FCFA)" type="number" min={1} value={payAmount} onChange={e => setPayAmount(e.target.value)} required autoFocus />
            <Select
              label="Mode de paiement"
              value={payMode}
              onChange={e => setPayMode(e.target.value)}
              options={['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque']}
            />
            <Input label="Motif" value={payMotif} onChange={e => setPayMotif(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>Annuler</Button>
              <Button type="submit" loading={paying}>Encaisser</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
