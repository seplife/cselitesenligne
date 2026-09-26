import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt } from '@/lib/utils'
import { Plus, Pencil, Printer, FileSpreadsheet, FileText, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormFields'
import { exportClassStudentsXLSX, exportClassStudentsPDF, printClassStudents } from '@/lib/exports'
import toast from 'react-hot-toast'
import type { Class } from '@/types'

export default function Classes() {
  const { classes, students, settings, hasPerm, loadAll } = useAppStore()
  const activeClasses = classes.filter(c => c.actif)

  const [modal, setModal] = useState<{ open: boolean; editing: Class | null }>({ open: false, editing: null })
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('')
  const [frais, setFrais] = useState('0')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setNom(''); setNiveau(''); setFrais('0')
    setModal({ open: true, editing: null })
  }

  function openEdit(c: Class) {
    setNom(c.nom); setNiveau(c.niveau); setFrais(String(c.frais))
    setModal({ open: true, editing: c })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || !niveau.trim()) { toast.error('Nom et niveau requis.'); return }
    setSaving(true)
    try {
      const payload = { nom: nom.trim(), niveau: niveau.trim(), frais: Number(frais) || 0 }
      if (modal.editing) {
        await api.put(`/api/classes/${modal.editing.id}`, payload)
        toast.success('Classe mise à jour.')
      } else {
        await api.post('/api/classes', payload)
        toast.success('Classe créée.')
      }
      setModal({ open: false, editing: null })
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  function handlePrintClass(classeNom: string, classId: string) {
    const eleves = students.filter(s => s.actif && s.classe_id === classId)
    if (eleves.length === 0) {
      toast.error(`Aucun élève inscrit en ${classeNom}.`)
      return
    }
    printClassStudents(classeNom, eleves, settings || undefined)
  }

  function handleExportClassXLSX(classeNom: string, classId: string) {
    const eleves = students.filter(s => s.actif && s.classe_id === classId)
    if (eleves.length === 0) {
      toast.error(`Aucun élève inscrit en ${classeNom}.`)
      return
    }
    exportClassStudentsXLSX(classeNom, eleves, settings?.annee_scolaire)
    toast.success(`Liste ${classeNom} exportée en Excel.`)
  }

  function handleExportClassPDF(classeNom: string, classId: string) {
    const eleves = students.filter(s => s.actif && s.classe_id === classId)
    if (eleves.length === 0) {
      toast.error(`Aucun élève inscrit en ${classeNom}.`)
      return
    }
    exportClassStudentsPDF(classeNom, eleves, settings || undefined)
    toast.success(`Liste ${classeNom} exportée en PDF.`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes ({activeClasses.length})</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gérez les classes, imprimez ou téléchargez les listes des élèves inscrits
          </p>
        </div>
        {hasPerm('editClasses') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Nouvelle classe</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeClasses.length === 0 ? (
          <p className="text-gray-400 col-span-3">Aucune classe active.</p>
        ) : activeClasses.map(c => {
          const eleves = students.filter(s => s.actif && s.classe_id === c.id)
          const soldes = eleves.filter(s => s.statut === 'SOLDE' || s.statut === 'CREDIT').length
          const encaisse = eleves.reduce((a, s) => a + s.total_paye, 0)
          const attendu = eleves.reduce((a, s) => a + s.total_du, 0)
          const taux = attendu > 0 ? Math.round((encaisse / attendu) * 100) : 0

          return (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 relative flex flex-col justify-between">
              {hasPerm('editClasses') && (
                <button
                  onClick={() => openEdit(c)}
                  title="Modifier"
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}

              <div>
                <div className="flex items-start justify-between mb-3 pr-8">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{c.nom}</h3>
                    <p className="text-xs text-gray-400 font-medium">Niveau : {c.niveau}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">{eleves.length}</span>
                    <span className="text-[10px] text-gray-400 block -mt-1">élève(s)</span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <dt className="text-xs text-gray-400">Frais de scolarité</dt>
                    <dd className="font-semibold text-gray-700 dark:text-gray-200">{fmt(c.frais)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Soldés</dt>
                    <dd className="font-semibold text-green-600">{soldes}/{eleves.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Encaissé</dt>
                    <dd className="font-semibold text-gray-700 dark:text-gray-200">{fmt(encaisse)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Taux recouvrement</dt>
                    <dd className="font-semibold text-primary-600">{taux}%</dd>
                  </div>
                </dl>

                <div className="mb-4">
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${taux}%` }} />
                  </div>
                </div>
              </div>

              {/* Barre d'action Téléchargement / Impression de la classe */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-400 text-[11px] font-medium">Liste des inscrits :</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePrintClass(c.nom, c.id)}
                    title={`Imprimer la liste officielle de ${c.nom}`}
                    className="p-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 font-medium text-xs"
                  >
                    <Printer className="h-3.5 w-3.5 text-primary-600" />
                    <span>Imprimer</span>
                  </button>
                  <button
                    onClick={() => handleExportClassXLSX(c.nom, c.id)}
                    title={`Télécharger Excel de ${c.nom}`}
                    className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1 font-medium text-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportClassPDF(c.nom, c.id)}
                    title={`Télécharger PDF de ${c.nom}`}
                    className="p-1.5 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 font-medium text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Modifier la classe' : 'Nouvelle classe'} maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nom de la classe" value={nom} onChange={e => setNom(e.target.value)} required autoFocus />
          <Input label="Niveau" value={niveau} onChange={e => setNiveau(e.target.value)} required hint="Ex : 6e, 5e, 2nde, 1ère, Tle" />
          <Input
            label="Frais de scolarité (FCFA)"
            type="number"
            min={0}
            value={frais}
            onChange={e => setFrais(e.target.value)}
            hint="Modifier ce montant ne change pas le total dû des élèves déjà inscrits."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, editing: null })}>Annuler</Button>
            <Button type="submit" loading={saving}>{modal.editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
