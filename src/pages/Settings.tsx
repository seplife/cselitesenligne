import React, { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { api } from '@/lib/apiClient'
import { fmt } from '@/lib/utils'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import type { Settings as SettingsType } from '@/types'

export default function Settings() {
  const { settings, loadAll } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = React.useState<Partial<SettingsType>>(settings ?? {})

  React.useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (!settings) return <p className="text-gray-400">Chargement…</p>

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/api/settings', {
        school_name: form.school_name,
        sigle: form.sigle,
        ville: form.ville,
        telephone: form.telephone,
        email: form.email,
        annee_scolaire: form.annee_scolaire,
        taux_horaire_vacataire: form.taux_horaire_vacataire,
        seuil_alerte_montant: form.seuil_alerte_montant,
      })
      await loadAll()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function field(label: string, key: keyof SettingsType, type = 'text') {
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input
          type={type}
          value={(form[key] as string | number) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-gray-500" /> Paramètres
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Informations de l'école</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Nom de l\'école', 'school_name')}
          {field('Sigle', 'sigle')}
          {field('Ville', 'ville')}
          {field('Téléphone', 'telephone')}
          {field('Email', 'email', 'email')}
          {field('Année scolaire', 'annee_scolaire')}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Paramètres financiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Taux horaire vacataire (FCFA)', 'taux_horaire_vacataire', 'number')}
          {field('Seuil alerte montant (FCFA)', 'seuil_alerte_montant', 'number')}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        <Save className="h-4 w-4" />
        {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  )
}
