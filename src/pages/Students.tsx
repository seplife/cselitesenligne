import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDateShort } from '@/lib/utils'
import {
  Search, Plus, Wallet, Pencil, Trash2, QrCode as QrIcon,
  Printer, Download, FileSpreadsheet, FileText, X
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import { QrBadgeModal } from '@/components/QrBadgeModal'
import { exportClassStudentsXLSX, exportClassStudentsPDF, printClassStudents } from '@/lib/exports'
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
  const { students, classes, settings, hasPerm, loadAll } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterClasse, setFilterClasse] = useState<string>('all')

  const [studentModal, setStudentModal] = useState<{ open: boolean; editing: Student | null }>({ open: false, editing: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; student: Student | null; deleting: boolean }>({ open: false, student: null, deleting: false })
  const [qrModalStudent, setQrModalStudent] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [payModal, setPayModal] = useState<Student | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('Espèces')
  const [payMotif, setPayMotif] = useState('Scolarité')
  const [paying, setPaying] = useState(false)

  // Filtrage combiné et recherche insensible à la casse
  const filtered = students.filter(s => {
    if (!s.actif) return false
    const q = search.trim().toLowerCase()
    if (q) {
      const matchNom = s.nom.toLowerCase().includes(q)
      const matchPrenoms = s.prenoms.toLowerCase().includes(q)
      const matchMatricule = s.matricule.toLowerCase().includes(q)
      if (!matchNom && !matchPrenoms && !matchMatricule) return false
    }
    if (filterStatut !== 'all' && s.statut !== filterStatut) return false
    if (filterClasse !== 'all' && s.classe_id !== filterClasse) return false
    return true
  })

  // Nom de la classe actuellement sélectionnée pour les exports
  const selectedClasseNom = React.useMemo(() => {
    if (filterClasse === 'all') return 'Toutes les classes'
    const c = classes.find(x => x.id === filterClasse)
    return c ? c.nom : 'Classe'
  }, [filterClasse, classes])

  function openCreate() {
    setForm(EMPTY_FORM)
    setStudentModal({ open: true, editing: null })
  }

  function openEdit(s: Student) {
    setForm({
      matricule: s.matricule ?? '',
      nom: s.nom,
      prenoms: s.prenoms,
      sexe: s.sexe,
      date_naissance: s.date_naissance ?? '',
      classe_id: s.classe_id ?? '',
      parent_nom: s.parent_nom ?? '',
      parent_tel: s.parent_tel ?? '',
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

  async function handleDeleteStudent(force = false) {
    if (!deleteModal.student) return
    setDeleteModal(m => ({ ...m, deleting: true }))
    try {
      await api.delete(`/api/students/${deleteModal.student.id}`, { force })
      toast.success(force ? 'Élève supprimé définitivement.' : 'Élève retiré.')
      setDeleteModal({ open: false, student: null, deleting: false })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur lors de la suppression.')
      setDeleteModal(m => ({ ...m, deleting: false }))
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

  // Impression de la liste
  function handlePrint() {
    if (filtered.length === 0) {
      toast.error('Aucun élève à imprimer.')
      return
    }
    printClassStudents(selectedClasseNom, filtered, settings || undefined)
  }

  // Téléchargement Excel
  function handleExportXLSX() {
    if (filtered.length === 0) {
      toast.error('Aucun élève à exporter.')
      return
    }
    exportClassStudentsXLSX(selectedClasseNom, filtered, settings?.annee_scolaire)
    toast.success('Fichier Excel téléchargé.')
  }

  // Téléchargement PDF
  function handleExportPDF() {
    if (filtered.length === 0) {
      toast.error('Aucun élève à exporter.')
      return
    }
    exportClassStudentsPDF(selectedClasseNom, filtered, settings || undefined)
    toast.success('Fichier PDF téléchargé.')
  }

  return (
    <div className="space-y-5">
      {/* En-tête avec titre et actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Élèves ({filtered.length})
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered.length} affiché(s) sur {students.filter(s => s.actif).length} inscrits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Boutons d'export et d'impression par classe */}
          <div className="inline-flex rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
            <button
              onClick={handlePrint}
              title={`Imprimer la liste (${selectedClasseNom})`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-primary-600" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleExportXLSX}
              title={`Télécharger Excel (${selectedClasseNom})`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              title={`Télécharger PDF (${selectedClasseNom})`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>
          </div>

          {hasPerm('editStudents') && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nouvel élève
            </Button>
          )}
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
        {/* Recherche par nom ou matricule */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénoms ou matricule…"
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

        {/* Filtre Classe */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Classe :</label>
          <select
            value={filterClasse}
            onChange={e => setFilterClasse(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes les classes</option>
            {classes.filter(c => c.actif).map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        {/* Filtre Statut financier */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Statut :</label>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous statuts</option>
            <option value="SOLDE">Soldé</option>
            <option value="NON_SOLDE">Non soldé</option>
            <option value="CREDIT">Crédit</option>
          </select>
        </div>

        {(search || filterClasse !== 'all' || filterStatut !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterClasse('all'); setFilterStatut('all') }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Tableau des élèves */}
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
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-6 w-6 text-gray-300" />
                    <p>Aucun élève trouvé avec ces critères de recherche.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700 dark:text-primary-400">
                  {s.matricule}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <div>
                    <span className="font-semibold">{s.nom}</span> {s.prenoms}
                    <span className="ml-2 text-xs text-gray-400 font-normal">({s.sexe})</span>
                  </div>
                  {s.parent_tel && (
                    <p className="text-xs text-gray-400">
                      {s.parent_nom ? `${s.parent_nom} — ` : ''}{s.parent_tel}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                  {s.classe_nom ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
                      {s.classe_nom}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Non affecté</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                  {fmt(s.total_du)}
                </td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">
                  {fmt(s.total_paye)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-500">
                  {fmt(s.total_du - s.total_paye)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[s.statut]}`}>
                    {s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end items-center gap-1">
                    {/* Bouton QR Code / Badge */}
                    <button
                      onClick={() => setQrModalStudent(s)}
                      title="Afficher le Code QR et le Badge"
                      className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                    >
                      <QrIcon className="h-4 w-4" />
                    </button>

                    {/* Bouton Encaisser (selon perms) */}
                    {hasPerm('pay') && (
                      <button
                        onClick={() => { setPayModal(s); setPayAmount(''); setPayMode('Espèces'); setPayMotif('Scolarité') }}
                        title="Encaisser un versement"
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                    )}

                    {/* Bouton Modifier (selon perms) */}
                    {hasPerm('editStudents') && (
                      <button
                        onClick={() => openEdit(s)}
                        title="Modifier les informations"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}

                    {/* Bouton Supprimer (selon perms) */}
                    {hasPerm('editStudents') && (
                      <button
                        onClick={() => setDeleteModal({ open: true, student: s, deleting: false })}
                        title="Supprimer l'élève"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Créer / Modifier élève */}
      <Modal
        open={studentModal.open}
        onClose={() => setStudentModal({ open: false, editing: null })}
        title={studentModal.editing ? 'Modifier l’élève' : 'Nouvel élève'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitStudent} className="space-y-4">
          <Input
            label="Matricule *"
            value={form.matricule}
            onChange={e => setForm(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
            placeholder="Ex : CSE-2025-001"
            required
            autoFocus
            hint={studentModal.editing ? 'Modifiable si erreur de saisie initiale.' : 'Identifiant unique de l\'élève (manuel ou généré).'}
            className="font-mono tracking-widest uppercase"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))} required />
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
            hint="Cantine, transport, etc. — s'ajoute aux frais de scolarité de la classe."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStudentModal({ open: false, editing: null })}>Annuler</Button>
            <Button type="submit" loading={saving}>{studentModal.editing ? 'Enregistrer les modifications' : 'Inscrire l’élève'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation Suppression élève */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, student: null, deleting: false })}
        title="Supprimer l'élève"
        maxWidth="sm"
      >
        {deleteModal.student && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-sm text-red-800 dark:text-red-300">
              <p className="font-bold">Attention !</p>
              <p className="mt-1">
                Êtes-vous sûr de vouloir supprimer l'élève{' '}
                <strong>{deleteModal.student.nom} {deleteModal.student.prenoms}</strong> (Matricule :{' '}
                <span className="font-mono font-bold">{deleteModal.student.matricule}</span>) ?
              </p>
              {deleteModal.student.total_paye > 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  ℹ️ Cet élève a déjà effectué des versements ({fmt(deleteModal.student.total_paye)}). La suppression standard conservera la trace comptable de la caisse tout en retirant l'élève des listes actives.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteModal({ open: false, student: null, deleting: false })}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={deleteModal.deleting}
                onClick={() => handleDeleteStudent(false)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Encaisser un versement */}
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

      {/* Modal QR Code & Badge Élève */}
      {qrModalStudent && (
        <QrBadgeModal
          open={!!qrModalStudent}
          onClose={() => setQrModalStudent(null)}
          student={qrModalStudent}
          settings={settings}
        />
      )}
    </div>
  )
}
