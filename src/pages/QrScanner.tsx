import React, { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useAppStore } from '@/store/appStore'
import { fmt, fmtDateShort } from '@/lib/utils'
import {
  QrCode, Camera, CameraOff, Search, User, School, Phone,
  CreditCard, CheckCircle2, AlertCircle, Calendar, ArrowRight, X,
  UploadCloud, Volume2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { QrBadgeModal } from '@/components/QrBadgeModal'
import type { Student, Staff } from '@/types'
import toast from 'react-hot-toast'

// Fonction pour émettre un bip de confirmation lors d'un scan réussi
function playSuccessBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime) // Note La5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.15)
  } catch {
    // Si l'audio n'est pas autorisé par l'utilisateur, continuer sans son
  }
}

export default function QrScanner() {
  const { students, staff, payments, staffPayments, settings } = useAppStore()
  const [query, setQuery] = useState('')
  const [foundStudent, setFoundStudent] = useState<Student | null>(null)
  const [foundStaff, setFoundStaff] = useState<Staff | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [badgeModalStudent, setBadgeModalStudent] = useState<Student | null>(null)
  const [badgeModalStaff, setBadgeModalStaff] = useState<Staff | null>(null)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Traitement d'un texte décodé ou saisi
  function handleScanLookup(input: string) {
    let raw = input.trim()
    if (!raw) return

    setNotFound(false)

    // Si le scan est une URL (ex: https://domaine.com/?verify=%7B...%7D)
    if (raw.includes('?verify=') || raw.includes('&verify=')) {
      try {
        const urlObj = new URL(raw, window.location.origin)
        const vParam = urlObj.searchParams.get('verify')
        if (vParam) raw = vParam
      } catch {
        const match = raw.match(/[?&]verify=([^&#]+)/)
        if (match && match[1]) {
          try { raw = decodeURIComponent(match[1]) } catch {}
        }
      }
    } else if (raw.includes('?qr=') || raw.includes('&qr=')) {
      try {
        const urlObj = new URL(raw, window.location.origin)
        const qParam = urlObj.searchParams.get('qr')
        if (qParam) raw = qParam
      } catch {}
    }

    // Cas 1 : Données JSON
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw)
        // Format payload 't' = 's' (student) ou 'type' = 'student'
        const isStud = parsed.t === 's' || parsed.type === 'student'
        const isStf = parsed.t === 'p' || parsed.type === 'staff'

        if (isStud) {
          const s = students.find(
            x => (parsed.id && x.id === parsed.id) ||
                 (parsed.m && x.matricule.toUpperCase() === parsed.m.toUpperCase()) ||
                 (parsed.matricule && x.matricule.toUpperCase() === parsed.matricule.toUpperCase()) ||
                 (parsed.tok && x.token === parsed.tok)
          )
          if (s) {
            playSuccessBeep()
            setFoundStudent(s)
            setFoundStaff(null)
            toast.success(`Élève identifié : ${s.nom} ${s.prenoms}`)
            return
          } else if (parsed.m || parsed.n) {
            // Créer un objet virtuel d'affichage si l'élève n'est pas dans la session locale
            const pseudoStudent: Student = {
              id: parsed.id || 'scan-temp',
              matricule: parsed.m || parsed.matricule || 'N/A',
              nom: parsed.n ? parsed.n.split(' ')[0] : 'ÉLÈVE',
              prenoms: parsed.n ? parsed.n.split(' ').slice(1).join(' ') : '',
              sexe: 'M',
              classe_nom: parsed.c || parsed.classe || 'Non renseigné',
              statut: (parsed.s === 'SOLDÉ' ? 'SOLDE' : parsed.s === 'CRÉDIT' ? 'CREDIT' : 'NON_SOLDE'),
              total_du: parsed.total_du || 0,
              total_paye: parsed.total_paye || 0,
              frais_additionnels: 0,
              parent_tel: parsed.u || parsed.parent_tel || '',
              parent_nom: parsed.parent || '',
              date_naissance: parsed.d || '',
              token: parsed.tok || '',
              actif: true,
              date_inscription: '',
              created_at: '',
              updated_at: '',
            }
            playSuccessBeep()
            setFoundStudent(pseudoStudent)
            setFoundStaff(null)
            toast.success(`Badge élève vérifié : ${pseudoStudent.nom}`)
            return
          }
        } else if (isStf) {
          const st = staff.find(
            x => (parsed.id && x.id === parsed.id) ||
                 (parsed.m && (x.matricule || '').toUpperCase() === parsed.m.toUpperCase()) ||
                 (parsed.matricule && (x.matricule || '').toUpperCase() === parsed.matricule.toUpperCase())
          )
          if (st) {
            playSuccessBeep()
            setFoundStaff(st)
            setFoundStudent(null)
            toast.success(`Personnel identifié : ${st.nom} ${st.prenoms}`)
            return
          }
        }
      } catch {
        // En cas d'échec de parsing JSON, on passe à la recherche classique
      }
    }

    const q = raw.toUpperCase()

    // Recherche dans les élèves
    const s = students.find(
      x => x.matricule.toUpperCase() === q ||
           x.token === raw ||
           x.id === raw ||
           `${x.nom} ${x.prenoms}`.toUpperCase() === q ||
           `${x.nom} ${x.prenoms}`.toUpperCase().includes(q)
    )
    if (s) {
      playSuccessBeep()
      setFoundStudent(s)
      setFoundStaff(null)
      toast.success(`Élève identifié : ${s.nom} ${s.prenoms}`)
      return
    }

    // Recherche dans le personnel
    const st = staff.find(
      x => (x.matricule && x.matricule.toUpperCase() === q) ||
           x.id === raw ||
           `${x.nom} ${x.prenoms}`.toUpperCase() === q ||
           `${x.nom} ${x.prenoms}`.toUpperCase().includes(q)
    )
    if (st) {
      playSuccessBeep()
      setFoundStaff(st)
      setFoundStudent(null)
      toast.success(`Personnel identifié : ${st.nom} ${st.prenoms}`)
      return
    }

    setNotFound(true)
    setFoundStudent(null)
    setFoundStaff(null)
    toast.error('Aucune correspondance trouvée avec ce code.')
  }

  // Démarrer la caméra avec html5-qrcode
  async function startCamera() {
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-box')
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Détection réussie !
          handleScanLookup(decodedText)
        },
        () => {
          // Erreur de frame (normal quand aucun QR n'est dans le champ)
        }
      )
      setCameraActive(true)
      toast.success('Caméra active. Visez le QR code.')
    } catch (err) {
      console.error('Erreur démarrage caméra', err)
      toast.error('Impossible d’activer la caméra. Vérifiez les permissions de votre navigateur.')
      setCameraActive(false)
    }
  }

  // Arrêter la caméra
  async function stopCamera() {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (e) {
        console.error('Erreur arrêt caméra', e)
      }
    }
    setCameraActive(false)
  }

  function toggleCamera() {
    if (cameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  // Scanner un fichier image / photo contenant un QR code
  async function handleImageFile(file: File) {
    try {
      let scanner = html5QrCodeRef.current
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader-box')
        html5QrCodeRef.current = scanner
      }
      toast.loading('Analyse de l’image…', { id: 'file-scan' })
      const result = await scanner.scanFile(file, false)
      toast.dismiss('file-scan')
      handleScanLookup(result)
    } catch (err) {
      toast.dismiss('file-scan')
      toast.error('Aucun code QR détecté dans cette image.')
    }
  }

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // Paiements de l'élève scanné
  const elevePaiements = foundStudent
    ? payments.filter(p => !p.annule && p.student_id === foundStudent.id).slice(0, 5)
    : []

  // Fiches de paie du personnel scanné
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
          Vérification instantanée des cartes d'élèves et du personnel par caméra, image ou matricule
        </p>
      </div>

      {/* Boîte de scan et recherche */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        {/* Champ de saisie manuelle ou douchette */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScanLookup(query)}
              placeholder="Scanner avec douchette ou saisir un matricule / token…"
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
        </div>

        {/* Boutons d'activation Caméra et Import Image */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            onClick={toggleCamera}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
              cameraActive
                ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-300'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            <span>{cameraActive ? 'Éteindre la caméra' : 'Activer la caméra pour scanner'}</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer transition-colors border border-gray-200 dark:border-gray-700">
            <UploadCloud className="h-4 w-4" />
            <span>Scanner une photo QR</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageFile(file)
              }}
            />
          </label>
        </div>

        {/* Zone de rendu vidéo du scanner html5-qrcode */}
        <div
          id="qr-reader-box"
          className={`w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-primary-500 shadow-md ${
            cameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Message non trouvé */}
        {notFound && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Aucun élève ou personnel correspondant</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Le code scanné n'est associé à aucun dossier dans la base. Vérifiez l'année scolaire et le matricule.
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
              {/* Photo d'identité de l'élève */}
              {foundStudent.photo ? (
                <img
                  src={foundStudent.photo}
                  alt={`${foundStudent.nom} ${foundStudent.prenoms}`}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-extrabold text-xl shrink-0">
                  {foundStudent.nom.charAt(0)}{foundStudent.prenoms.charAt(0)}
                </div>
              )}
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
              Voir le Badge
            </Button>
          </div>

          {/* Situation financière */}
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
              {foundStudent.date_inscription && (
                <p className="text-gray-800 dark:text-gray-200 text-xs">
                  Inscrit le : <strong>{fmtDateShort(foundStudent.date_inscription)}</strong>
                </p>
              )}
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
              Voir le Badge
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
              {foundStaff.date_embauche && (
                <p className="text-gray-800 dark:text-gray-200 text-xs">
                  Embauché le : <strong>{fmtDateShort(foundStaff.date_embauche)}</strong>
                </p>
              )}
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
