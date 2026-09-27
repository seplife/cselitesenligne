import React, { useEffect, useMemo, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmt, fmtDateShort } from '@/lib/utils'
import {
  Download,
  Printer,
  Copy,
  Check,
  QrCode as QrIcon,
  User,
  School,
  Phone,
  MessageSquare,
} from 'lucide-react'
import type { Student, Staff, Settings } from '@/types'
import toast from 'react-hot-toast'

interface QrBadgeModalProps {
  open: boolean
  onClose: () => void
  student?: Student | null
  staff?: Staff | null
  settings?: Settings | null
}

export function QrBadgeModal({
  open,
  onClose,
  student,
  staff,
  settings,
}: QrBadgeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const isStudent = !!student
  const entity = student || staff

  // URL de vérification encodée dans le QR Code.
  const qrContent = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : ''
    const baseUrl = `${origin}${pathname}`

    if (student) {
      const payload = {
        t: 's',
        id: student.id,
        m: student.matricule,
        n: `${student.nom} ${student.prenoms}`,
        c: student.classe_nom || 'Non assigné',
        s:
          student.statut === 'SOLDE'
            ? 'SOLDÉ'
            : student.statut === 'CREDIT'
              ? 'CRÉDIT'
              : 'NON SOLDÉ',
        d: student.date_naissance || '',
        u: student.parent_tel || '',
        tok: student.token,
        school: settings?.school_name || 'CSE DIVO',
        annee: settings?.annee_scolaire || '',
      }

      return `${baseUrl}?verify=${encodeURIComponent(
        JSON.stringify(payload),
      )}`
    }

    if (staff) {
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

      return `${baseUrl}?verify=${encodeURIComponent(
        JSON.stringify(payload),
      )}`
    }

    return ''
  }, [student, staff, settings])

  // Génération du QR Code en haute résolution.
  useEffect(() => {
    if (!open || !qrContent) return

    let cancelled = false

    setQrDataUrl('')

    QRCode.toDataURL(qrContent, {
      width: 600,
      margin: 2,
      color: {
        dark: '#0f5132',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch((err) => {
        console.error('Erreur génération QR Code', err)
        if (!cancelled) {
          toast.error('Erreur lors de la génération du QR Code.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, qrContent])

  if (!entity) return null

  // ─────────────────────────────────────────────
  // Télécharger le QR Code
  // ─────────────────────────────────────────────
  function downloadQr() {
    if (!qrDataUrl) return

    const a = document.createElement('a')
    a.href = qrDataUrl

    const safeMatricule =
      (isStudent ? student?.matricule : staff?.matricule) || 'qr'

    a.download = `QR_${safeMatricule}.png`
    a.click()

    toast.success('QR Code téléchargé.')
  }

  // ─────────────────────────────────────────────
  // Copier les informations
  // ─────────────────────────────────────────────
  function copyTextInfo() {
    let text = ''

    if (student) {
      text =
        `=== FICHE ÉLÈVE — ${settings?.school_name || 'CSE DIVO'} ===\n` +
        `Matricule : ${student.matricule}\n` +
        `Nom & Prénoms : ${student.nom} ${student.prenoms}\n` +
        `Classe : ${student.classe_nom || 'Sans classe'}\n` +
        `Sexe : ${student.sexe === 'M' ? 'Masculin' : 'Féminin'}\n` +
        (student.date_naissance
          ? `Date de naissance : ${student.date_naissance}\n`
          : '') +
        (student.parent_nom
          ? `Parent : ${student.parent_nom} (${student.parent_tel || 'Sans tél'})\n`
          : '') +
        `Total dû : ${fmt(student.total_du)}\n` +
        `Total payé : ${fmt(student.total_paye)}\n` +
        `Reste à payer : ${fmt(student.total_du - student.total_paye)}\n` +
        `Statut : ${
          student.statut === 'SOLDE'
            ? 'Soldé'
            : student.statut === 'CREDIT'
              ? 'Crédit'
              : 'Non soldé'
        }\n` +
        `Année scolaire : ${settings?.annee_scolaire || ''}`
    } else if (staff) {
      text =
        `=== FICHE PERSONNEL — ${settings?.school_name || 'CSE DIVO'} ===\n` +
        `Matricule : ${staff.matricule || 'PER'}\n` +
        `Nom & Prénoms : ${staff.nom} ${staff.prenoms}\n` +
        `Poste : ${staff.poste || 'Personnel'}\n` +
        (staff.telephone
          ? `Téléphone : ${staff.telephone}\n`
          : '') +
        `Statut : ${staff.actif ? 'Actif' : 'Inactif'}\n` +
        (staff.date_embauche
          ? `Date d'embauche : ${fmtDateShort(staff.date_embauche)}\n`
          : '') +
        `Année scolaire : ${settings?.annee_scolaire || ''}`
    }

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Informations copiées.')

    setTimeout(() => setCopied(false), 2000)
  }

  // ─────────────────────────────────────────────
  // SMS
  // ─────────────────────────────────────────────
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
      const reste = Math.max(
        0,
        student.total_du - student.total_paye,
      )

      msg =
        `Bonjour, concernant l'élève ${nom} (${student.matricule}) - ${student.classe_nom || ''}:\n` +
        `Reste à payer : ${fmt(reste)} FCFA.\n` +
        `Merci de régulariser au plus tôt.\n— ${school}`
    } else if (staff) {
      msg = `Bonjour ${nom}, message de ${school}. Merci de contacter l'administration.`
    }

    let clean = tel.replace(/[^0-9]/g, '')

    if (clean.length === 10) clean = '+225' + clean
    else if (!clean.startsWith('+')) clean = '+' + clean

    const smsLink = `sms:${clean}?body=${encodeURIComponent(msg)}`

    window.location.href = smsLink
    toast.success('Application SMS ouverte avec le message.')
  }

  // ─────────────────────────────────────────────
  // WhatsApp
  // ─────────────────────────────────────────────
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
      const reste = Math.max(
        0,
        student.total_du - student.total_paye,
      )

      msg =
        `Bonjour, nous vous contactons au sujet de l'élève *${nom}* ` +
        `(Matricule : ${student.matricule}) — Classe : ${student.classe_nom || 'Non affecté'}.\n\n` +
        `Montant restant à payer : *${fmt(reste)} FCFA*.\n\n` +
        `Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.\n\n` +
        `Cordialement,\n${school}`
    } else if (staff) {
      msg = `Bonjour ${nom}, message de l'administration du ${school}. Merci de nous contacter.`
    }

    let clean = tel.replace(/[^0-9]/g, '')

    if (clean.length === 10) clean = '225' + clean

    const waLink =
      `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`

    window.open(waLink, '_blank')
    toast.success('WhatsApp ouvert avec le message.')
  }

  // ─────────────────────────────────────────────
  // Impression du badge
  // ─────────────────────────────────────────────
  function handlePrintBadge() {
    if (!entity) return

    if (!qrDataUrl) {
      toast.error(
        "Le QR code est encore en cours de génération. Attendez quelques secondes puis réessayez.",
      )
      return
    }

    const school = settings?.school_name || 'CSE DIVO'
    const sigle = settings?.sigle || 'CSE'
    const annee = settings?.annee_scolaire || ''

    const matricule = isStudent
      ? student?.matricule
      : staff?.matricule || 'PER'

    const nomComplet = `${entity.nom} ${entity.prenoms}`

    const sousTitre = isStudent
      ? `Classe : ${student?.classe_nom || 'Non affecté'}`
      : `Poste : ${staff?.poste || 'Personnel'}`

    const photoUrl = isStudent ? student?.photo : undefined

    const statutBadge = isStudent
      ? student?.statut === 'SOLDE'
        ? 'SOLDÉ'
        : student?.statut === 'CREDIT'
          ? 'CRÉDIT'
          : 'NON SOLDÉ'
      : staff?.actif
        ? 'ACTIF'
        : 'INACTIF'

    const statutColor = isStudent
      ? student?.statut === 'SOLDE'
        ? '#16a34a'
        : student?.statut === 'CREDIT'
          ? '#2563eb'
          : '#dc2626'
      : staff?.actif
        ? '#16a34a'
        : '#dc2626'

    const reste = isStudent
      ? Math.max(
          0,
          (student?.total_du ?? 0) -
            (student?.total_paye ?? 0),
        )
      : 0

    const win = window.open('', '_blank')

    if (!win) {
      toast.error(
        "Fenêtre bloquée par le navigateur. Autorisez les pop-ups pour cette page.",
      )
      return
    }

    win.document.open()

    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>Badge — ${nomComplet}</title>

  <style>
    @page {
      size: 86mm 54mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html,
    body {
      width: 86mm;
      height: 54mm;
      margin: 0;
      padding: 0;
    }

    body {
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;

      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #e5e7eb;
    }

    .badge-card {
      position: relative;

      width: 86mm;
      height: 54mm;

      padding: 3mm;

      background:
        linear-gradient(
          135deg,
          #ffffff 0%,
          #f8fafc 55%,
          #ecfdf5 100%
        );

      border: 0.5mm solid #0f5132;
      border-radius: 4mm;

      overflow: hidden;

      display: flex;
      flex-direction: column;

      color: #111827;

      box-shadow:
        0 1mm 3mm rgba(0, 0, 0, 0.15);
    }

    .badge-card::before {
      content: "";
      position: absolute;

      top: 0;
      left: 0;
      right: 0;

      height: 1.5mm;

      background:
        linear-gradient(
          90deg,
          #0f5132,
          #16a34a,
          #0f5132
        );
    }

    .badge-header {
      position: relative;
      z-index: 2;

      height: 9mm;

      display: flex;
      align-items: center;
      justify-content: space-between;

      border-bottom: 0.35mm solid #d1d5db;

      padding: 0 1mm 1.5mm;

      flex-shrink: 0;
    }

    .school-title {
      max-width: 58mm;

      font-size: 9px;
      line-height: 1.1;

      font-weight: 900;

      color: #0f5132;

      text-transform: uppercase;

      letter-spacing: 0.2px;
    }

    .school-sub {
      margin-top: 0.7mm;

      font-size: 6.5px;
      line-height: 1;

      color: #64748b;

      font-weight: 500;
    }

    .card-type {
      font-size: 6.5px;

      padding: 1mm 1.5mm;

      border-radius: 2mm;

      background: #ecfdf5;

      color: #0f5132;

      border: 0.25mm solid #bbf7d0;

      white-space: nowrap;
      font-weight: 800;
    }

    .badge-body {
      flex: 1;

      min-height: 0;

      display: grid;

      grid-template-columns:
        17mm
        minmax(0, 1fr)
        25mm;

      align-items: center;

      column-gap: 2.5mm;

      padding: 2mm 0;

      overflow: hidden;
    }

    .photo-img,
    .photo-ph {
      width: 17mm;
      height: 21mm;

      flex-shrink: 0;

      border-radius: 2mm;

      border: 0.4mm solid #0f5132;

      overflow: hidden;
    }

    .photo-img {
      object-fit: cover;
      background: #fff;
    }

    .photo-ph {
      display: flex;
      align-items: center;
      justify-content: center;

      background: #ecfdf5;

      color: #0f5132;

      font-size: 14px;

      font-weight: 900;
    }

    .info-col {
      min-width: 0;
      max-width: 100%;

      display: flex;
      flex-direction: column;

      justify-content: center;

      gap: 0.8mm;

      overflow: hidden;
    }

    .mat {
      align-self: flex-start;

      max-width: 100%;

      padding: 0.8mm 1.5mm;

      border-radius: 1.2mm;

      background: #dcfce7;

      color: #166534;

      font-family: "Courier New", monospace;

      font-size: 7px;

      font-weight: 800;

      white-space: nowrap;

      overflow: hidden;

      text-overflow: ellipsis;
    }

    .name {
      max-width: 100%;

      font-size: 9px;

      line-height: 1.15;

      font-weight: 900;

      color: #111827;

      text-transform: uppercase;

      overflow: hidden;

      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .meta {
      font-size: 6.5px;

      line-height: 1.15;

      color: #475569;

      white-space: nowrap;

      overflow: hidden;

      text-overflow: ellipsis;
    }

    .payment-box {
      display: flex;
      align-items: center;
      gap: 1.2mm;

      margin-top: 0.4mm;

      font-size: 6px;
      line-height: 1.1;
    }

    .payment-label {
      color: #64748b;
    }

    .payment-value {
      font-weight: 900;
      color: #111827;
    }

    .badge-status {
      align-self: flex-start;

      display: inline-flex;

      align-items: center;
      justify-content: center;

      min-height: 4.5mm;

      padding: 0.7mm 1.8mm;

      border-radius: 3mm;

      color: #fff;

      font-size: 6px;

      line-height: 1;

      font-weight: 900;

      letter-spacing: 0.2px;

      white-space: nowrap;
    }

    .qr-wrap {
      width: 25mm;
      height: 25mm;

      display: flex;
      flex-direction: column;

      align-items: center;
      justify-content: center;

      flex-shrink: 0;

      overflow: visible;
    }

    .qr-frame {
      width: 24mm;
      height: 24mm;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #ffffff;

      border: 0.5mm solid #0f5132;

      border-radius: 2mm;

      padding: 0.5mm;

      flex-shrink: 0;
    }

    .qr-img {
      width: 22.5mm;
      height: 22.5mm;

      max-width: 22.5mm;
      max-height: 22.5mm;

      object-fit: contain;

      display: block;

      border: none;
      border-radius: 0;
      padding: 0;

      image-rendering: crisp-edges;
    }

    .qr-label {
      margin-top: 0.6mm;

      font-family: "Courier New", monospace;

      font-size: 5.5px;

      line-height: 1;

      font-weight: 700;

      color: #64748b;

      text-align: center;

      white-space: nowrap;
    }

    .badge-footer {
      height: 5mm;

      flex-shrink: 0;

      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 2mm;

      border-top: 0.3mm solid #e5e7eb;

      padding: 1mm 1mm 0;

      font-size: 5.5px;

      line-height: 1;

      color: #64748b;

      white-space: nowrap;
    }

    .badge-footer span:last-child {
      color: #0f5132;
      font-weight: 700;
    }

    .watermark {
      position: absolute;

      right: -3mm;
      bottom: -8mm;

      font-size: 34mm;

      line-height: 1;

      opacity: 0.035;

      pointer-events: none;
    }

    @media print {
      html,
      body {
        width: 86mm;
        height: 54mm;

        margin: 0;
        padding: 0;

        background: white;
      }

      body {
        display: block;
      }

      .badge-card {
        width: 86mm;
        height: 54mm;

        margin: 0;

        border-radius: 4mm;

        box-shadow: none;

        page-break-inside: avoid;
        break-inside: avoid;

        overflow: hidden;
      }
    }
  </style>
</head>

<body>
  <div class="badge-card">

    <div class="badge-header">
      <div>
        <div class="school-title">
          ${school}
        </div>

        <div class="school-sub">
          ${sigle} • ${annee}
        </div>
      </div>

      <div class="card-type">
        ${isStudent ? 'CARTE SCOLAIRE' : 'CARTE PROFESSIONNELLE'}
      </div>
    </div>

    <div class="badge-body">

      ${
        photoUrl
          ? `<img
              class="photo-img"
              src="${photoUrl}"
              alt="Photo de ${nomComplet}"
            >`
          : `<div class="photo-ph">
              ${entity.nom.charAt(0)}${entity.prenoms.charAt(0)}
            </div>`
      }

      <div class="info-col">

        <span class="mat">
          ${matricule || 'PER'}
        </span>

        <div class="name">
          ${nomComplet}
        </div>

        <div class="meta">
          ${sousTitre}
        </div>

        ${
          isStudent
            ? `<div class="payment-box">
                <span class="payment-label">Reste :</span>
                <span class="payment-value">
                  ${fmt(reste)} FCFA
                </span>
              </div>`
            : ''
        }

        ${
          isStudent && student?.parent_tel
            ? `<div class="meta">
                Parent : ${student.parent_tel}
              </div>`
            : ''
        }

        ${
          !isStudent && staff?.telephone
            ? `<div class="meta">
                Tél : ${staff.telephone}
              </div>`
            : ''
        }

        <span
          class="badge-status"
          style="background:${statutColor}"
        >
          ${statutBadge}
        </span>

      </div>

      <div class="qr-wrap">

        <div class="qr-frame">
          <img
            class="qr-img"
            id="qrImg"
            src="${qrDataUrl}"
            alt="QR Code de vérification"
          >
        </div>

        <div class="qr-label">
          SCANNEZ POUR VÉRIFIER
        </div>

      </div>
    </div>

    <div class="badge-footer">
      <span>
        CARTE OFFICIELLE D'IDENTITÉ
      </span>

      <span>
        ${settings?.ville || 'Divo'}, Côte d'Ivoire
      </span>
    </div>

    <div class="watermark">
      🏫
    </div>

  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
      }, 400);
    });
  </script>

</body>
</html>`)

    win.document.close()
  }

  const hasTel = isStudent
    ? !!student?.parent_tel
    : !!staff?.telephone

  const resteAPayer = isStudent
    ? Math.max(
        0,
        (student?.total_du ?? 0) -
          (student?.total_paye ?? 0),
      )
    : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isStudent
          ? 'Badge Scolaire & Code QR'
          : 'Badge Professionnel & Code QR'
      }
      maxWidth="md"
    >
      <div className="space-y-6">

        {/* ═══════════════════════════════════════
            APERÇU DU BADGE
            ═══════════════════════════════════════ */}
        <div
          ref={printRef}
          className="
            relative overflow-hidden rounded-3xl
            border border-primary-700/50
            bg-gradient-to-br
            from-primary-950
            via-primary-900
            to-emerald-950
            p-5 text-white shadow-2xl
          "
        >
          {/* Décorations */}
          <div
            className="
              pointer-events-none absolute
              -right-16 -top-16
              h-40 w-40 rounded-full
              bg-emerald-400/10
            "
          />

          <div
            className="
              pointer-events-none absolute
              -bottom-16 -left-16
              h-40 w-40 rounded-full
              bg-primary-300/5
            "
          />

          {/* Filigrane */}
          <div className="
            pointer-events-none absolute
            -bottom-8 -right-6
            text-8xl opacity-10
          ">
            🏫
          </div>

          {/* En-tête */}
          <div className="
            relative z-10 mb-4
            flex items-start justify-between
            border-b border-white/10
            pb-3
          ">
            <div className="min-w-0">
              <p className="
                truncate text-[10px]
                font-bold uppercase
                tracking-[0.18em]
                text-emerald-200
              ">
                {settings?.school_name || 'CSE DIVO'}
              </p>

              <h3 className="
                mt-0.5 text-sm font-black
                uppercase tracking-wide text-white
              ">
                {isStudent
                  ? 'Carte scolaire d’identité'
                  : 'Carte professionnelle'}
              </h3>
            </div>

            <span className="
              shrink-0 rounded-full
              border border-white/15
              bg-white/10
              px-2.5 py-1
              font-mono text-[10px]
              font-bold text-emerald-100
            ">
              {settings?.annee_scolaire || '2026-2027'}
            </span>
          </div>

          {/* Corps */}
          <div className="
            relative z-10
            grid grid-cols-[112px_minmax(0,1fr)_120px]
            items-center gap-4
          ">

            {/* Photo */}
            <div className="shrink-0">
              {isStudent && student?.photo ? (
                <img
                  src={student.photo}
                  alt={`${student.nom} ${student.prenoms}`}
                  className="
                    h-32 w-28 rounded-2xl
                    border-2 border-emerald-300/70
                    bg-white object-cover
                    shadow-xl
                  "
                />
              ) : (
                <div className="
                  flex h-32 w-28
                  flex-col items-center
                  justify-center
                  rounded-2xl
                  border-2 border-dashed
                  border-white/20
                  bg-white/5
                  text-emerald-200
                ">
                  <User className="mb-1 h-10 w-10" />

                  <span className="
                    text-[9px] font-bold uppercase
                  ">
                    Sans photo
                  </span>
                </div>
              )}
            </div>

            {/* Informations */}
            <div className="min-w-0 space-y-2">
              <div>
                <span className="
                  inline-flex max-w-full
                  rounded-full
                  bg-emerald-400/15
                  px-2.5 py-1
                  font-mono text-[10px]
                  font-bold tracking-wider
                  text-amber-300
                  ring-1 ring-inset
                  ring-white/10
                ">
                  {isStudent
                    ? student?.matricule
                    : staff?.matricule || 'PER'}
                </span>

                <h4 className="
                  mt-1.5 line-clamp-2
                  text-lg font-black
                  uppercase leading-tight
                  text-white
                ">
                  {entity.nom} {entity.prenoms}
                </h4>
              </div>

              {isStudent ? (
                <div className="
                  space-y-1.5
                  text-xs text-primary-100
                ">
                  <p className="
                    flex items-center gap-1.5
                  ">
                    <School className="
                      h-3.5 w-3.5
                      shrink-0 text-emerald-300
                    " />

                    <span className="truncate">
                      Classe :
                      <strong className="ml-1 text-white">
                        {student?.classe_nom || 'Non affecté'}
                      </strong>
                    </span>
                  </p>

                  <p className="
                    flex items-center gap-1.5
                  ">
                    <User className="
                      h-3.5 w-3.5
                      shrink-0 text-emerald-300
                    " />

                    <span>
                      {student?.sexe === 'M'
                        ? 'Masculin'
                        : 'Féminin'}
                    </span>

                    {student?.date_naissance && (
                      <span className="ml-1 truncate">
                        • {student.date_naissance}
                      </span>
                    )}
                  </p>

                  {student?.parent_tel && (
                    <p className="
                      flex items-center gap-1.5
                      truncate
                    ">
                      <Phone className="
                        h-3.5 w-3.5
                        shrink-0 text-emerald-300
                      " />

                      <span className="truncate">
                        {student.parent_tel}
                      </span>
                    </p>
                  )}

                  <div className="
                    flex items-center gap-2 pt-0.5
                  ">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        student?.statut === 'SOLDE'
                          ? 'bg-emerald-400 text-emerald-950'
                          : student?.statut === 'CREDIT'
                            ? 'bg-blue-300 text-blue-950'
                            : 'bg-amber-300 text-amber-950'
                      }`}
                    >
                      {student?.statut === 'SOLDE'
                        ? 'SOLDÉ'
                        : student?.statut === 'CREDIT'
                          ? 'CRÉDIT'
                          : 'NON SOLDÉ'}
                    </span>

                    <span className="
                      truncate text-[10px]
                      text-primary-200
                    ">
                      Reste :
                      <strong className="ml-1 text-white">
                        {fmt(resteAPayer)} FCFA
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="
                  space-y-1.5
                  text-xs text-primary-100
                ">
                  <p className="
                    flex items-center gap-1.5
                  ">
                    <User className="
                      h-3.5 w-3.5
                      text-emerald-300
                    " />

                    <span>
                      Poste :
                      <strong className="ml-1 text-white">
                        {staff?.poste || 'Personnel'}
                      </strong>
                    </span>
                  </p>

                  {staff?.telephone && (
                    <p className="
                      flex items-center gap-1.5
                    ">
                      <Phone className="
                        h-3.5 w-3.5
                        text-emerald-300
                      " />

                      <span>
                        {staff.telephone}
                      </span>
                    </p>
                  )}

                  {staff?.date_embauche && (
                    <p className="text-[10px] text-primary-200">
                      Embauché le :
                      <strong className="ml-1 text-white">
                        {fmtDateShort(staff.date_embauche)}
                      </strong>
                    </p>
                  )}

                  <div className="pt-0.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        staff?.actif
                          ? 'bg-emerald-400 text-emerald-950'
                          : 'bg-red-400 text-red-950'
                      }`}
                    >
                      {staff?.actif ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* QR */}
            <div className="
              flex shrink-0
              flex-col items-center
              justify-center
            ">
              <div className="
                rounded-2xl
                border-2 border-emerald-300
                bg-white p-2
                shadow-xl
              ">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="
                      block h-24 w-24
                      rounded-lg
                      object-contain
                    "
                  />
                ) : (
                  <div className="
                    flex h-24 w-24
                    flex-col items-center
                    justify-center
                    gap-2
                  ">
                    <QrIcon className="
                      h-8 w-8
                      animate-pulse
                      text-primary-700
                    " />

                    <span className="
                      text-[9px]
                      font-mono
                      text-primary-700
                    ">
                      Génération…
                    </span>
                  </div>
                )}
              </div>

              <p className="
                mt-1.5 text-center
                text-[9px] font-bold
                uppercase tracking-wider
                text-emerald-200
              ">
                Scannez pour vérifier
              </p>
            </div>
          </div>

          {/* Pied */}
          <div className="
            relative z-10 mt-4
            flex items-center
            justify-between
            border-t border-white/10
            pt-2
            text-[9px]
            text-primary-300
          ">
            <span>
              Carte officielle d'identité
            </span>

            <span>
              {settings?.ville || 'Divo'}, Côte d'Ivoire
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            ACTIONS
            ═══════════════════════════════════════ */}
        <div className="space-y-3">

          <div className="
            flex flex-wrap gap-2
          ">
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadQr}
              disabled={!qrDataUrl}
              title={
                !qrDataUrl
                  ? 'QR en cours de génération…'
                  : 'Télécharger le QR code'
              }
            >
              Télécharger QR (.png)
            </Button>

            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrintBadge}
              disabled={!qrDataUrl}
              title={
                !qrDataUrl
                  ? 'QR en cours de génération…'
                  : 'Imprimer le badge 86×54 mm'
              }
            >
              Imprimer badge
            </Button>

            <Button
              variant="secondary"
              icon={
                copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              onClick={copyTextInfo}
            >
              {copied ? 'Copié !' : 'Copier infos'}
            </Button>
          </div>

          {/* Contact */}
          <div className="
            flex flex-wrap
            items-center
            justify-between
            gap-2
            border-t border-gray-100
            pt-3
            dark:border-gray-700
          ">
            {hasTel ? (
              <div className="
                flex items-center gap-2
              ">
                <span className="
                  text-xs font-medium
                  text-gray-400
                ">
                  Contacter :
                </span>

                <button
                  onClick={handleSendSMS}
                  title="Ouvrir l'app SMS avec le message pré-rempli"
                  className="
                    inline-flex items-center gap-1.5
                    rounded-xl
                    border border-blue-200
                    bg-blue-50
                    px-3 py-1.5
                    text-xs font-semibold
                    text-blue-700
                    transition-colors
                    hover:bg-blue-100
                  "
                >
                  <Phone className="h-3.5 w-3.5" />
                  Envoyer SMS
                </button>

                <button
                  onClick={handleWhatsApp}
                  title="Ouvrir WhatsApp avec le message pré-rempli"
                  className="
                    inline-flex items-center gap-1.5
                    rounded-xl
                    border border-emerald-200
                    bg-emerald-50
                    px-3 py-1.5
                    text-xs font-semibold
                    text-emerald-700
                    transition-colors
                    hover:bg-emerald-100
                  "
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            ) : (
              <span className="
                text-xs italic
                text-gray-400
              ">
                Aucun numéro de téléphone renseigné
              </span>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
