import React, { useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, API_URL } from '@/lib/apiClient'
import { fmt, fmtDateShort } from '@/lib/utils'
import { QrCode, Camera, Search, User, X } from 'lucide-react'
import QRCode from 'qrcode'
import type { Student, Payment } from '@/types'

const API = API_URL

interface StudentWithPayments extends Student {
  payments?: Payment[]
}

function photoSrc(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API}${url}`
}

export default function QrScanner() {
  const { students } = useAppStore()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<StudentWithPayments | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [qrModalStudent, setQrModalStudent] = useState<Student | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── Lookup par matricule ou token ────────────────────────────────────────
  const lookup = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      // D'abord chercher dans le store local
      const local = students.find(s => s.token === trimmed || s.matricule === trimmed)
      if (local) {
        // Charger aussi les paiements via API
        try {
          const full = await api.get<StudentWithPayments>(`/api/students/${local.id}`)
          setFound(full)
        } catch {
          setFound(local)
        }
      } else {
        // Chercher via l'endpoint QR public
        try {
          const full = await api.get<StudentWithPayments>(`/api/students/qr/${encodeURIComponent(trimmed)}`)
          setFound(full)
        } catch {
          setFound(null)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [students])

  // ─── Générer le QR code d'un élève ───────────────────────────────────────
  const openQrModal = async (s: Student) => {
    setQrModalStudent(s)
    const url = await QRCode.toDataURL(s.matricule, {
      width: 300,
      margin: 2,
      color: { dark: '#7b0000', light: '#ffffff' },
    })
    setQrDataUrl(url)
  }

  const statColor = (s: string) =>
    s === 'SOLDE' ? 'bg-green-100 text-green-700' :
    s === 'CREDIT' ? 'bg-blue-100 text-blue-700' :
    'bg-red-100 text-red-700'

  const statLabel = (s: string) =>
    s === 'SOLDE' ? 'Soldé ✓' : s === 'CREDIT' ? 'Crédit' : 'Non soldé'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <QrCode className="h-6 w-6 text-red-700" /> Scanner QR / Recherche Élève
      </h1>

      {/* ─── Champ de saisie du matricule ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700 space-y-4">
        <p className="text-sm text-gray-500">
          Saisissez le <strong>matricule</strong> ou scannez le QR code de l'élève :
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup(query)}
            placeholder="Ex: CSE-2025-001"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm font-mono"
            autoFocus
          />
          <button
            onClick={() => lookup(query)}
            disabled={loading || !query.trim()}
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? '…' : 'Chercher'}
          </button>
          {found !== undefined && (
            <button
              onClick={() => { setFound(undefined); setQuery('') }}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Effacer"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Résultat introuvable ─── */}
      {found === null && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
          ❌ Aucun élève trouvé avec ce matricule ou token.
        </div>
      )}

      {/* ─── Fiche élève complète ─── */}
      {found && <StudentCard student={found} onQr={() => openQrModal(found)} statColor={statColor} statLabel={statLabel} />}

      {/* ─── Modal QR Code ─── */}
      {qrModalStudent && (
        <QrModal student={qrModalStudent} qrDataUrl={qrDataUrl} onClose={() => setQrModalStudent(null)} />
      )}
    </div>
  )
}

// ─── Composant : Fiche élève complète ────────────────────────────────────────
function StudentCard({
  student,
  onQr,
  statColor,
  statLabel,
}: {
  student: StudentWithPayments
  onQr: () => void
  statColor: (s: string) => string
  statLabel: (s: string) => string
}) {
  const photo = photoSrc(student.photo_url)
  const reste = student.total_du - student.total_paye

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* En-tête avec photo */}
      <div className="bg-gradient-to-r from-red-800 to-red-700 p-6 flex items-center gap-5">
        {photo ? (
          <img
            src={photo}
            alt="Photo élève"
            className="w-24 h-28 object-cover rounded-xl border-4 border-white shadow-lg"
          />
        ) : (
          <div className="w-24 h-28 bg-white/20 rounded-xl flex items-center justify-center border-4 border-white/50">
            <User className="h-12 w-12 text-white/70" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-red-200 font-mono">{student.matricule}</p>
          <h2 className="text-2xl font-extrabold text-white leading-tight mt-0.5">
            {student.nom}
          </h2>
          <p className="text-red-100 text-lg">{student.prenoms}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${statColor(student.statut)}`}>
              {statLabel(student.statut)}
            </span>
            <span className="text-xs text-red-200">
              {student.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* ─── Infos personnelles ─── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Informations personnelles
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="Classe" value={student.classe_nom ?? '—'} />
            <InfoRow label="Date de naissance" value={student.date_naissance ? fmtDateShort(student.date_naissance) : '—'} />
            <InfoRow label="Parent / Tuteur" value={student.parent_nom ?? '—'} />
            <InfoRow label="Téléphone parent" value={student.parent_tel ?? '—'} />
            <InfoRow label="Date d'inscription" value={fmtDateShort(student.date_inscription)} />
            <InfoRow label="Statut" value={student.actif ? 'Actif' : 'Inactif'} />
          </dl>
        </section>

        {/* ─── Situation financière ─── */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Situation financière
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <FinanceStat label="Total dû" value={fmt(student.total_du)} color="text-gray-800 dark:text-gray-100" />
            <FinanceStat label="Payé" value={fmt(student.total_paye)} color="text-green-600" />
            <FinanceStat label="Reste" value={fmt(reste)} color={reste > 0 ? 'text-red-600' : 'text-green-600'} />
          </div>
          {student.frais_additionnels > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Dont frais additionnels : {fmt(student.frais_additionnels)}
            </p>
          )}
        </section>

        {/* ─── Historique paiements ─── */}
        {student.payments && student.payments.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Derniers paiements
            </h3>
            <div className="space-y-1.5">
              {student.payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-gray-600 dark:text-gray-300">{fmtDateShort(p.date)} — {p.motif}</span>
                  <span className="font-semibold text-green-600">{fmt(p.montant)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Bouton QR Code ─── */}
        <button
          onClick={onQr}
          className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors"
        >
          <QrCode className="h-5 w-5" />
          Afficher / Imprimer le QR Code
        </button>
      </div>
    </div>
  )
}

// ─── Composant : Modal QR Code ─────────────────────────────────────────────
function QrModal({
  student,
  qrDataUrl,
  onClose,
}: {
  student: Student
  qrDataUrl: string
  onClose: () => void
}) {
  const photo = photoSrc(student.photo_url)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4"
        onClick={e => e.stopPropagation()}
        id="qr-print-zone"
      >
        <div className="flex items-center justify-center gap-3 border-b pb-4">
          {photo && <img src={photo} alt="" className="w-14 h-16 object-cover rounded-lg shadow" />}
          <div className="text-left">
            <p className="font-extrabold text-gray-900 leading-tight">{student.nom} {student.prenoms}</p>
            <p className="text-xs text-gray-500 font-mono">{student.matricule}</p>
            <p className="text-xs text-gray-500">{student.classe_nom ?? '—'}</p>
          </div>
        </div>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" className="mx-auto w-48 h-48 rounded-xl border border-gray-200" />
        )}
        <p className="text-xs text-gray-400">Scannez pour afficher la fiche de l'élève</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const w = window.open('', '_blank')
              if (!w) return
              w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:20px">
                ${photo ? `<img src="${photo}" style="width:80px;height:96px;object-fit:cover;border-radius:8px;margin-bottom:8px"><br>` : ''}
                <strong>${student.nom} ${student.prenoms}</strong><br>
                <small>${student.matricule} — ${student.classe_nom ?? ''}</small><br><br>
                <img src="${qrDataUrl}" style="width:240px;height:240px"><br>
                <small>Scannez pour afficher la fiche</small>
              </body></html>`)
              w.document.close()
              w.print()
            }}
            className="flex-1 py-2 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 text-sm"
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-800 dark:text-gray-100 font-medium">{value}</dd>
    </div>
  )
}

function FinanceStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-bold text-lg ${color}`}>{value}</p>
    </div>
  )
}
