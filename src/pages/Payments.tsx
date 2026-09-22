import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDate } from '@/lib/utils'
import { Search, Plus, Ban } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'

export default function Payments() {
  const { payments, students, hasPerm, loadAll } = useAppStore()
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('Espèces')
  const [motif, setMotif] = useState('Scolarité')
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return p.student_nom?.toLowerCase().includes(q)
      || p.student_matricule?.toLowerCase().includes(q)
      || p.recu_numero?.toLowerCase().includes(q)
      || p.motif?.toLowerCase().includes(q)
  })

  const selectedStudent = students.find(s => s.id === studentId)

  function openModal() {
    setStudentId('')
    setAmount('')
    setMode('Espèces')
    setMotif('Scolarité')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montant = Number(amount)
    if (!studentId) { toast.error('Sélectionnez un élève.'); return }
    if (!montant || montant <= 0) { toast.error('Montant invalide.'); return }
    setSaving(true)
    try {
      await api.post('/api/payments', { student_id: studentId, montant, mode, motif })
      toast.success('Paiement enregistré.')
      setModalOpen(false)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Annuler ce paiement ? Le solde de l’élève sera recalculé.')) return
    setCancellingId(id)
    try {
      await api.post(`/api/payments/${id}/annuler`)
      toast.success('Paiement annulé.')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paiements</h1>
        {hasPerm('pay') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openModal}>Nouveau paiement</Button>
        )}
      </div>

      <div className="relative w-64">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Reçu</th>
              <th className="px-4 py-3 text-left font-medium">Élève</th>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-left font-medium">Motif</th>
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              <th className="px-4 py-3 text-left font-medium">Mode</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
              {hasPerm('pay') && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucun paiement trouvé</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${p.annule ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.recu_numero}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.student_nom}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.classe_nom ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.motif}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.montant)}</td>
                <td className="px-4 py-3 text-gray-500">{p.mode}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.date)}</td>
                <td className="px-4 py-3 text-center">
                  {p.annule
                    ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Annulé</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Validé</span>
                  }
                </td>
                {hasPerm('pay') && (
                  <td className="px-4 py-3 text-right">
                    {!p.annule && (
                      <button
                        onClick={() => handleCancel(p.id)}
                        disabled={cancellingId === p.id}
                        title="Annuler ce paiement"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau paiement" maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Élève"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            options={[{ value: '', label: 'Sélectionner un élève…' }, ...students.filter(s => s.actif).map(s => ({ value: s.id, label: `${s.matricule} — ${s.nom} ${s.prenoms}` }))]}
            required
            autoFocus
          />
          {selectedStudent && (
            <p className="text-xs text-gray-500 -mt-2">
              Reste à payer : <strong className="text-red-500">{fmt(selectedStudent.total_du - selectedStudent.total_paye)}</strong>
            </p>
          )}
          <Input label="Montant (FCFA)" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} required />
          <Select label="Mode de paiement" value={mode} onChange={e => setMode(e.target.value)} options={['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque']} />
          <Input label="Motif" value={motif} onChange={e => setMotif(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Encaisser</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
