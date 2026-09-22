import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt } from '@/lib/utils'
import { Plus, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormFields'
import toast from 'react-hot-toast'
import type { Class } from '@/types'

export default function Classes() {
  const { classes, students, hasPerm, loadAll } = useAppStore()
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes ({activeClasses.length})</h1>
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
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 relative">
              {hasPerm('editClasses') && (
                <button
                  onClick={() => openEdit(c)}
                  title="Modifier"
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-start justify-between mb-3 pr-8">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{c.nom}</h3>
                  <p className="text-xs text-gray-400">{c.niveau}</p>
                </div>
                <span className="text-2xl font-bold text-gray-200 dark:text-gray-700">{eleves.length}</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
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
                  <dt className="text-xs text-gray-400">Taux</dt>
                  <dd className="font-semibold text-primary-600">{taux}%</dd>
                </div>
              </dl>
              <div className="mt-3">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${taux}%` }} />
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
