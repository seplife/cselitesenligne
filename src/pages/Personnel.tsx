import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDateShort, monthKey } from '@/lib/utils'
import { Search, Plus, Pencil, Trash2, QrCode as QrIcon, X, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import { QrBadgeModal } from '@/components/QrBadgeModal'
import toast from 'react-hot-toast'
import type { Staff } from '@/types'

interface StaffFormState {
  matricule: string
  nom: string
  prenoms: string
  poste: string
  salaire_base: string
  telephone: string
  rib: string
  date_embauche: string
  actif: boolean
}

const EMPTY_FORM: StaffFormState = {
  matricule: '',
  nom: '',
  prenoms: '',
  poste: '',
  salaire_base: '0',
  telephone: '',
  rib: '',
  date_embauche: '',
  actif: true,
}

export default function Personnel() {
  const { staff, staffPayments, settings, hasPerm, loadAll } = useAppStore()
  const [tab, setTab] = useState<'liste' | 'paie'>('liste')
  const [filterMois, setFilterMois] = useState(monthKey())
  const [search, setSearch] = useState('')

  const [staffModal, setStaffModal] = useState<{ open: boolean; editing: Staff | null }>({ open: false, editing: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; staff: Staff | null; deleting: boolean }>({ open: false, staff: null, deleting: false })
  const [qrModalStaff, setQrModalStaff] = useState<Staff | null>(null)
  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Filtrage du personnel par nom ou numéro matricule ou poste
  const staffFiltre = staff.filter(s => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const matchNom = s.nom.toLowerCase().includes(q)
    const matchPrenoms = s.prenoms.toLowerCase().includes(q)
    const matchMatricule = (s.matricule || '').toLowerCase().includes(q)
    const matchPoste = (s.poste || '').toLowerCase().includes(q)
    const matchTel = (s.telephone || '').toLowerCase().includes(q)
    return matchNom || matchPrenoms || matchMatricule || matchPoste || matchTel
  })

  // Fiches de paie filtrées
  const paiesFiltrees = staffPayments.filter(p => {
    const matchMois = !filterMois || p.mois === filterMois
    if (!matchMois) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.staff_nom.toLowerCase().includes(q)
  })
  const totalNet = paiesFiltrees.reduce((a, p) => a + p.salaire_net, 0)

  function openCreate() {
    const nextNum = staff.length + 1
    setForm({
      ...EMPTY_FORM,
      matricule: `PER-${String(nextNum).padStart(3, '0')}`,
      date_embauche: new Date().toISOString().slice(0, 10),
    })
    setStaffModal({ open: true, editing: null })
  }

  function openEdit(s: Staff) {
    setForm({
      matricule: s.matricule || '',
      nom: s.nom,
      prenoms: s.prenoms,
      poste: s.poste || '',
      salaire_base: String(s.salaire_base || 0),
      telephone: s.telephone || '',
      rib: s.rib || '',
      date_embauche: s.date_embauche || '',
      actif: s.actif,
    })
    setStaffModal({ open: true, editing: s })
  }

  async function handleSubmitStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim() || !form.prenoms.trim()) {
      toast.error('Nom et prénoms requis.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        matricule: form.matricule.trim().toUpperCase() || undefined,
        nom: form.nom.trim().toUpperCase(),
        prenoms: form.prenoms.trim(),
        poste: form.poste.trim() || null,
        salaire_base: Number(form.salaire_base) || 0,
        telephone: form.telephone.trim() || null,
        rib: form.rib.trim() || null,
        date_embauche: form.date_embauche || null,
        actif: form.actif,
      }
      if (staffModal.editing) {
        await api.put(`/api/staff/${staffModal.editing.id}`, payload)
        toast.success('Personnel mis à jour.')
      } else {
        await api.post('/api/staff', payload)
        toast.success('Membre du personnel ajouté.')
      }
      setStaffModal({ open: false, editing: null })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteStaff() {
    if (!deleteModal.staff) return
    setDeleteModal(m => ({ ...m, deleting: true }))
    try {
      await api.delete(`/api/staff/${deleteModal.staff.id}`)
      toast.success('Personnel supprimé.')
      setDeleteModal({ open: false, staff: null, deleting: false })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur lors de la suppression.')
      setDeleteModal(m => ({ ...m, deleting: false }))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personnel ({staff.length})</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestion des membres du personnel, recherche par matricule ou nom, badges et codes QR
          </p>
        </div>
        {hasPerm('managePersonnel') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nouveau personnel
          </Button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['liste', 'paie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'liste' ? `Liste du personnel (${staffFiltre.length})` : 'Fiches de paie'}
          </button>
        ))}
      </div>

      {/* Barre de Recherche */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénoms, matricule ou poste…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg"
          >
            Effacer recherche
          </button>
        )}
      </div>

      {tab === 'liste' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Matricule</th>
                <th className="px-4 py-3 text-left font-medium">Nom & Prénoms</th>
                <th className="px-4 py-3 text-left font-medium">Poste</th>
                <th className="px-4 py-3 text-left font-medium">Téléphone</th>
                <th className="px-4 py-3 text-right font-medium">Salaire base</th>
                <th className="px-4 py-3 text-left font-medium">Embauché le</th>
                <th className="px-4 py-3 text-center font-medium">Actif</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {staffFiltre.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <User className="h-6 w-6 text-gray-300" />
                      <p>Aucun personnel trouvé.</p>
                    </div>
                  </td>
                </tr>
              ) : staffFiltre.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700 dark:text-primary-400">
                    {s.matricule || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <span className="font-semibold">{s.nom}</span> {s.prenoms}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                    {s.poste ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                    {fmt(s.salaire_base)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(s.date_embauche)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.actif ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1">
                      {/* Bouton QR Code / Badge */}
                      <button
                        onClick={() => setQrModalStaff(s)}
                        title="Afficher le Code QR et le Badge Professionnel"
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                      >
                        <QrIcon className="h-4 w-4" />
                      </button>

                      {hasPerm('managePersonnel') && (
                        <>
                          <button
                            onClick={() => openEdit(s)}
                            title="Modifier"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, staff: s, deleting: false })}
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'paie' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-500">Mois :</label>
              <input
                type="month"
                value={filterMois}
                onChange={e => setFilterMois(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total net : <strong className="text-primary-600 dark:text-primary-400 font-bold">{fmt(totalNet)}</strong>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Personnel</th>
                  <th className="px-4 py-3 text-right font-medium">Base</th>
                  <th className="px-4 py-3 text-right font-medium">Primes</th>
                  <th className="px-4 py-3 text-right font-medium">Retenues</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                  <th className="px-4 py-3 text-left font-medium">Mode</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paiesFiltrees.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune paie trouvée</td></tr>
                ) : paiesFiltrees.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.staff_nom}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(p.salaire_base)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{fmt(p.primes)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(p.retenues)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmt(p.salaire_net)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.mode}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateShort(p.date_paiement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajouter / Modifier Personnel */}
      <Modal
        open={staffModal.open}
        onClose={() => setStaffModal({ open: false, editing: null })}
        title={staffModal.editing ? 'Modifier le personnel' : 'Nouveau personnel'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitStaff} className="space-y-4">
          <Input
            label="Matricule *"
            value={form.matricule}
            onChange={e => setForm(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
            placeholder="Ex : PER-001"
            required
            className="font-mono uppercase tracking-wider"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))} required />
            <Input label="Prénoms *" value={form.prenoms} onChange={e => setForm(f => ({ ...f, prenoms: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Poste / Fonction" value={form.poste} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))} placeholder="Ex: Comptable, Surveillant..." />
            <Input label="Téléphone" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="Ex: 0707070707" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Salaire de base (FCFA)"
              type="number"
              min={0}
              value={form.salaire_base}
              onChange={e => setForm(f => ({ ...f, salaire_base: e.target.value }))}
            />
            <Input label="Date d'embauche" type="date" value={form.date_embauche} onChange={e => setForm(f => ({ ...f, date_embauche: e.target.value }))} />
          </div>
          <Input label="RIB / Coordonnées bancaires" value={form.rib} onChange={e => setForm(f => ({ ...f, rib: e.target.value }))} placeholder="Facultatif" />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="staff-actif"
              checked={form.actif}
              onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="staff-actif" className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Personnel en fonction (Actif)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setStaffModal({ open: false, editing: null })}>Annuler</Button>
            <Button type="submit" loading={saving}>{staffModal.editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation Suppression Personnel */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, staff: null, deleting: false })}
        title="Supprimer le personnel"
        maxWidth="sm"
      >
        {deleteModal.staff && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-sm text-red-800 dark:text-red-300">
              <p className="font-bold">Confirmation requise</p>
              <p className="mt-1">
                Êtes-vous sûr de vouloir supprimer{' '}
                <strong>{deleteModal.staff.nom} {deleteModal.staff.prenoms}</strong> (Matricule :{' '}
                <span className="font-mono font-bold">{deleteModal.staff.matricule}</span>) ?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteModal({ open: false, staff: null, deleting: false })}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={deleteModal.deleting}
                onClick={handleDeleteStaff}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal QR Code Personnel */}
      {qrModalStaff && (
        <QrBadgeModal
          open={!!qrModalStaff}
          onClose={() => setQrModalStaff(null)}
          staff={qrModalStaff}
          settings={settings}
        />
      )}
    </div>
  )
}
