import React, { useState, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt } from '@/lib/utils'
import { QrCode, Camera } from 'lucide-react'

export default function QrScanner() {
  const { students } = useAppStore()
  const [token, setToken] = useState('')
  const [found, setFound] = useState<typeof students[0] | null | undefined>(undefined)

  function lookup(t: string) {
    const q = t.trim()
    if (!q) return
    const s = students.find(s => s.token === q || s.matricule === q)
    setFound(s ?? null)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <QrCode className="h-6 w-6 text-primary-600" /> Scanner QR / Token
      </h1>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700 space-y-4">
        <p className="text-sm text-gray-500">Entrez le token ou le matricule de l'élève :</p>
        <div className="flex gap-2">
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup(token)}
            placeholder="Token ou matricule…"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => lookup(token)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Chercher
          </button>
        </div>

        {found === null && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            Aucun élève trouvé avec ce token/matricule.
          </div>
        )}

        {found && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 space-y-2">
            <p className="font-bold text-lg text-gray-900 dark:text-white">{found.nom} {found.prenoms}</p>
            <p className="text-sm text-gray-500">Matricule : <span className="font-mono">{found.matricule}</span></p>
            <p className="text-sm text-gray-500">Classe : {found.classe_nom ?? '—'}</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <p className="text-xs text-gray-400">Dû</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{fmt(found.total_du)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Payé</p>
                <p className="font-semibold text-green-600">{fmt(found.total_paye)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Reste</p>
                <p className="font-semibold text-red-500">{fmt(found.total_du - found.total_paye)}</p>
              </div>
            </div>
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                found.statut === 'SOLDE' ? 'bg-green-100 text-green-700' :
                found.statut === 'CREDIT' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {found.statut === 'SOLDE' ? 'Soldé' : found.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
