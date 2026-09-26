import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { api, ApiError } from '@/lib/apiClient'
import { fmt, fmtDate } from '@/lib/utils'
import { Search, Plus, Ban, Printer, FileText, CheckCircle2, QrCode as QrIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormFields'
import QRCode from 'qrcode'
import logoCse from '@/assets/logo_cse.png'
import toast from 'react-hot-toast'
import type { Payment } from '@/types'

export default function Payments() {
  const { payments, students, settings, hasPerm, loadAll } = useAppStore()
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('Espèces')
  const [reference, setReference] = useState('')
  const [allowCredit, setAllowCredit] = useState(false)
  const [motif, setMotif] = useState('Scolarité')
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Receipt preview modal
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null)
  const [receiptQrDataUrl, setReceiptQrDataUrl] = useState('')

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return p.student_nom?.toLowerCase().includes(q)
      || p.student_matricule?.toLowerCase().includes(q)
      || p.recu_numero?.toLowerCase().includes(q)
      || p.motif?.toLowerCase().includes(q)
      || (p.reference && p.reference.toLowerCase().includes(q))
  })

  const selectedStudent = students.find(s => s.id === studentId)

  // Generate QR Code for receipt verification
  useEffect(() => {
    if (!receiptPayment) {
      setReceiptQrDataUrl('')
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const baseUrl = `${origin}${pathname}`

    const payload = {
      t: 'recu',
      r: receiptPayment.recu_numero,
      m: receiptPayment.student_matricule,
      n: receiptPayment.student_nom,
      c: receiptPayment.classe_nom || '',
      v: receiptPayment.montant,
      d: receiptPayment.date,
      mode: receiptPayment.mode,
      ref: receiptPayment.reference || '',
      school: settings?.school_name || 'CSE DIVO',
      code: settings?.code_etablissement || '01757',
    }

    const verifyUrl = `${baseUrl}?verify=${encodeURIComponent(JSON.stringify(payload))}`
    QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
      .then(url => setReceiptQrDataUrl(url))
      .catch(() => setReceiptQrDataUrl(''))
  }, [receiptPayment, settings])

  function openModal() {
    setStudentId('')
    setAmount('')
    setMode('Espèces')
    setReference('')
    setAllowCredit(false)
    setMotif('Scolarité')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montant = Number(amount)
    if (!studentId) { toast.error('Sélectionnez un élève.'); return }
    if (!montant || montant <= 0) { toast.error('Montant invalide.'); return }

    const electronicModes = ['ORANGE MONEY', 'MTN MONEY', 'MOOV MONEY', 'WAVE', 'VIREMENT BANCAIRE', 'CHÈQUE']
    const isElectronic = electronicModes.some(m => m.toLowerCase() === mode.toLowerCase())
    if (isElectronic && !reference.trim()) {
      toast.error(`La référence / numéro de transaction est obligatoire pour ${mode}.`)
      return
    }

    setSaving(true)
    try {
      const res: any = await api.post('/api/payments', {
        student_id: studentId,
        montant,
        mode,
        reference: reference.trim() || undefined,
        motif,
        allow_credit: allowCredit,
      })
      toast.success('Paiement enregistré.')
      setModalOpen(false)
      await loadAll()
      // Open receipt immediately
      if (res && res.recu_numero) {
        setReceiptPayment(res)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Annuler ce paiement ? Le solde de l’élève sera recalculé.')) return
    setCancellingId(id)
    try {
      await api.post(`/api/payments/${id}/annuler`)
      toast.success('Paiement annulé.')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Paiements & Reçus ({payments.length})
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestion des encaissements, références électroniques et reçus officiels avec QR Code.
          </p>
        </div>

        {hasPerm('pay') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openModal}>
            Nouveau paiement
          </Button>
        )}
      </div>

      <div className="relative w-64">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher paiement, reçu, élève…"
          className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Reçu N°</th>
              <th className="px-4 py-3 text-left font-medium">Élève</th>
              <th className="px-4 py-3 text-left font-medium">Classe</th>
              <th className="px-4 py-3 text-left font-medium">Motif</th>
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              <th className="px-4 py-3 text-left font-medium">Mode & Réf.</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-center font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aucun paiement trouvé</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${p.annule ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700 dark:text-primary-400">
                  {p.recu_numero}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <div>{p.student_nom}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{p.student_matricule}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.classe_nom ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.motif}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(p.montant)} F
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <div className="font-medium text-xs">{p.mode}</div>
                  {p.reference && (
                    <div className="text-[10px] text-gray-400 font-mono">Réf: {p.reference}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.date)}</td>
                <td className="px-4 py-3 text-center">
                  {p.annule
                    ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-semibold">Annulé</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Validé</span>
                  }
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setReceiptPayment(p)}
                      title="Voir / Imprimer le reçu officiel avec QR"
                      className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    {hasPerm('pay') && !p.annule && (
                      <button
                        onClick={() => handleCancel(p.id)}
                        disabled={cancellingId === p.id}
                        title="Annuler ce paiement"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nouveau Paiement */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Encaisser un paiement" maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Élève *"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            options={[
              { value: '', label: 'Sélectionner un élève…' },
              ...students.filter(s => s.actif).map(s => ({
                value: s.id,
                label: `${s.matricule} — ${s.nom} ${s.prenoms} (${s.classe_nom || 'Sans classe'})`
              }))
            ]}
            required
            autoFocus
          />
          {selectedStudent && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs space-y-1 border">
              <div className="flex justify-between">
                <span className="text-gray-500">Statut :</span>
                <span className="font-bold text-primary-600">
                  {selectedStudent.student_type === 'AFFECTE_ETAT' ? 'Affecté de l\'État' : 'Non-Affecté'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Dû :</span>
                <span className="font-semibold">{fmt(selectedStudent.total_du)} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total déjà versé :</span>
                <span className="font-semibold text-emerald-600">{fmt(selectedStudent.total_paye)} FCFA</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-bold text-gray-700 dark:text-gray-300">Reste à payer :</span>
                <span className="font-black text-rose-600">{fmt(selectedStudent.total_du - selectedStudent.total_paye)} FCFA</span>
              </div>
            </div>
          )}

          <Input
            label="Montant du versement (FCFA) *"
            type="number"
            min={1}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />

          <Select
            label="Mode de paiement *"
            value={mode}
            onChange={e => setMode(e.target.value)}
            options={[
              'Espèces',
              'Orange Money',
              'MTN Money',
              'Moov Money',
              'Wave',
              'Virement bancaire',
              'Chèque'
            ]}
          />

          {['orange money', 'mtn money', 'moov money', 'wave', 'virement bancaire', 'chèque'].includes(mode.toLowerCase()) && (
            <Input
              label="Référence / N° de transaction *"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Ex : CI260926.1432.A84920"
              required
            />
          )}

          <Input label="Motif" value={motif} onChange={e => setMotif(e.target.value)} />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="creditCheckbox"
              checked={allowCredit}
              onChange={e => setAllowCredit(e.target.checked)}
              className="rounded text-primary-600"
            />
            <label htmlFor="creditCheckbox" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Autoriser le trop-perçu (génère un solde créditeur)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Encaisser et Éditer le Reçu</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Reçu Officiel de Paiement avec QR */}
      {receiptPayment && (
        <Modal
          open={!!receiptPayment}
          onClose={() => setReceiptPayment(null)}
          title={`Reçu Officiel de Paiement N° ${receiptPayment.recu_numero}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div id="payment-receipt-print" className="p-5 bg-white rounded-xl border border-gray-300 text-gray-900 space-y-3 font-sans shadow-sm">
              {/* Entête */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <img src={logoCse} alt="Logo" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="font-black text-sm text-red-900 tracking-tight">
                      {settings?.school_name || 'COURS SECONDAIRE ELITES DIVO'}
                    </h2>
                    <p className="text-[10px] text-gray-500">
                      Code Établissement : <strong>{settings?.code_etablissement || '01757'}</strong> • Ville : {settings?.ville || 'Divo'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Année Scolaire : <strong>{settings?.annee_scolaire || '2026-2027'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-red-800 font-mono">{receiptPayment.recu_numero}</div>
                  <div className="text-[10px] text-gray-400">{fmtDate(receiptPayment.date)}</div>
                </div>
              </div>

              {/* Titre */}
              <div className="text-center py-1 bg-red-50 rounded font-black text-sm text-red-900 uppercase tracking-wider">
                REÇU DE VERSEMENT — {receiptPayment.motif || 'SCOLARITÉ'}
              </div>

              {/* Détails Élève */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded border">
                <div>
                  <span className="text-gray-500">Élève :</span> <strong>{receiptPayment.student_nom}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Matricule :</span> <strong className="font-mono">{receiptPayment.student_matricule}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Classe :</span> <strong>{receiptPayment.classe_nom || 'Non spécifiée'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Statut :</span> <strong>{receiptPayment.student_type === 'AFFECTE_ETAT' ? 'Affecté État' : 'Non-Affecté'}</strong>
                </div>
              </div>

              {/* Tableau financier du versement */}
              <div className="border rounded overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody>
                    <tr className="border-b bg-gray-50/50">
                      <td className="p-2 text-gray-600">Solde dû avant versement :</td>
                      <td className="p-2 text-right font-medium">{fmt(receiptPayment.ancien_solde ?? receiptPayment.total_du_apres ?? 0)} FCFA</td>
                    </tr>
                    <tr className="border-b bg-emerald-50/60 font-bold text-emerald-900">
                      <td className="p-2">MONTANT VERSÉ CE JOUR :</td>
                      <td className="p-2 text-right text-sm font-black text-emerald-700">{fmt(receiptPayment.montant)} FCFA</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="p-2 text-gray-600">Nouveau solde restant :</td>
                      <td className="p-2 text-right font-bold text-rose-600">
                        {fmt(receiptPayment.nouveau_solde ?? Math.max(0, (receiptPayment.total_du_apres ?? 0) - (receiptPayment.total_paye_apres ?? 0)))} FCFA
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mode de règlement & Référence */}
              <div className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border">
                <div>
                  <span className="text-gray-500">Mode :</span> <strong>{receiptPayment.mode}</strong>
                  {receiptPayment.reference && (
                    <span className="ml-2 font-mono text-[11px] text-gray-600">Réf : {receiptPayment.reference}</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Caissier(ère) :</span> <strong>{receiptPayment.caissiere}</strong>
                </div>
              </div>

              {/* QR Code et signature */}
              <div className="flex items-center justify-between pt-2 border-t text-[10px] text-gray-500">
                <div className="flex items-center gap-2">
                  {receiptQrDataUrl ? (
                    <img src={receiptQrDataUrl} alt="QR Reçu" className="w-16 h-16 border rounded" />
                  ) : (
                    <div className="w-16 h-16 border rounded flex items-center justify-center">
                      <QrIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-700">Vérification QR officielle</p>
                    <p>Scannez pour authentifier ce reçu</p>
                  </div>
                </div>

                <div className="text-center font-sans">
                  <p className="font-bold text-gray-800 text-xs">Cachet et Signature</p>
                  <div className="h-10"></div>
                  <p className="text-[9px] text-gray-400">Pour la Direction</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setReceiptPayment(null)}>
                Fermer
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800 text-white font-bold"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Imprimer le reçu
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
