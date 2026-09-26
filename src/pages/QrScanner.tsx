import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort } from '@/lib/utils'
import {
  QrCode, Camera, CameraOff, Search, User, School, Phone,
  CreditCard, CheckCircle2, AlertCircle, Calendar, ArrowRight, X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { QrBadgeModal } from '@/components/QrBadgeModal'
import type { Student, Staff } from '@/types'
import toast from 'react-hot-toast'

export default function QrScanner() {
  const { students, staff, payments, staffPayments, settings } = useAppStore()
  const [query, setQuery] = useState('')
  const [foundStudent, setFoundStudent] = useState<Student | null>(null)
  const [foundStaff, setFoundStaff] = useState<Staff | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [badgeModalStudent, setBadgeModalStudent] = useState<Student | null>(null)
  const [badgeModalStaff, setBadgeModalStaff] = useState<Staff | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Analyse et recherche de l'élève ou du personnel
  function handleScanLookup(input: string) {
    const raw = input.trim()
    if (!raw) return

    setNotFound(false)
    setFoundStudent(null)
    setFoundStaff(null)

    // Cas 1 : Données JSON issues du QR Code généré
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.type === 'student' && (parsed.id || parsed.matricule || parsed.token)) {
          const s = students.find(
            x => (parsed.id && x.id === parsed.id) ||
                 (parsed.matricule && x.matricule.toUpperCase() === parsed.matricule.toUpperCase()) ||
                 (parsed.token && x.token === parsed.token)
          )
          if (s) {
            setFoundStudent(s)
            toast.success(`Élève identifié : ${s.nom} ${s.prenoms}`)
            return
          }
        } else if (parsed.type === 'staff' && (parsed.id || parsed.matricule)) {
          const st = staff.find(
            x => (parsed.id && x.id === parsed.id) ||
                 (parsed.matricule && (x.matricule || '').toUpperCase() === parsed.matricule.toUpperCase())
          )
          if (st) {
            setFoundStaff(st)
            toast.success(`Personnel identifié : ${st.nom} ${st.prenoms}`)
            return
          }
        }
      } catch {
        // En cas d'échec de parsing JSON, on poursuit la recherche textuelle
      }
    }

    const q = raw.toUpperCase()

    // Recherche dans les élèves (matricule, token, ou nom complet)
    const s = students.find(
      x => x.matricule.toUpperCase() === q ||
           x.token === raw ||
           x.id === raw ||
           `${x.nom} ${x.prenoms}`.toUpperCase().includes(q)
    )
    if (s) {
      setFoundStudent(s)
      toast.success(`Élève identifié : ${s.nom} ${s.prenoms}`)
      return
    }

    // Recherche dans le personnel (matricule, id, ou nom complet)
    const st = staff.find(
      x => (x.matricule && x.matricule.toUpperCase() === q) ||
           x.id === raw ||
           `${x.nom} ${x.prenoms}`.toUpperCase().includes(q)
    )
    if (st) {
      setFoundStaff(st)
      toast.success(`Personnel identifié : ${st.nom} ${st.prenoms}`)
      return
    }

    setNotFound(true)
    toast.error('Aucune correspondance trouvée.')
  }

  // Gestion de la caméra vidéo
  async function toggleCamera() {
    if (cameraActive) {
      stopCamera()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraActive(true)
        toast.success('Caméra activée. Pointez vers le QR code.')
      } catch (err) {
        console.error('Erreur accès caméra', err)
        toast.error('Impossible d’accéder à la caméra. Vérifiez les autorisations du navigateur.')
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Paiements de l'élève scanné
  const elevePaiements = foundStudent
    ? payments.filter(p => !p.annule && p.student_id === foundStudent.id).slice(0, 5)
    : []

  // Paiements de salaire du personnel scanné
  const staffPaies = foundStaff
    ? staffPayments.filter(p => p.staff_id === foundStaff.id).slice(0, 5)
    : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <QrCode className="h-7 w-7 text-primary-600" />
          <span>Scanner QR Code & Identification</span>
        </h1>
        <p className="text-sm text-gray-500">
          Scannez le badge d’un élève ou d’un membre du personnel pour afficher sa fiche complète.
        </p>
      </div>

      {/* Boîte de recherche & Scanner */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScanLookup(query)}
              placeholder="Saisir ou scanner : Matricule, Token, ou données QR…"
              autoFocus
              className="w-full pl-11 pr-9 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setNotFound(false); setFoundStudent(null); setFoundStaff(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={() => handleScanLookup(query)}>
            Vérifier
          </Button>
          <button
            onClick={toggleCamera}
            title={cameraActive ? 'Désactiver la caméra' : 'Activer la caméra pour scanner'}
            className={`p-2.5 rounded-xl border transition-colors ${
              cameraActive
                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
            }`}
          >
            {cameraActive ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </button>
        </div>

        {/* Vue caméra en direct */}
        {cameraActive && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-60 border-2 border-primary-500 shadow-inner flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-white/40 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-dashed border-primary-400 rounded-2xl animate-pulse" />
            </div>
            <p className="absolute bottom-2 text-xs text-white/80 bg-black/60 px-3 py-1 rounded-full">
              Pointez la caméra vers le code QR
            </p>
          </div>
        )}

        {/* Message non trouvé */}
        {notFound && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Aucun dossier trouvé</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Vérifiez le matricule ou le token scanné. Assurez-vous que l'élève ou le personnel est bien enregistré dans l'application.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Résultat : FICHE ÉLÈVE COMPLÈTE */}
      {foundStudent && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-md border border-emerald-200 dark:border-emerald-800 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-extrabold text-xl">
                {foundStudent.nom.charAt(0)}{foundStudent.prenoms.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md">
                    {foundStudent.matricule}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    foundStudent.statut === 'SOLDE'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : foundStudent.statut === 'CREDIT'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {foundStudent.statut === 'SOLDE' ? 'SOLDÉ' : foundStudent.statut === 'CREDIT' ? 'CRÉDIT' : 'NON SOLDÉ'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {foundStudent.nom} {foundStudent.prenoms}
                </h3>
                <p className="text-xs text-gray-500">
                  Classe : <strong className="text-gray-800 dark:text-gray-200">{foundStudent.classe_nom || 'Non affecté'}</strong> · Sexe : {foundStudent.sexe === 'M' ? 'Masculin' : 'Féminin'}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              icon={<QrCode className="h-4 w-4" />}
              onClick={() => setBadgeModalStudent(foundStudent)}
            >
              Badge & QR
            </Button>
          </div>

          {/* Situation financière de l'élève */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <span className="text-xs text-gray-400 block font-medium">Total Dû</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {fmt(foundStudent.total_du)}
              </span>
            </div>
            <div className="text-center border-x border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-400 block font-medium">Total Payé</span>
              <span className="text-base font-bold text-green-600">
                {fmt(foundStudent.total_paye)}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-400 block font-medium">Reste à Payer</span>
              <span className="text-base font-bold text-red-500">
                {fmt(foundStudent.total_du - foundStudent.total_paye)}
              </span>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">État Civil</p>
              <p className="text-gray-800 dark:text-gray-200">
                Date de naissance : <strong>{foundStudent.date_naissance || 'Non renseignée'}</strong>
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                Inscrit le : <strong>{fmtDateShort(foundStudent.date_inscription)}</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Parent / Tuteur</p>
              <p className="text-gray-800 dark:text-gray-200">
                Nom : <strong>{foundStudent.parent_nom || 'Non renseigné'}</strong>
              </p>
              {foundStudent.parent_tel ? (
                <a
                  href={`tel:${foundStudent.parent_tel}`}
                  className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-semibold"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{foundStudent.parent_tel}</span>
                </a>
              ) : (
                <p className="text-xs text-gray-400">Aucun contact enregistré</p>
              )}
            </div>
          </div>

          {/* Historique des derniers versements */}
          {elevePaiements.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Derniers versements enregistrés ({elevePaiements.length})
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-xs">
                {elevePaiements.map(p => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between bg-white dark:bg-gray-900">
                    <div>
                      <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                        {p.recu_numero}
                      </span>
                      <span className="text-gray-400 ml-2">({p.mode} · {p.motif})</span>
                      <p className="text-[10px] text-gray-400">{fmtDateShort(p.date)}</p>
                    </div>
                    <span className="font-bold text-green-600 text-sm">
                      {fmt(p.montant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Résultat : FICHE PERSONNEL COMPLÈTE */}
      {foundStaff && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-md border border-primary-200 dark:border-primary-800 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-extrabold text-xl">
                {foundStaff.nom.charAt(0)}{foundStaff.prenoms.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md">
                    {foundStaff.matricule || 'PER'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    foundStaff.actif ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {foundStaff.actif ? 'ACTIF' : 'INACTIF'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {foundStaff.nom} {foundStaff.prenoms}
                </h3>
                <p className="text-xs text-gray-500">
                  Poste : <strong className="text-gray-800 dark:text-gray-200">{foundStaff.poste || 'Personnel'}</strong>
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              icon={<QrCode className="h-4 w-4" />}
              onClick={() => setBadgeModalStaff(foundStaff)}
            >
              Badge & QR
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Coordonnées Professionnelles</p>
              {foundStaff.telephone ? (
                <a
                  href={`tel:${foundStaff.telephone}`}
                  className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-semibold"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{foundStaff.telephone}</span>
                </a>
              ) : (
                <p className="text-xs text-gray-400">Aucun numéro de téléphone</p>
              )}
              <p className="text-gray-800 dark:text-gray-200 text-xs">
                Embauché le : <strong>{fmtDateShort(foundStaff.date_embauche)}</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rémunération</p>
              <p className="text-gray-800 dark:text-gray-200">
                Salaire de base : <strong className="text-primary-600 font-bold">{fmt(foundStaff.salaire_base)}</strong>
              </p>
              {foundStaff.rib && (
                <p className="text-xs text-gray-500 font-mono">
                  RIB : {foundStaff.rib}
                </p>
              )}
            </div>
          </div>

          {/* Fiches de paie récentes */}
          {staffPaies.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Dernières fiches de paie ({staffPaies.length})
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-xs">
                {staffPaies.map(p => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between bg-white dark:bg-gray-900">
                    <div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Mois : {p.mois}</span>
                      <span className="text-gray-400 ml-2">({p.mode})</span>
                      <p className="text-[10px] text-gray-400">{fmtDateShort(p.date_paiement)}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {fmt(p.salaire_net)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Badge Élève */}
      {badgeModalStudent && (
        <QrBadgeModal
          open={!!badgeModalStudent}
          onClose={() => setBadgeModalStudent(null)}
          student={badgeModalStudent}
          settings={settings}
        />
      )}

      {/* Modal Badge Personnel */}
      {badgeModalStaff && (
        <QrBadgeModal
          open={!!badgeModalStaff}
          onClose={() => setBadgeModalStaff(null)}
          staff={badgeModalStaff}
          settings={settings}
        />
      )}
    </div>
  )
}
