import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmt, fmtDateShort } from '@/lib/utils'
import { Download, Printer, Copy, Check, QrCode as QrIcon, User, School, Phone, CreditCard } from 'lucide-react'
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

  // Génération du texte enrichi pour le scan QR
  const qrContent = React.useMemo(() => {
    if (student) {
      return JSON.stringify({
        type: 'student',
        id: student.id,
        matricule: student.matricule,
        nom: student.nom,
        prenoms: student.prenoms,
        classe: student.classe_nom || 'Non assigné',
        sexe: student.sexe,
        date_naissance: student.date_naissance || '',
        parent: student.parent_nom || '',
        parent_tel: student.parent_tel || '',
        statut: student.statut,
        total_du: student.total_du,
        total_paye: student.total_paye,
        reste: student.total_du - student.total_paye,
        token: student.token,
        school: settings?.school_name || 'CSE DIVO',
        annee: settings?.annee_scolaire || '',
      })
    } else if (staff) {
      return JSON.stringify({
        type: 'staff',
        id: staff.id,
        matricule: staff.matricule || 'PER',
        nom: staff.nom,
        prenoms: staff.prenoms,
        poste: staff.poste || 'Personnel',
        telephone: staff.telephone || '',
        salaire_base: staff.salaire_base,
        date_embauche: staff.date_embauche || '',
        actif: staff.actif,
        school: settings?.school_name || 'CSE DIVO',
        annee: settings?.annee_scolaire || '',
      })
    }
    return ''
  }, [student, staff, settings])

  useEffect(() => {
    if (!open || !qrContent) return
    QRCode.toDataURL(qrContent, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f5132',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => {
        console.error('Erreur génération QR Code', err)
      })
  }, [open, qrContent])

  if (!entity) return null

  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    const safeMatricule = (isStudent ? student?.matricule : staff?.matricule) || 'qr'
    a.download = `QR_${safeMatricule}.png`
    a.click()
    toast.success('QR Code téléchargé.')
  }

  function copyTextInfo() {
    let text = ''
    if (student) {
      text = `=== FICHE ÉLÈVE — ${settings?.school_name || 'CSE DIVO'} ===\n` +
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
      text = `=== FICHE PERSONNEL — ${settings?.school_name || 'CSE DIVO'} ===\n` +
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

  function handlePrintBadge() {
    if (!entity) return
    const school = settings?.school_name || 'CSE DIVO'
    const sigle = settings?.sigle || 'CSE'
    const annee = settings?.annee_scolaire || ''
    const matricule = isStudent ? student?.matricule : (staff?.matricule || 'PER')
    const nomComplet = `${entity.nom} ${entity.prenoms}`
    const sousTitre = isStudent ? `Classe : ${student?.classe_nom || 'Non affecté'}` : `Poste : ${staff?.poste || 'Personnel'}`
    const photoUrl = isStudent ? student?.photo : undefined
    const statutBadge = isStudent
      ? (student?.statut === 'SOLDE' ? 'SOLDÉ' : student?.statut === 'CREDIT' ? 'CRÉDIT' : 'NON SOLDÉ')
      : (staff?.actif ? 'ACTIF' : 'INACTIF')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.open()
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Badge — ${nomComplet}</title>
  <style>
    @page { size: 86mm 54mm landscape; margin: 0; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #eee; }
    .badge-card { width: 85mm; height: 53mm; background: #ffffff; border-radius: 6mm; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1.5px solid #0f5132; padding: 3.5mm 4mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
    .badge-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f5132; padding-bottom: 1.5mm; }
    .school-title { font-size: 11px; font-weight: 800; color: #0f5132; text-transform: uppercase; letter-spacing: 0.5px; }
    .school-sigle { font-size: 9px; font-weight: bold; color: #666; }
    .badge-body { display: flex; align-items: center; gap: 3mm; flex: 1; padding: 1.5mm 0; }
    .photo-img { width: 20mm; height: 24mm; object-fit: cover; border-radius: 2.5mm; border: 1px solid #0f5132; background: #f0f7f2; }
    .photo-placeholder { width: 20mm; height: 24mm; border-radius: 2.5mm; border: 1px dashed #0f5132; background: #e8f5e9; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #0f5132; }
    .qr-img { width: 22mm; height: 22mm; border: 1px solid #0f5132; border-radius: 2.5mm; padding: 0.5mm; background: #fff; }
    .info-col { flex: 1; min-width: 0; }
    .name { font-size: 11.5px; font-weight: bold; color: #111; margin-bottom: 0.5mm; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mat { font-size: 9.5px; font-family: monospace; font-weight: bold; color: #0f5132; background: #e8f5e9; padding: 1px 4px; border-radius: 2px; display: inline-block; margin-bottom: 0.5mm; }
    .meta { font-size: 8.5px; color: #444; margin-bottom: 0.5mm; }
    .badge-status { display: inline-block; font-size: 7.5px; font-weight: bold; padding: 1px 4px; border-radius: 2mm; background: #0f5132; color: #fff; margin-top: 0.5mm; }
    .badge-footer { display: flex; justify-content: space-between; align-items: center; font-size: 7px; color: #777; border-top: 1px solid #eee; padding-top: 1mm; }
    @media print {
      body { background: transparent; }
      .badge-card { box-shadow: none; border: 1px solid #0f5132; }
    }
  </style>
</head>
<body>
  <div class="badge-card">
    <div class="badge-header">
      <div class="school-title">${school}</div>
      <div class="school-sigle">${sigle} • ${annee}</div>
    </div>
    <div class="badge-body">
      ${photoUrl ? `<img class="photo-img" src="${photoUrl}" alt="Photo" />` : `<div class="photo-placeholder">${entity.nom.charAt(0)}${entity.prenoms.charAt(0)}</div>`}
      <div class="info-col">
        <div class="mat">${matricule}</div>
        <div class="name">${nomComplet}</div>
        <div class="meta">${sousTitre}</div>
        ${isStudent && student?.parent_tel ? `<div class="meta">Urg: ${student.parent_tel}</div>` : ''}
        ${!isStudent && staff?.telephone ? `<div class="meta">Tél: ${staff.telephone}</div>` : ''}
        <div><span class="badge-status">${statutBadge}</span></div>
      </div>
      <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
    </div>
    <div class="badge-footer">
      <span>CARTE OFFICIELLE D'IDENTITÉ</span>
      <span>Scannez pour vérifier l'authenticité</span>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isStudent ? "Badge Scolaire & Code QR" : "Badge Professionnel & Code QR"}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Carte / Badge Scolaire Visuel */}
        <div
          ref={printRef}
          className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-primary-700/50 overflow-hidden"
        >
          {/* Filigrane d'arrière-plan */}
          <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none text-9xl">
            🏫
          </div>

          {/* En-tête du badge */}
          <div className="flex items-start justify-between border-b border-primary-600/60 pb-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary-200 font-semibold">
                {settings?.school_name || 'CSE DIVO'}
              </p>
              <h3 className="text-sm font-bold text-white">
                {isStudent ? 'CARTE SCOLAIRE D’IDENTITÉ' : 'CARTE PROFESSIONNELLE'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-full border border-white/20 text-primary-100">
                {settings?.annee_scolaire || '2025-2026'}
              </span>
            </div>
          </div>

          {/* Corps du badge avec Photo d'identité et Code QR */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Photo d'identité de l'élève */}
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

            {/* Informations détaillées */}
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

            {/* Code QR généré */}
            <div className="bg-white p-2 rounded-2xl shadow-md border-2 border-primary-400 shrink-0">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 rounded-lg object-contain" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-gray-400">
                  <QrIcon className="h-8 w-8 animate-pulse text-primary-700" />
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadQr}
            >
              Télécharger QR (.png)
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrintBadge}
            >
              Imprimer le badge
            </Button>
            <Button
              variant="secondary"
              icon={copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              onClick={copyTextInfo}
            >
              {copied ? 'Copié !' : 'Copier'}
            </Button>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  )
}
