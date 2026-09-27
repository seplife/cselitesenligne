import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmt, fmtDateShort } from '@/lib/utils'
import { Download, Printer, Copy, Check, QrCode as QrIcon, User, School, Phone, MessageSquare } from 'lucide-react'
import type { Student, Staff, Settings } from '@/types'
import toast from 'react-hot-toast'

interface QrBadgeModalProps {
  open: boolean
  onClose: () => void
  student?: Student | null
  staff?: Staff | null
  settings?: Settings | null
}

export function QrBadgeModal({ open, onClose, student, staff, settings }: QrBadgeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const isStudent = !!student
  const entity = student || staff

  // Génération de l'URL de vérification pour le QR code
  const qrContent = React.useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const baseUrl = `${origin}${pathname}`

    if (student) {
      const payload = {
        t: 's',
        id: student.id,
        m: student.matricule,
        n: `${student.nom} ${student.prenoms}`,
        c: student.classe_nom || 'Non assigné',
        s: student.statut === 'SOLDE' ? 'SOLDÉ' : student.statut === 'CREDIT' ? 'CRÉDIT' : 'NON SOLDÉ',
        d: student.date_naissance || '',
        u: student.parent_tel || '',
        tok: student.token,
        school: settings?.school_name || 'CSE DIVO',
        annee: settings?.annee_scolaire || '',
      }
      return `${baseUrl}?verify=${encodeURIComponent(JSON.stringify(payload))}`
    } else if (staff) {
      const payload = {
        t: 'p',
        id: staff.id,
        m: staff.matricule || 'PER',
        n: `${staff.nom} ${staff.prenoms}`,
        c: staff.poste || 'Personnel',
        s: staff.actif ? 'ACTIF' : 'INACTIF',
        u: staff.telephone || '',
        d: staff.date_embauche || '',
        school: settings?.school_name || 'CSE DIVO',
        annee: settings?.annee_scolaire || '',
      }
      return `${baseUrl}?verify=${encodeURIComponent(JSON.stringify(payload))}`
    }
    return ''
  }, [student, staff, settings])

  // Génération du QR code à l'ouverture de la modale
  useEffect(() => {
    if (!open || !qrContent) return
    setQrDataUrl('') // reset
    QRCode.toDataURL(qrContent, {
      width: 400,
      margin: 2,
      color: { dark: '#0f5132', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => {
        console.error('Erreur génération QR Code', err)
        toast.error('Erreur lors de la génération du QR Code.')
      })
  }, [open, qrContent])

  if (!entity) return null

  // ── Télécharger le QR code en PNG
  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    const safeMatricule = (isStudent ? student?.matricule : staff?.matricule) || 'qr'
    a.download = `QR_${safeMatricule}.png`
    a.click()
    toast.success('QR Code téléchargé.')
  }

  // ── Copier les informations textuelles
  function copyTextInfo() {
    let text = ''
    if (student) {
      text =
        `=== FICHE ÉLÈVE — ${settings?.school_name || 'CSE DIVO'} ===\n` +
        `Matricule : ${student.matricule}\n` +
        `Nom & Prénoms : ${student.nom} ${student.prenoms}\n` +
        `Classe : ${student.classe_nom || 'Sans classe'}\n` +
        `Sexe : ${student.sexe === 'M' ? 'Masculin' : 'Féminin'}\n` +
        (student.date_naissance ? `Date de naissance : ${student.date_naissance}\n` : '') +
        (student.parent_nom ? `Parent : ${student.parent_nom} (${student.parent_tel || 'Sans tél'})\n` : '') +
        `Total dû : ${fmt(student.total_du)}\n` +
        `Total payé : ${fmt(student.total_paye)}\n` +
        `Reste à payer : ${fmt(student.total_du - student.total_paye)}\n` +
        `Statut : ${student.statut === 'SOLDE' ? 'Soldé' : student.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}\n` +
        `Année scolaire : ${settings?.annee_scolaire || ''}`
    } else if (staff) {
      text =
        `=== FICHE PERSONNEL — ${settings?.school_name || 'CSE DIVO'} ===\n` +
        `Matricule : ${staff.matricule || 'PER'}\n` +
        `Nom & Prénoms : ${staff.nom} ${staff.prenoms}\n` +
        `Poste : ${staff.poste || 'Personnel'}\n` +
        (staff.telephone ? `Téléphone : ${staff.telephone}\n` : '') +
        `Statut : ${staff.actif ? 'Actif' : 'Inactif'}\n` +
        (staff.date_embauche ? `Date d'embauche : ${fmtDateShort(staff.date_embauche)}\n` : '') +
        `Année scolaire : ${settings?.annee_scolaire || ''}`
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Informations copiées.')
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Envoi SMS via lien sms: (ouvre l'app SMS du téléphone/PC)
  function handleSendSMS() {
    const tel = isStudent ? student?.parent_tel : staff?.telephone
    if (!tel) {
      toast.error('Aucun numéro de téléphone disponible.')
      return
    }
    const nom = `${entity!.nom} ${entity!.prenoms}`
    const school = settings?.school_name || 'CSE DIVO'
    let msg = ''
    if (isStudent && student) {
      const reste = student.total_du - student.total_paye
      msg =
        `Bonjour, concernant l'élève ${nom} (${student.matricule}) - ${student.classe_nom || ''}:\n` +
        `Reste à payer : ${fmt(reste)} FCFA.\n` +
        `Merci de régulariser au plus tôt.\n— ${school}`
    } else if (staff) {
      msg = `Bonjour ${nom}, message de ${school}. Merci de contacter l'administration.`
    }
    // Nettoyage numéro Côte d'Ivoire : 10 chiffres → +225...
    let clean = tel.replace(/[^0-9]/g, '')
    if (clean.length === 10) clean = '+225' + clean
    else if (!clean.startsWith('+')) clean = '+' + clean
    // Le lien sms: ouvre l'app SMS native avec numéro + message pré-rempli
    const smsLink = `sms:${clean}?body=${encodeURIComponent(msg)}`
    window.location.href = smsLink
    toast.success('Application SMS ouverte avec le message.')
  }

  // ── Envoi WhatsApp avec message pré-rempli
  function handleWhatsApp() {
    const tel = isStudent ? student?.parent_tel : staff?.telephone
    if (!tel) {
      toast.error('Aucun numéro de téléphone disponible.')
      return
    }
    const nom = `${entity!.nom} ${entity!.prenoms}`
    const school = settings?.school_name || 'CSE DIVO'
    let msg = ''
    if (isStudent && student) {
      const reste = student.total_du - student.total_paye
      msg =
        `Bonjour, nous vous contactons au sujet de l'élève *${nom}* (Matricule : ${student.matricule}) — Classe : ${student.classe_nom || 'Non affecté'}.\n\n` +
        `Montant restant à payer : *${fmt(reste)} FCFA*.\n\n` +
        `Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.\n\n` +
        `Cordialement,\n${school}`
    } else if (staff) {
      msg = `Bonjour ${nom}, message de l'administration du ${school}. Merci de nous contacter.`
    }
    let clean = tel.replace(/[^0-9]/g, '')
    if (clean.length === 10) clean = '225' + clean
    const waLink = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
    window.open(waLink, '_blank')
    toast.success('WhatsApp ouvert avec le message.')
  }

  // ── Impression du badge — le QR (base64) est injecté directement dans le HTML
  function handlePrintBadge() {
    if (!entity) return
    if (!qrDataUrl) {
      toast.error('Le QR code est encore en cours de génération. Attendez quelques secondes puis réessayez.')
      return
    }

    const school = settings?.school_name || 'CSE DIVO'
    const sigle = settings?.sigle || 'CSE'
    const annee = settings?.annee_scolaire || ''
    const matricule = isStudent ? student?.matricule : (staff?.matricule || 'PER')
    const nomComplet = `${entity.nom} ${entity.prenoms}`
    const sousTitre = isStudent
      ? `Classe : ${student?.classe_nom || 'Non affecté'}`
      : `Poste : ${staff?.poste || 'Personnel'}`
    const photoUrl = isStudent ? student?.photo : undefined
    const statutBadge = isStudent
      ? (student?.statut === 'SOLDE' ? 'SOLDÉ' : student?.statut === 'CREDIT' ? 'CRÉDIT' : 'NON SOLDÉ')
      : (staff?.actif ? 'ACTIF' : 'INACTIF')
    const statutColor = isStudent
      ? (student?.statut === 'SOLDE' ? '#16a34a' : student?.statut === 'CREDIT' ? '#2563eb' : '#dc2626')
      : (staff?.actif ? '#16a34a' : '#dc2626')

    // qrDataUrl est déjà une data:image/png;base64,... — aucun chargement réseau nécessaire
    const win = window.open('', '_blank')
    if (!win) {
      toast.error("Fenêtre bloquée par le navigateur. Autorisez les pop-ups pour cette page.")
      return
    }

    win.document.open()
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Badge — ${nomComplet}</title>
  <style>
    @page { size: 86mm 54mm landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #e5e7eb;
    }
    .badge-card {
      width: 85mm; height: 53mm;
      background: #fff;
      border-radius: 5mm;
      box-shadow: 0 4px 16px rgba(0,0,0,.15);
      border: 1.5px solid #0f5132;
      padding: 3mm 3.5mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      position: relative;
      overflow: hidden;
    }
    .badge-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1.5px solid #0f5132;
      padding-bottom: 1.5mm;
    }
    .school-title { font-size: 10.5px; font-weight: 800; color: #0f5132; text-transform: uppercase; letter-spacing: .3px; }
    .school-sub   { font-size: 7.5px; color: #555; }
    .badge-body   { display: flex; align-items: center; gap: 2.5mm; flex: 1; }
    .photo-img    { width: 19mm; height: 23mm; object-fit: cover; border-radius: 2mm; border: 1.5px solid #0f5132; flex-shrink: 0; }
    .photo-ph     { width: 19mm; height: 23mm; border-radius: 2mm; border: 1.5px dashed #0f5132; background: #e8f5e9; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: #0f5132; flex-shrink: 0; }
    .info-col     { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .8mm; }
    .mat          { font-size: 8.5px; font-family: monospace; font-weight: bold; color: #0f5132; background: #e8f5e9; padding: 1px 3px; border-radius: 2px; display: inline-block; }
    .name         { font-size: 10.5px; font-weight: bold; color: #111; line-height: 1.15; }
    .meta         { font-size: 7.5px; color: #444; }
    .badge-status { display: inline-block; font-size: 7px; font-weight: bold; padding: 1px 4px; border-radius: 2mm; color: #fff; margin-top: .5mm; }
    .qr-wrap      { display: flex; flex-direction: column; align-items: center; gap: .5mm; flex-shrink: 0; }
    .qr-img       { width: 21mm; height: 21mm; border: 1px solid #0f5132; border-radius: 2mm; padding: .5mm; background: #fff; display: block; }
    .qr-label     { font-size: 6px; color: #777; text-align: center; font-family: monospace; }
    .badge-footer { display: flex; justify-content: space-between; align-items: center; font-size: 6.5px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 1mm; }
    @media print {
      body { background: transparent; min-height: unset; }
      .badge-card { box-shadow: none; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="badge-card">
    <div class="badge-header">
      <div>
        <div class="school-title">${school}</div>
        <div class="school-sub">${sigle} • ${annee}</div>
      </div>
      <div class="school-sub" style="text-align:right;color:#0f5132;font-weight:bold;">${isStudent ? 'CARTE SCOLAIRE' : 'CARTE PRO'}</div>
    </div>
    <div class="badge-body">
      ${photoUrl
        ? `<img class="photo-img" src="${photoUrl}" alt="Photo">`
        : `<div class="photo-ph">${entity.nom.charAt(0)}${entity.prenoms.charAt(0)}</div>`}
      <div class="info-col">
        <span class="mat">${matricule}</span>
        <div class="name">${nomComplet}</div>
        <div class="meta">${sousTitre}</div>
        ${isStudent && student?.parent_tel ? `<div class="meta">Urg: ${student.parent_tel}</div>` : ''}
        ${!isStudent && staff?.telephone ? `<div class="meta">Tél: ${staff.telephone}</div>` : ''}
        <span class="badge-status" style="background:${statutColor}">${statutBadge}</span>
      </div>
      <div class="qr-wrap">
        <img class="qr-img" id="qrImg" src="${qrDataUrl}" alt="QR Code">
        <div class="qr-label">Scannez</div>
      </div>
    </div>
    <div class="badge-footer">
      <span>CARTE OFFICIELLE D'IDENTITÉ</span>
      <span>Vérifiez l'authenticité via QR</span>
    </div>
  </div>
  <script>
    // Le QR est en base64 donc toujours disponible immédiatement
    // On attend quand même le chargement complet de la page avant d'imprimer
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`)
    win.document.close()
  }

  const hasTel = isStudent ? !!student?.parent_tel : !!staff?.telephone

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isStudent ? "Badge Scolaire & Code QR" : "Badge Professionnel & Code QR"}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Carte badge visuelle */}
        <div
          ref={printRef}
          className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-primary-700/50 overflow-hidden"
        >
          {/* Filigrane */}
          <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none text-9xl">🏫</div>

          {/* En-tête */}
          <div className="flex items-start justify-between border-b border-primary-600/60 pb-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary-200 font-semibold">
                {settings?.school_name || 'CSE DIVO'}
              </p>
              <h3 className="text-sm font-bold text-white">
                {isStudent ? 'CARTE SCOLAIRE D\u2019IDENTITÉ' : 'CARTE PROFESSIONNELLE'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-full border border-white/20 text-primary-100">
                {settings?.annee_scolaire || '2025-2026'}
              </span>
            </div>
          </div>

          {/* Corps badge */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Photo */}
            <div className="shrink-0">
              {isStudent && student?.photo ? (
                <img
                  src={student.photo}
                  alt={`${student.nom} ${student.prenoms}`}
                  className="w-28 h-32 rounded-2xl object-cover border-2 border-primary-300 shadow-lg bg-white"
                />
              ) : (
                <div className="w-28 h-32 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center text-primary-200 shadow-inner">
                  <User className="h-10 w-10 text-primary-300 mb-1" />
                  <span className="text-[10px] uppercase font-semibold">Sans photo</span>
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 font-mono text-xs font-bold tracking-wider text-amber-300">
                  {isStudent ? student?.matricule : (staff?.matricule || 'PER')}
                </span>
                <h4 className="text-xl font-extrabold text-white mt-1 leading-snug">
                  {entity.nom} {entity.prenoms}
                </h4>
              </div>

              {isStudent && (
                <div className="text-sm space-y-1 text-primary-100">
                  <p className="flex items-center justify-center sm:justify-start gap-1.5">
                    <School className="h-4 w-4 text-emerald-300" />
                    <span>Classe : <strong className="text-white">{student?.classe_nom || 'Non affecté'}</strong></span>
                  </p>
                  <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Sexe : <strong>{student?.sexe === 'M' ? 'Masculin' : 'Féminin'}</strong></span>
                    {student?.date_naissance && (
                      <span className="ml-2">Né(e) le : <strong>{student.date_naissance}</strong></span>
                    )}
                  </p>
                  {student?.parent_tel && (
                    <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs">
                      <Phone className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Parent : {student.parent_nom || ''} ({student.parent_tel})</span>
                    </p>
                  )}
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      student?.statut === 'SOLDE'
                        ? 'bg-emerald-400 text-emerald-950'
                        : student?.statut === 'CREDIT'
                        ? 'bg-blue-300 text-blue-950'
                        : 'bg-amber-300 text-amber-950'
                    }`}>
                      {student?.statut === 'SOLDE' ? 'SOLDÉ' : student?.statut === 'CREDIT' ? 'CRÉDIT' : 'NON SOLDÉ'}
                    </span>
                    <span className="text-xs text-primary-200">
                      Reste : <strong className="text-white">{fmt((student?.total_du ?? 0) - (student?.total_paye ?? 0))}</strong>
                    </span>
                  </div>
                </div>
              )}

              {!isStudent && (
                <div className="text-sm space-y-1 text-primary-100">
                  <p className="flex items-center justify-center sm:justify-start gap-1.5">
                    <User className="h-4 w-4 text-emerald-300" />
                    <span>Poste : <strong className="text-white">{staff?.poste || 'Personnel'}</strong></span>
                  </p>
                  {staff?.telephone && (
                    <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs">
                      <Phone className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Téléphone : <strong className="text-white">{staff.telephone}</strong></span>
                    </p>
                  )}
                  {staff?.date_embauche && (
                    <p className="text-xs text-primary-200">
                      Embauché le : <strong className="text-white">{fmtDateShort(staff.date_embauche)}</strong>
                    </p>
                  )}
                  <div className="pt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      staff?.actif ? 'bg-emerald-400 text-emerald-950' : 'bg-red-400 text-red-950'
                    }`}>
                      {staff?.actif ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* QR Code — toujours rendu, indicateur si en cours */}
            <div className="bg-white p-2 rounded-2xl shadow-md border-2 border-primary-400 shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 rounded-lg object-contain" />
              ) : (
                <div className="w-28 h-28 flex flex-col items-center justify-center gap-2">
                  <QrIcon className="h-8 w-8 animate-pulse text-primary-700" />
                  <span className="text-[9px] text-primary-700 font-mono">Génération…</span>
                </div>
              )}
              <p className="text-[9px] text-center text-gray-500 font-mono mt-0.5">Scannez-moi</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-primary-600/50 flex justify-between items-center text-[10px] text-primary-300">
            <span>Valable pour l'année scolaire en cours</span>
            <span>{settings?.ville || 'Divo'}, Côte d'Ivoire</span>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="space-y-3">
          {/* Ligne 1 : actions badge */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadQr}
              disabled={!qrDataUrl}
              title={!qrDataUrl ? 'QR en cours de génération…' : 'Télécharger le QR code'}
            >
              Télécharger QR (.png)
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrintBadge}
              disabled={!qrDataUrl}
              title={!qrDataUrl ? 'QR en cours de génération…' : 'Imprimer le badge format carte (86×54 mm)'}
            >
              Imprimer badge
            </Button>
            <Button
              variant="secondary"
              icon={copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              onClick={copyTextInfo}
            >
              {copied ? 'Copié !' : 'Copier infos'}
            </Button>
          </div>

          {/* Ligne 2 : contact rapide SMS / WhatsApp */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            {hasTel ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Contacter :</span>
                <button
                  onClick={handleSendSMS}
                  title="Ouvrir l'app SMS avec le message pré-rempli"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Envoyer SMS
                </button>
                <button
                  onClick={handleWhatsApp}
                  title="Ouvrir WhatsApp avec le message pré-rempli"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Aucun numéro de téléphone renseigné</span>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
