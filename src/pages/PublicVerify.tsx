import React from 'react'
import { CheckCircle2, AlertCircle, School, Phone, Calendar, ArrowLeft, ShieldCheck } from 'lucide-react'
import { fmt } from '@/lib/utils'

interface PublicVerifyProps {
  data: {
    t?: 's' | 'p' // student or staff
    m?: string   // matricule
    n?: string   // nom & prenoms
    c?: string   // classe ou poste
    s?: string   // statut
    tok?: string // token
    u?: string   // urgence / tel
    d?: string   // date de naissance
    photo?: string
    school?: string
    annee?: string
  }
  onClose: () => void
}

export default function PublicVerify({ data, onClose }: PublicVerifyProps) {
  const isStudent = data.t !== 'p'

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-primary-950 to-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30">
        {/* Bandeau officiel de vérification */}
        <div className="bg-emerald-600 text-white p-4 text-center space-y-1 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm mb-1">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-extrabold uppercase tracking-wide">
            Vérification Officielle
          </h2>
          <p className="text-xs text-emerald-100 font-medium">
            {data.school || 'Collège Privé Saint Élie (CSE DIVO)'}
          </p>
          <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 uppercase tracking-wider mt-1">
            Badge Authentique & Validé ✓
          </span>
        </div>

        {/* Corps de la fiche */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center text-center space-y-2">
            {data.photo ? (
              <img
                src={data.photo}
                alt={data.n || 'Photo'}
                className="w-24 h-28 rounded-2xl object-cover border-4 border-emerald-500 shadow-md bg-gray-100"
              />
            ) : (
              <div className="w-24 h-28 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-dashed border-emerald-400 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-2xl shadow-inner">
                {data.n ? data.n.charAt(0) : 'ID'}
              </div>
            )}

            <div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {data.m || 'MATRICULE'}
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1.5 leading-snug">
                {data.n || 'Nom de la personne'}
              </h3>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {isStudent ? `Classe : ${data.c || 'Non renseignée'}` : `Poste : ${data.c || 'Personnel'}`}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 bg-gray-50/50 dark:bg-gray-800/40 text-sm space-y-2">
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gray-500">Statut scolaire / fonction :</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {data.s || 'INSCRIT'}
              </span>
            </div>
            {data.d && (
              <div className="flex justify-between py-1.5">
                <span className="text-xs text-gray-500">Date de naissance :</span>
                <span className="font-medium">{data.d}</span>
              </div>
            )}
            {data.u && (
              <div className="flex justify-between py-1.5">
                <span className="text-xs text-gray-500">Contact d'urgence / parent :</span>
                <a href={`tel:${data.u}`} className="font-bold text-primary-600 hover:underline">
                  {data.u}
                </a>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gray-500">Année de validité :</span>
              <span className="font-mono text-xs font-bold">{data.annee || '2025-2026'}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700 font-semibold text-sm transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Accéder à l'application GesFinance</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/70 p-3 text-center border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
          Système de gestion et certification des élèves CSE DIVO
        </div>
      </div>
    </div>
  )
}
