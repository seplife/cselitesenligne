import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDateShort, cn } from '@/lib/utils'
import {
  Search, Plus, Wallet, Pencil, Trash2, QrCode as QrIcon,
  Printer, Download, FileSpreadsheet, FileText, X, Camera, User,
  ArrowDownAZ, ArrowUpZA, ArrowUpDown
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import { QrBadgeModal } from '@/components/QrBadgeModal'
import { exportClassStudentsXLSX, exportClassStudentsPDF, printClassStudents } from '@/lib/exports'
import toast from 'react-hot-toast'
import type { Student, StudentType } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  SOLDE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CREDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  NON_SOLDE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PARTIEL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  EN_RETARD: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

interface StudentFormState {
  matricule: string
  nom: string
  prenoms: string
  sexe: 'M' | 'F'
  student_type: StudentType
  date_naissance: string
  classe_id: string
  parent_nom: string
  parent_tel: string
  frais_additionnels: string
  remise: string
  photo: string
}

const EMPTY_FORM: StudentFormState = {
  matricule: '', nom: '', prenoms: '', sexe: 'M', student_type: 'AFFECTE_ETAT', date_naissance: '', classe_id: '', parent_nom: '', parent_tel: '', frais_additionnels: '0', remise: '0', photo: '',
}

// Fonction de redimensionnement/compression de la photo d'identité pour le stockage local léger
function processPhotoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 260
        let w = img.width
        let h = img.height

        if (w > h) {
          if (w > MAX_SIZE) {
            h = Math.round((h * MAX_SIZE) / w)
            w = MAX_SIZE
          }
        } else {
          if (h > MAX_SIZE) {
            w = Math.round((w * MAX_SIZE) / h)
            h = MAX_SIZE
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(ev.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        // Compression en JPEG 82% pour garder une image légère (<25 Ko)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = ev.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Students() {
  const { students, classes, settings, hasPerm, loadAll } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterClasse, setFilterClasse] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

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

  // État du tri alphabétique ('asc' = A-Z, 'desc' = Z-A, 'none' = ordre initial)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('asc')

  const toggleSortOrder = () => {
    setSortOrder(current => {
      if (current === 'asc') return 'desc'
      if (current === 'desc') return 'none'
      return 'asc'
    })
  }

  // Filtrage combiné et tri alphabétique (nom puis prénoms)
  const filtered = React.useMemo(() => {
    const list = students.filter(s => {
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
      if (filterType !== 'all' && (s.student_type || 'AFFECTE_ETAT') !== filterType) return false
      return true
    })

    if (sortOrder === 'asc') {
      return [...list].sort((a, b) => {
        const n = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        return n !== 0 ? n : a.prenoms.localeCompare(b.prenoms, 'fr', { sensitivity: 'base' })
      })
    }
    if (sortOrder === 'desc') {
      return [...list].sort((a, b) => {
        const n = b.nom.localeCompare(a.nom, 'fr', { sensitivity: 'base' })
        return n !== 0 ? n : b.prenoms.localeCompare(a.prenoms, 'fr', { sensitivity: 'base' })
      })
    }
    return list
  }, [students, search, filterStatut, filterClasse, filterType, sortOrder])

  // Nom de la classe actuellement sélectionnée pour les exports
  const selectedClasseNom = React.useMemo(() => {
    if (filterClasse === 'all') return 'Toutes les classes'
    const c = classes.find(x => x.id === filterClasse)
    return c ? c.nom : 'Classe'
  }, [filterClasse, classes])

  const [payReference, setPayReference] = useState('')
  const [allowCredit, setAllowCredit] = useState(false)

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
      student_type: s.student_type || 'AFFECTE_ETAT',
      date_naissance: s.date_naissance ?? '',
      classe_id: s.classe_id ?? '',
      parent_nom: s.parent_nom ?? '',
      parent_tel: s.parent_tel ?? '',
      frais_additionnels: String(s.frais_additionnels ?? 0),
      remise: String(s.remise ?? 0),
      photo: s.photo || '',
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
        student_type: form.student_type,
        date_naissance: form.date_naissance || null,
        classe_id: form.classe_id || null,
        parent_nom: form.parent_nom || null,
        parent_tel: form.parent_tel || null,
        frais_additionnels: Number(form.frais_additionnels) || 0,
        remise: Number(form.remise) || 0,
        photo: form.photo || null,
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

    const electronicModes = ['ORANGE MONEY', 'MTN MONEY', 'MOOV MONEY', 'WAVE', 'VIREMENT BANCAIRE', 'CHÈQUE']
    const isElectronic = electronicModes.some(m => m.toLowerCase() === payMode.toLowerCase())
    if (isElectronic && !payReference.trim()) {
      toast.error(`La référence ou numéro de transaction est obligatoire pour ${payMode}.`)
      return
    }

    setPaying(true)
    try {
      await api.post('/api/payments', {
        student_id: payModal.id,
        montant,
        mode: payMode,
        motif: payMotif,
        reference: payReference.trim() || undefined,
        allow_credit: allowCredit,
      })
      toast.success('Paiement enregistré.')
      setPayModal(null)
      setPayAmount('')
      setPayReference('')
      setAllowCredit(false)
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

          {/* Filtre Affectation */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Affectation :</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tous statuts</option>
              <option value="AFFECTE_ETAT">Affecté de l'État</option>
              <option value="NON_AFFECTE">Non-Affecté</option>
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
              <option value="all">Tous statuts financiers</option>
              <option value="SOLDE">Soldé</option>
              <option value="PARTIEL">Partiellement soldé</option>
              <option value="NON_SOLDE">Non soldé</option>
              <option value="CREDIT">Crédit</option>
            </select>
          </div>

          {/* Bouton de tri alphabétique */}
          <button
            type="button"
            onClick={toggleSortOrder}
            title={`Ordre alphabétique des élèves (Actuel : ${
              sortOrder === 'asc' ? 'A à Z' : sortOrder === 'desc' ? 'Z à A' : 'Ordre d\'enregistrement'
            })`}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none',
              sortOrder !== 'none'
                ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowDownAZ className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span>Nom : A → Z</span>
              </>
            ) : sortOrder === 'desc' ? (
              <>
                <ArrowUpZA className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span>Nom : Z → A</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <span>Nom : Initial</span>
              </>
            )}
          </button>

          {(search || filterClasse !== 'all' || filterStatut !== 'all' || filterType !== 'all' || sortOrder !== 'asc') && (
            <button
              onClick={() => {
                setSearch('')
                setFilterClasse('all')
                setFilterStatut('all')
                setFilterType('all')
                setSortOrder('asc')
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Tableau des élèves */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Matricule</th>
                <th
                  onClick={toggleSortOrder}
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 select-none group transition-colors"
                  title="Cliquer pour basculer le tri alphabétique (A-Z / Z-A / Initial)"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>Élève</span>
                    {sortOrder === 'asc' ? (
                      <ArrowDownAZ className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    ) : sortOrder === 'desc' ? (
                      <ArrowUpZA className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 opacity-60 group-hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">Statut Élève</th>
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
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
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
                    <div className="flex items-center gap-3">
                      {/* Photo d'identité miniature ou Initiales */}
                      {s.photo ? (
                        <img
                          src={s.photo}
                          alt={`${s.nom} ${s.prenoms}`}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.nom.charAt(0)}{s.prenoms.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div>
                          <span className="font-semibold">{s.nom}</span> {s.prenoms}
                          <span className="ml-2 text-xs text-gray-400 font-normal">({s.sexe})</span>
                        </div>
                        {s.parent_tel && (
                          <p className="text-xs text-gray-400">
                            {s.parent_nom ? `${s.parent_nom} — ` : ''}{s.parent_tel}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.student_type === 'AFFECTE_ETAT' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        Affecté État
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        Non-Affecté
                      </span>
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
          {/* Section Photo d'identité */}
          <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 shrink-0">
              {form.photo ? (
                <img src={form.photo} alt="Identité" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                Photo d'identité de l'élève
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/60 dark:text-primary-300 rounded-lg transition-colors border border-primary-200 dark:border-primary-800">
                  <Camera className="h-3.5 w-3.5" />
                  <span>{form.photo ? 'Changer la photo' : 'Importer une photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          const base64 = await processPhotoFile(file)
                          setForm(f => ({ ...f, photo: base64 }))
                          toast.success('Photo chargée avec succès.')
                        } catch {
                          toast.error('Erreur lors du traitement de l’image.')
                        }
                      }
                    }}
                  />
                </label>
                {form.photo && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, photo: '' }))}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  >
                    Supprimer la photo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400">Format JPEG ou PNG (recadré et optimisé automatiquement)</p>
            </div>
          </div>

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
            label="Statut d'affectation officiel *"
            value={form.student_type}
            onChange={e => setForm(f => ({ ...f, student_type: e.target.value as StudentType }))}
            options={[
              { value: 'AFFECTE_ETAT', label: "Affecté de l'État (Barème subventionné : 35 000 à 52 000 FCFA)" },
              { value: 'NON_AFFECTE', label: "Non-Affecté (Barème plein : 100 000 à 152 000 FCFA)" },
            ]}
          />
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Frais additionnels (FCFA)"
              type="number"
              min={0}
              value={form.frais_additionnels}
              onChange={e => setForm(f => ({ ...f, frais_additionnels: e.target.value }))}
              hint="Cantine, transport, etc."
            />
            <Input
              label="Remise / Bourse (FCFA)"
              type="number"
              min={0}
              value={form.remise}
              onChange={e => setForm(f => ({ ...f, remise: e.target.value }))}
              hint="Déduction accordée"
            />
          </div>
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm flex items-center gap-3">
              {payModal.photo ? (
                <img src={payModal.photo} alt={payModal.nom} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {payModal.nom.charAt(0)}{payModal.prenoms.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-white">{payModal.nom} {payModal.prenoms}</p>
                <p className="text-xs text-gray-500">{payModal.matricule} — {payModal.classe_nom ?? 'Sans classe'}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Dû : <strong>{fmt(payModal.total_du)}</strong> · Payé : <strong className="text-green-600">{fmt(payModal.total_paye)}</strong> · Reste : <strong className="text-red-500">{fmt(payModal.total_du - payModal.total_paye)}</strong>
                </p>
              </div>
            </div>
            <Input label="Montant (FCFA)" type="number" min={1} value={payAmount} onChange={e => setPayAmount(e.target.value)} required autoFocus />
            <Select
              label="Mode de paiement"
              value={payMode}
              onChange={e => setPayMode(e.target.value)}
              options={['Espèces', 'Orange Money', 'MTN Money', 'Moov Money', 'Wave', 'Virement bancaire', 'Chèque']}
            />
            {['orange money', 'mtn money', 'moov money', 'wave', 'virement bancaire', 'chèque'].includes(payMode.toLowerCase()) && (
              <Input
                label="Référence / N° de transaction *"
                value={payReference}
                onChange={e => setPayReference(e.target.value)}
                placeholder="Ex : CI260926.1432.A84920"
                required
              />
            )}
            <Input label="Motif" value={payMotif} onChange={e => setPayMotif(e.target.value)} />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="allowCreditCheck"
                checked={allowCredit}
                onChange={e => setAllowCredit(e.target.checked)}
                className="rounded text-primary-600"
              />
              <label htmlFor="allowCreditCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Autoriser le trop-perçu (génère un solde créditeur)
              </label>
            </div>
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
