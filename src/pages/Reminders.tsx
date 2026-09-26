import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, cn } from '@/lib/utils'
import {
  findTuitionSchedule, computeFinancialAccount, buildReminderMessage
} from '@/lib/tuitionEngine'
import type {
  PaymentReminder, ReminderChannel, ReminderStatus,
  ReminderMotif, Student
} from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import {
  Bell, Send, MessageCircle, Phone, Mail, Printer, AlertTriangle,
  Search, Filter, Plus, CheckCircle, Clock, CheckCheck, RefreshCw,
  ExternalLink, User
} from 'lucide-react'

export default function Reminders() {
  const {
    students, classes, settings, tuitionSchedules,
    paymentReminders, hasPerm, refreshTable
  } = useAppStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState<string>('ALL')

  const [newReminderOpen, setNewReminderOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [channel, setChannel] = useState<ReminderChannel>('WHATSAPP')
  const [motif, setMotif] = useState<ReminderMotif>('SCOLARITE_IMPAYEE')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Print modal
  const [printReminder, setPrintReminder] = useState<PaymentReminder | null>(null)

  const annee = settings?.annee_scolaire || '2026-2027'

  // Pre-calculate accounts for non-soldés
  const unpaidStudents = useMemo(() => {
    return students
      .filter(s => s.actif && (s.total_du - s.total_paye) > 0)
      .sort((a, b) => `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr'))
  }, [students])

  // When a student is selected in create modal, auto-fill message
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    const st = students.find(s => s.id === studentId)
    if (!st) {
      setMessage('')
      return
    }
    const sched = findTuitionSchedule(tuitionSchedules, st.student_type || 'AFFECTE_ETAT', st.classe_nom || '', annee)
    const acc = computeFinancialAccount(st, sched, paymentReminders, annee)
    setMotif(acc.montant_echu > 0 ? 'ECHEANCE_DEPASSEE' : 'SCOLARITE_IMPAYEE')
    setMessage(buildReminderMessage(acc, settings?.school_name, settings?.code_etablissement))
  }

  // Submit reminder
  const handleCreateReminder = async () => {
    if (!selectedStudentId) {
      alert("Veuillez sélectionner un élève.")
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/students/${selectedStudentId}/reminders`, {
        channel,
        motif,
        message,
      })
      await refreshTable('payment_reminders')
      setNewReminderOpen(false)
      setSelectedStudentId('')
      setMessage('')
      alert("Relance enregistrée avec succès !")
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'enregistrement de la relance.")
    } finally {
      setLoading(false)
    }
  }

  // Update status
  const handleStatusChange = async (id: string, newStatus: ReminderStatus) => {
    try {
      await api.put(`/api/payment-reminders/${id}/status`, { status: newStatus })
      await refreshTable('payment_reminders')
    } catch (e: any) {
      alert(e.message || "Erreur lors de la mise à jour du statut.")
    }
  }

  // Filtered reminders
  const filteredReminders = useMemo(() => {
    return paymentReminders.filter(r => {
      const q = searchTerm.toLowerCase().trim()
      const matchSearch =
        !q ||
        r.student_nom.toLowerCase().includes(q) ||
        r.student_matricule.toLowerCase().includes(q) ||
        (r.parent_nom && r.parent_nom.toLowerCase().includes(q)) ||
        (r.parent_tel && r.parent_tel.includes(q))

      const matchChannel = channelFilter === 'ALL' || r.channel === channelFilter
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchClass = classFilter === 'ALL' || r.classe_nom === classFilter

      return matchSearch && matchChannel && matchStatus && matchClass
    })
  }, [paymentReminders, searchTerm, channelFilter, statusFilter, classFilter])

  // Helper for WhatsApp link
  const getWhatsAppLink = (tel?: string, msg = '') => {
    if (!tel) return '#'
    // Clean phone number (strip spaces, dashes, add +225 if local 10 digits)
    let clean = tel.replace(/[^0-9]/g, '')
    if (clean.length === 10) clean = '225' + clean
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-red-600" />
            Centre des Relances Parents ({paymentReminders.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion multicanale (WhatsApp, SMS, Appels, Courriers) avec calcul automatique des soldes restant réels.
          </p>
        </div>

        {hasPerm('pay') && (
          <Button
            className="bg-red-700 hover:bg-red-800 text-white font-bold"
            onClick={() => {
              setSelectedStudentId('')
              setMessage('')
              setNewReminderOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle Relance
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500">Total Relances</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{paymentReminders.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Toutes sessions confondues</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500">Via WhatsApp</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {paymentReminders.filter(r => r.channel === 'WHATSAPP').length}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Canal prioritaire</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500">Élèves Non Soldés</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{unpaidStudents.length}</p>
          <p className="text-[11px] text-purple-500 mt-0.5">Éligibles à relance</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500">Relances Délivrées / Lues</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {paymentReminders.filter(r => r.status === 'DELIVREE' || r.status === 'LUE').length}
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">Suivi de réception</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher relance (élève, matricule, parent)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
        </div>

        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
        >
          <option value="ALL">Tous les canaux</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="SMS">SMS</option>
          <option value="APPEL">Appel</option>
          <option value="IMPRESSION">Courrier imprimé</option>
          <option value="EMAIL">Email</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
        >
          <option value="ALL">Tous les états</option>
          <option value="ENVOYEE">Envoyée</option>
          <option value="DELIVREE">Délivrée</option>
          <option value="LUE">Lue</option>
          <option value="BROUILLON">Brouillon</option>
        </select>

        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
        >
          <option value="ALL">Toutes les classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.nom}>{c.nom}</option>
          ))}
        </select>
      </div>

      {/* Reminders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Date & Auteur</th>
                <th className="py-3 px-4">Élève & Classe</th>
                <th className="py-3 px-4">Parent & Contact</th>
                <th className="py-3 px-4 text-center">Canal</th>
                <th className="py-3 px-4 text-right">Reste Notifié</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    Aucune relance enregistrée correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredReminders.map(rem => (
                  <tr key={rem.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white text-xs">
                        {fmtDate(rem.created_at)}
                      </div>
                      <div className="text-[11px] text-gray-400">Par {rem.created_by}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">{rem.student_nom}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {rem.student_matricule} • {rem.classe_nom}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {rem.parent_nom || 'Non spécifié'}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {rem.parent_tel || 'Aucun tél'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {rem.channel === 'WHATSAPP' && <MessageCircle className="h-3 w-3 text-emerald-500" />}
                        {rem.channel === 'SMS' && <Phone className="h-3 w-3 text-blue-500" />}
                        {rem.channel === 'APPEL' && <Phone className="h-3 w-3 text-amber-500" />}
                        {rem.channel === 'IMPRESSION' && <Printer className="h-3 w-3 text-purple-500" />}
                        {rem.channel === 'EMAIL' && <Mail className="h-3 w-3 text-rose-500" />}
                        {rem.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-rose-600 dark:text-rose-400">
                        {fmt(rem.amount_due_at_reminder)} F
                      </div>
                      {rem.overdue_amount > 0 && (
                        <div className="text-[10px] text-rose-500 font-medium">
                          dont {fmt(rem.overdue_amount)} F échus
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={rem.status}
                        onChange={e => handleStatusChange(rem.id, e.target.value as ReminderStatus)}
                        className="text-xs rounded font-semibold bg-gray-50 dark:bg-gray-900 border border-gray-200 px-2 py-1"
                      >
                        <option value="ENVOYEE">Envoyée</option>
                        <option value="DELIVREE">Délivrée</option>
                        <option value="LUE">Lue</option>
                        <option value="BROUILLON">Brouillon</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {rem.channel === 'WHATSAPP' && rem.parent_tel && (
                          <a
                            href={getWhatsAppLink(rem.parent_tel, rem.message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                            title="Ouvrir dans WhatsApp"
                          >
                            <ExternalLink className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={() => setPrintReminder(rem)}
                          title="Imprimer le courrier officiel de relance"
                        >
                          <Printer className="h-3 w-3 mr-1" /> Imprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouvelle Relance */}
      {newReminderOpen && (
        <Modal
          open={newReminderOpen}
          onClose={() => setNewReminderOpen(false)}
          title="Émettre une nouvelle relance parent"
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sélectionner l'élève débiteur *
              </label>
              <select
                value={selectedStudentId}
                onChange={e => handleStudentSelect(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
              >
                <option value="">-- Choisir un élève non soldé --</option>
                {unpaidStudents.map(s => {
                  const reste = s.total_du - s.total_paye
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nom} {s.prenoms} ({s.matricule}) — {s.classe_nom} [Reste: {fmt(reste)} F]
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Canal de transmission
                </label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value as ReminderChannel)}
                  className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS Direct</option>
                  <option value="APPEL">Appel Téléphonique</option>
                  <option value="IMPRESSION">Courrier Officiel Imprimé</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Motif de la relance
                </label>
                <select
                  value={motif}
                  onChange={e => setMotif(e.target.value as ReminderMotif)}
                  className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
                >
                  <option value="SCOLARITE_IMPAYEE">Scolarité impayée</option>
                  <option value="ECHEANCE_DEPASSEE">Échéance dépassée</option>
                  <option value="PAIEMENT_PARTIEL">Solde partiel à compléter</option>
                  <option value="SOLDE_GENERAL">Rappel général de fin d'année</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contenu du message généré
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Le message sera généré automatiquement lors de la sélection de l'élève..."
                className="w-full text-xs font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" onClick={() => setNewReminderOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800 text-white font-bold"
                onClick={handleCreateReminder}
                disabled={loading || !selectedStudentId}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {loading ? 'Enregistrement...' : 'Enregistrer la relance'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Impression Lettre Officielle de Relance */}
      {printReminder && (
        <Modal
          open={!!printReminder}
          onClose={() => setPrintReminder(null)}
          title="Lettre officielle d'avertissement et de relance"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div id="official-reminder-letter" className="bg-white p-6 rounded-xl border border-gray-300 text-gray-900 space-y-4 font-serif">
              {/* Entête CSE Divo */}
              <div className="flex justify-between items-start border-b-2 border-red-900 pb-3">
                <div>
                  <div className="text-xs uppercase font-bold tracking-wider text-red-900">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
                  <div className="text-[10px] text-gray-500">Union – Discipline – Travail</div>
                  <div className="text-base font-black text-red-900 mt-1">{settings?.school_name || 'COURS SECONDAIRE ELITES DIVO'}</div>
                  <div className="text-xs text-gray-600 font-sans">Code établissement : {settings?.code_etablissement || '01757'} • {settings?.ville || 'Divo'}</div>
                </div>
                <div className="text-right font-sans text-xs">
                  <div>Année scolaire : <strong>{annee}</strong></div>
                  <div>Date : {fmtDate(printReminder.created_at)}</div>
                </div>
              </div>

              {/* Destinataire */}
              <div className="bg-gray-50 p-3 rounded border text-xs font-sans">
                <div><strong>Destinataire :</strong> M. / Mme {printReminder.parent_nom || 'le Responsable légal'}</div>
                <div><strong>Élève :</strong> {printReminder.student_nom} (Matricule : {printReminder.student_matricule})</div>
                <div><strong>Classe :</strong> {printReminder.classe_nom}</div>
                <div><strong>Contact :</strong> {printReminder.parent_tel || 'Non renseigné'}</div>
              </div>

              {/* Objet */}
              <div className="font-bold text-sm text-red-900 underline font-sans">
                OBJET : AVIS DE RAPPEL DE PAIEMENT DE LA SCOLARITÉ ({annee})
              </div>

              {/* Corps */}
              <div className="text-xs leading-relaxed space-y-2">
                <p>Madame, Monsieur,</p>
                <p>
                  Sauf erreur ou omission de nos services comptables, l'état financier de votre enfant <strong>{printReminder.student_nom}</strong> présente à ce jour un solde impayé de :
                </p>
                <div className="p-3 bg-red-50 border border-red-200 rounded text-center my-2 font-sans">
                  <span className="text-xl font-black text-red-800">{fmt(printReminder.amount_due_at_reminder)} FCFA</span>
                  {printReminder.overdue_amount > 0 && (
                    <div className="text-xs text-red-600 font-bold mt-0.5">
                      dont {fmt(printReminder.overdue_amount)} FCFA d'échéances déjà échues.
                    </div>
                  )}
                </div>
                <p>
                  Nous vous prions de bien vouloir vous présenter au service de la comptabilité de l'établissement sous huitaine afin de régulariser cette situation et éviter toute interruption pédagogique.
                </p>
                <p>
                  Comptant sur votre franche collaboration pour le suivi des études de votre enfant, veuillez agréer, Madame, Monsieur, nos salutations distinguées.
                </p>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end pt-6 font-sans text-xs">
                <div className="text-gray-500">
                  Document officiel généré par le moteur financier CSE Divo.
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm">La Direction / L'Économe</div>
                  <div className="h-14"></div>
                  <div className="text-[11px] text-gray-500">(Cachet et signature)</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPrintReminder(null)}>
                Fermer
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800 text-white font-bold"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Imprimer le document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
