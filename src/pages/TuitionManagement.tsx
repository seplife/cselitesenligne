import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { api } from '@/lib/apiClient'
import { fmt, cn } from '@/lib/utils'
import {
  computeFinancialAccount,
  computeInstallments,
  buildReminderMessage,
  findTuitionSchedule
} from '@/lib/tuitionEngine'
import type {
  TuitionSchedule, Student, StudentType, StudentStatut,
  ReminderChannel, ReminderMotif, StudentFinancialAccount, Installment
} from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import {
  ReceiptText, DollarSign, AlertCircle, CheckCircle2, Clock, Users,
  Send, Plus, Search, Filter, RefreshCw, FileText, ArrowRight, Download,
  Phone, Calendar, AlertTriangle, ShieldCheck, Printer
} from 'lucide-react'

export default function TuitionManagement() {
  const {
    students, classes, settings, tuitionSchedules,
    paymentReminders, hasPerm, loadAll, refreshTable
  } = useAppStore()

  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'accounts' | 'overdue' | 'reports'>('accounts')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<TuitionSchedule | null>(null)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatut, setSelectedStatut] = useState<string>('ALL')
  const [loadingAction, setLoadingAction] = useState(false)

  // Reminder form state
  const [reminderStudent, setReminderStudent] = useState<Student | null>(null)
  const [reminderChannel, setReminderChannel] = useState<ReminderChannel>('WHATSAPP')
  const [reminderMessage, setReminderMessage] = useState('')
  const [bulkChannel, setBulkChannel] = useState<ReminderChannel>('WHATSAPP')
  const [bulkClassFilter, setBulkClassFilter] = useState('ALL')
  const [bulkOnlyOverdue, setBulkOnlyOverdue] = useState(true)

  const annee = settings?.annee_scolaire || '2026-2027'

  // Precompute financial accounts for all active students
  const accounts: StudentFinancialAccount[] = useMemo(() => {
    return students
      .filter(s => s.actif)
      .map(s => {
        const schedule = findTuitionSchedule(tuitionSchedules, s.student_type || 'AFFECTE_ETAT', s.classe_nom || '', annee)
        return computeFinancialAccount(s, schedule, paymentReminders, annee)
      })
  }, [students, tuitionSchedules, paymentReminders, annee])

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalAttendu = accounts.reduce((acc, a) => acc + a.total_du, 0)
    const totalEncaisse = accounts.reduce((acc, a) => acc + a.total_paye, 0)
    const totalRestant = accounts.reduce((acc, a) => acc + a.reste, 0)
    const totalEchu = accounts.reduce((acc, a) => acc + a.montant_echu, 0)
    const soldesCount = accounts.filter(a => a.reste === 0).length
    const overdueCount = accounts.filter(a => a.montant_echu > 0).length
    const taux = totalAttendu > 0 ? Math.round((totalEncaisse / totalAttendu) * 10000) / 100 : 100

    return { totalAttendu, totalEncaisse, totalRestant, totalEchu, soldesCount, overdueCount, taux }
  }, [accounts])

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      const q = searchTerm.toLowerCase().trim()
      const matchSearch =
        !q ||
        a.student_nom.toLowerCase().includes(q) ||
        a.student_matricule.toLowerCase().includes(q) ||
        (a.classe_nom && a.classe_nom.toLowerCase().includes(q))

      const matchClass = selectedClass === 'ALL' || a.classe_nom === selectedClass
      const matchType = selectedType === 'ALL' || a.student_type === selectedType

      let matchStatut = true
      if (selectedStatut === 'SOLDE') matchStatut = a.reste === 0
      else if (selectedStatut === 'NON_SOLDE') matchStatut = a.reste > 0 && a.total_paye === 0
      else if (selectedStatut === 'PARTIEL') matchStatut = a.reste > 0 && a.total_paye > 0
      else if (selectedStatut === 'EN_RETARD') matchStatut = a.montant_echu > 0
      else if (selectedStatut === 'CREDIT') matchStatut = a.statut === 'CREDIT'

      return matchSearch && matchClass && matchType && matchStatut
    }).sort((a, b) => a.student_nom.localeCompare(b.student_nom, 'fr', { sensitivity: 'base' }))
  }, [accounts, searchTerm, selectedClass, selectedType, selectedStatut])

  // Overdue accounts only
  const overdueAccounts = useMemo(() => {
    return accounts.filter(a => a.montant_echu > 0).sort((a, b) => b.montant_echu - a.montant_echu)
  }, [accounts])

  // Handle single reminder open
  const handleOpenReminder = (student: Student) => {
    const acc = accounts.find(a => a.student_id === student.id)
    if (!acc) return
    setReminderStudent(student)
    setReminderChannel('WHATSAPP')
    setReminderMessage(buildReminderMessage(acc, settings?.school_name, settings?.code_etablissement))
    setReminderModalOpen(true)
  }

  // Submit single reminder
  const handleSendReminder = async () => {
    if (!reminderStudent) return
    setLoadingAction(true)
    try {
      await api.post(`/api/students/${reminderStudent.id}/reminders`, {
        channel: reminderChannel,
        message: reminderMessage,
      })
      await refreshTable('payment_reminders')
      setReminderModalOpen(false)
      alert(`Relance transmise avec succès via ${reminderChannel} !`)
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'envoi de la relance.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Submit bulk reminders
  const handleSendBulkReminders = async () => {
    setLoadingAction(true)
    try {
      const res: any = await api.post('/api/reminders/bulk', {
        channel: bulkChannel,
        classe_nom: bulkClassFilter === 'ALL' ? undefined : bulkClassFilter,
        statut: bulkOnlyOverdue ? 'EN_RETARD' : 'ALL',
      })
      await refreshTable('payment_reminders')
      setBulkReminderOpen(false)
      alert(`${res.count || 0} relance(s) générée(s) avec succès !`)
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la relance groupée.')
    } finally {
      setLoadingAction(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Matricule', 'Nom & Prénoms', 'Classe', 'Statut', 'Scolarité Dûe', 'Total Payé', 'Reste à Payer', 'Montant Échu', 'Statut Financier']
    const rows = filteredAccounts.map(a => [
      a.student_matricule,
      `"${a.student_nom}"`,
      a.classe_nom,
      a.student_type === 'AFFECTE_ETAT' ? 'Affecté État' : 'Non-Affecté',
      a.total_du,
      a.total_paye,
      a.reste,
      a.montant_echu,
      a.statut
    ])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `scolarites_cse_divo_${annee}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ── Entête & Titre officiel ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-900 to-rose-950 p-6 rounded-2xl text-white shadow-xl border border-red-800">
        <div>
          <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <ReceiptText className="h-4 w-4" />
            <span>Moteur Financier Scolarités 2026-2027</span>
            <span className="bg-rose-800/80 px-2 py-0.5 rounded text-[11px] font-mono text-white">Code Établissement : {settings?.code_etablissement || '01757'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{settings?.school_name || 'COURS SECONDAIRE ELITES DIVO'}</h1>
          <p className="text-rose-200/90 text-sm mt-1">
            Barème officiel, échéanciers calculés, ventilation FIFO des versements et suivi des relances parents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exporter CSV
          </Button>
          {hasPerm('pay') && (
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md"
              onClick={() => setBulkReminderOpen(true)}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Relance Groupée
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Attendu</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{fmt(stats.totalAttendu)} <span className="text-xs text-gray-500">F</span></p>
          <p className="text-[11px] text-gray-400 mt-1">{accounts.length} élèves actifs</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Encaissé</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(stats.totalEncaisse)} <span className="text-xs text-gray-500">F</span></p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">{stats.taux}% recouvré</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reste à Recouvrer</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{fmt(stats.totalRestant)} <span className="text-xs text-gray-500">F</span></p>
          <p className="text-[11px] text-gray-400 mt-1">Sur l'exercice {annee}</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-rose-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Échéances Échues</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{fmt(stats.totalEchu)} <span className="text-xs text-gray-500">F</span></p>
          <p className="text-[11px] text-rose-500 font-semibold mt-1">{stats.overdueCount} élève(s) en retard</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-indigo-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Élèves Soldés</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.soldesCount} <span className="text-xs text-gray-500">/ {accounts.length}</span></p>
          <p className="text-[11px] text-indigo-500 font-semibold mt-1">{accounts.length > 0 ? Math.round((stats.soldesCount / accounts.length) * 100) : 0}% soldés</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Relances Déjà Faites</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{paymentReminders.length}</p>
          <p className="text-[11px] text-purple-500 font-semibold mt-1">Multi-canaux</p>
        </Card>
      </div>

      {/* ── Onglets principaux ── */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={cn(
            'py-2.5 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
            activeSubTab === 'accounts'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          <Users className="h-4 w-4" />
          Comptes & Échéanciers ({accounts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('overdue')}
          className={cn(
            'py-2.5 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
            activeSubTab === 'overdue'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          <AlertCircle className="h-4 w-4 text-rose-500" />
          Impayés & Retards ({overdueAccounts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('schedules')}
          className={cn(
            'py-2.5 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
            activeSubTab === 'schedules'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          <ReceiptText className="h-4 w-4" />
          Barèmes Officiels ({tuitionSchedules.length})
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={cn(
            'py-2.5 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
            activeSubTab === 'reports'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          <FileText className="h-4 w-4" />
          Rapports de Recouvrement
        </button>
      </div>

      {/* ── SOUS-ONGLET 1: COMPTES & ÉCHÉANCIERS ÉLÈVES ── */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filtres de recherche */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher élève (nom, matricule, classe)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.nom}>{c.nom}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
            >
              <option value="ALL">Tous les statuts d'affectation</option>
              <option value="AFFECTE_ETAT">Affecté de l'État</option>
              <option value="NON_AFFECTE">Non-Affecté</option>
            </select>

            <select
              value={selectedStatut}
              onChange={e => setSelectedStatut(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5"
            >
              <option value="ALL">Tous les statuts financiers</option>
              <option value="SOLDE">Soldé (Reste = 0)</option>
              <option value="EN_RETARD">En retard (Échéance dépassée)</option>
              <option value="PARTIEL">Partiellement payé</option>
              <option value="NON_SOLDE">Non soldé (0 F versé)</option>
              <option value="CREDIT">Crédit (Trop-perçu)</option>
            </select>
          </div>

          {/* Tableau des comptes financiers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Élève</th>
                    <th className="py-3 px-4">Statut Élève</th>
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4 text-right">Scolarité Dûe</th>
                    <th className="py-3 px-4 text-right">Total Versé</th>
                    <th className="py-3 px-4 text-right">Reste à Payer</th>
                    <th className="py-3 px-4">Progression</th>
                    <th className="py-3 px-4">État Financier</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        Aucun compte financier correspondant aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map(account => {
                      const st = students.find(s => s.id === account.student_id)
                      return (
                        <tr key={account.student_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white">{account.student_nom}</div>
                            <div className="text-xs text-gray-400 font-mono">{account.student_matricule}</div>
                          </td>
                          <td className="py-3 px-4">
                            {account.student_type === 'AFFECTE_ETAT' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                Affecté État
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                Non-Affecté
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                            {account.classe_nom}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                            {fmt(account.total_du)} F
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {fmt(account.total_paye)} F
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                            {fmt(account.reste)} F
                          </td>
                          <td className="py-3 px-4 min-w-[130px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    account.pourcentage_paye >= 100 ? 'bg-emerald-500' : account.pourcentage_paye > 50 ? 'bg-blue-500' : 'bg-amber-500'
                                  )}
                                  style={{ width: `${Math.min(100, account.pourcentage_paye)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-9 text-right">
                                {account.pourcentage_paye}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {account.reste === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="h-3 w-3" /> SOLDÉ
                              </span>
                            ) : account.montant_echu > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="h-3 w-3" /> EN RETARD
                              </span>
                            ) : account.total_paye > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                <Clock className="h-3 w-3" /> PARTIEL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                                NON SOLDÉ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                                onClick={() => setSelectedStudent(st || null)}
                                title="Voir l'échéancier détaillé"
                              >
                                Échéancier
                              </Button>
                              {account.reste > 0 && hasPerm('pay') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                                  onClick={() => st && handleOpenReminder(st)}
                                  title="Envoyer une relance parent"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SOUS-ONGLET 2: IMPAYÉS & RETARDS ── */}
      {activeSubTab === 'overdue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200">Suivi des échéances échues</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {overdueAccounts.length} élève(s) ont au moins une tranche de scolarité dont la date limite est dépassée.
                </p>
              </div>
            </div>
            {hasPerm('pay') && overdueAccounts.length > 0 && (
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                onClick={() => {
                  setBulkOnlyOverdue(true)
                  setBulkReminderOpen(true)
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Relancer les {overdueAccounts.length} élèves en retard
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Élève & Matricule</th>
                  <th className="py-3 px-4">Classe & Statut</th>
                  <th className="py-3 px-4">Parent / Tuteur</th>
                  <th className="py-3 px-4 text-right">Reste Total</th>
                  <th className="py-3 px-4 text-right">Montant Échu</th>
                  <th className="py-3 px-4 text-center">Retard Max</th>
                  <th className="py-3 px-4 text-center">Relances Récentes</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {overdueAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-emerald-600 font-medium">
                      Félicitations ! Aucune échéance n'est actuellement en retard.
                    </td>
                  </tr>
                ) : (
                  overdueAccounts.map(account => {
                    const st = students.find(s => s.id === account.student_id)
                    return (
                      <tr key={account.student_id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 dark:text-white">{account.student_nom}</div>
                          <div className="text-xs text-gray-400 font-mono">{account.student_matricule}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-700 dark:text-gray-300">{account.classe_nom}</div>
                          <div className="text-xs text-gray-400">{account.student_type === 'AFFECTE_ETAT' ? 'Affecté État' : 'Non-Affecté'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium">{st?.parent_nom || 'Non renseigné'}</div>
                          {st?.parent_tel ? (
                            <a href={`tel:${st.parent_tel}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {st.parent_tel}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">Aucun numéro</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-700">
                          {fmt(account.reste)} F
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          {fmt(account.montant_echu)} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                            {account.retard_max_jours} jours
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs text-gray-500">
                            {account.nombre_relances > 0 ? `${account.nombre_relances} relance(s)` : 'Aucune'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {st && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => handleOpenReminder(st)}
                            >
                              <Send className="h-3 w-3 mr-1" /> Relancer
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SOUS-ONGLET 3: BARÈMES OFFICIELS 2026-2027 ── */}
      {activeSubTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Barème Officiel des Scolarités ({annee})</h2>
              <p className="text-xs text-gray-500">Conforme à la fiche officielle de renseignement de l'établissement</p>
            </div>
            {hasPerm('seeSettings') && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingSchedule({
                    id: '',
                    academic_year: annee,
                    student_type: 'AFFECTE_ETAT',
                    level_group: '6E_5E_4E',
                    label: '',
                    classes: [],
                    registration_fee: 30000,
                    october_due: 0,
                    november_due: 0,
                    december_due: 0,
                    january_due: 0,
                    total_amount: 30000,
                    currency: 'XOF',
                    is_active: true,
                    created_at: '',
                    updated_at: '',
                  })
                  setScheduleModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nouveau Barème
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section Affectés de l'État */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-blue-200">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-blue-900 dark:text-blue-300">Affectés de l'État (Barème Subventionné)</h3>
              </div>
              {tuitionSchedules
                .filter(s => s.student_type === 'AFFECTE_ETAT')
                .map(sched => (
                  <Card key={sched.id} className="p-4 border-l-4 border-l-blue-500 bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{sched.label}</h4>
                        <div className="text-xs text-gray-400 mt-0.5">Classes : {sched.classes.join(', ') || 'Toutes les classes du niveau'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">{fmt(sched.total_amount)} F</span>
                        <div className="text-[11px] text-gray-400">Total annuel</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-xs">
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Inscript.</div>
                        <div className="font-bold">{fmt(sched.registration_fee)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Octobre</div>
                        <div className="font-bold">{fmt(sched.october_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Novembre</div>
                        <div className="font-bold">{fmt(sched.november_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Décembre</div>
                        <div className="font-bold">{fmt(sched.december_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Janvier</div>
                        <div className="font-bold">{fmt(sched.january_due)} F</div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>

            {/* Section Non-Affectés */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-purple-200">
                <Users className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-purple-900 dark:text-purple-300">Non-Affectés (Barème Libre)</h3>
              </div>
              {tuitionSchedules
                .filter(s => s.student_type === 'NON_AFFECTE')
                .map(sched => (
                  <Card key={sched.id} className="p-4 border-l-4 border-l-purple-500 bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{sched.label}</h4>
                        <div className="text-xs text-gray-400 mt-0.5">Classes : {sched.classes.join(', ') || 'Toutes les classes du niveau'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-purple-600 dark:text-purple-400">{fmt(sched.total_amount)} F</span>
                        <div className="text-[11px] text-gray-400">Total annuel</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-xs">
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Inscript.</div>
                        <div className="font-bold">{fmt(sched.registration_fee)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Octobre</div>
                        <div className="font-bold">{fmt(sched.october_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Novembre</div>
                        <div className="font-bold">{fmt(sched.november_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Décembre</div>
                        <div className="font-bold">{fmt(sched.december_due)} F</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                        <div className="text-[10px] text-gray-400">Janvier</div>
                        <div className="font-bold">{fmt(sched.january_due)} F</div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SOUS-ONGLET 4: RAPPORTS DE RECOUVREMENT ── */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Synthèse par statut d'affectation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 bg-white dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Recouvrement — Affectés de l'État
              </h3>
              {(() => {
                const aff = accounts.filter(a => a.student_type === 'AFFECTE_ETAT')
                const du = aff.reduce((s, a) => s + a.total_du, 0)
                const paye = aff.reduce((s, a) => s + a.total_paye, 0)
                const reste = aff.reduce((s, a) => s + a.reste, 0)
                const tx = du > 0 ? Math.round((paye / du) * 10000) / 100 : 100
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Effectif total</span>
                      <span className="font-bold">{aff.length} élèves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant total dû</span>
                      <span className="font-bold">{fmt(du)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant encaissé</span>
                      <span className="font-bold text-emerald-600">{fmt(paye)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reste à recouvrer</span>
                      <span className="font-bold text-rose-600">{fmt(reste)} FCFA</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Taux de recouvrement</span>
                        <span>{tx}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, tx)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </Card>

            <Card className="p-5 bg-white dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-purple-600" />
                Recouvrement — Non-Affectés
              </h3>
              {(() => {
                const nonAff = accounts.filter(a => a.student_type === 'NON_AFFECTE')
                const du = nonAff.reduce((s, a) => s + a.total_du, 0)
                const paye = nonAff.reduce((s, a) => s + a.total_paye, 0)
                const reste = nonAff.reduce((s, a) => s + a.reste, 0)
                const tx = du > 0 ? Math.round((paye / du) * 10000) / 100 : 100
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Effectif total</span>
                      <span className="font-bold">{nonAff.length} élèves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant total dû</span>
                      <span className="font-bold">{fmt(du)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant encaissé</span>
                      <span className="font-bold text-emerald-600">{fmt(paye)} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reste à recouvrer</span>
                      <span className="font-bold text-rose-600">{fmt(reste)} FCFA</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Taux de recouvrement</span>
                        <span>{tx}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, tx)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </Card>
          </div>

          {/* Tableau par classe */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white">
              Performance de recouvrement par classe
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[650px]">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4 text-center">Effectif</th>
                    <th className="py-3 px-4 text-right">Attendu</th>
                    <th className="py-3 px-4 text-right">Encaissé</th>
                    <th className="py-3 px-4 text-right">Restant</th>
                    <th className="py-3 px-4 text-center">Soldés</th>
                    <th className="py-3 px-4">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {classes.map(c => {
                    const classAccs = accounts.filter(a => a.classe_nom === c.nom)
                    const du = classAccs.reduce((s, a) => s + a.total_du, 0)
                    const paye = classAccs.reduce((s, a) => s + a.total_paye, 0)
                    const reste = classAccs.reduce((s, a) => s + a.reste, 0)
                    const soldes = classAccs.filter(a => a.reste === 0).length
                    const tx = du > 0 ? Math.round((paye / du) * 10000) / 100 : 100
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{c.nom}</td>
                        <td className="py-3 px-4 text-center">{classAccs.length}</td>
                        <td className="py-3 px-4 text-right font-medium">{fmt(du)} F</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(paye)} F</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">{fmt(reste)} F</td>
                        <td className="py-3 px-4 text-center text-xs font-semibold">{soldes} / {classAccs.length}</td>
                        <td className="py-3 px-4 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div className="bg-red-600 h-full rounded-full" style={{ width: `${Math.min(100, tx)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tx}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: ÉCHÉANCIER DÉTAILLÉ DE L'ÉLÈVE ── */}
      {selectedStudent && (
        <Modal
          open={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Échéancier financier — ${selectedStudent.nom} ${selectedStudent.prenoms}`}
          maxWidth="2xl"
        >
          {(() => {
            const acc = accounts.find(a => a.student_id === selectedStudent.id)
            if (!acc) return null
            return (
              <div className="space-y-4">
                {/* Résumé de l'élève */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <div className="font-bold text-base text-gray-900 dark:text-white">
                      {selectedStudent.nom} {selectedStudent.prenoms}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      Matricule : {selectedStudent.matricule} • Classe : {selectedStudent.classe_nom}
                    </div>
                    <div className="text-xs text-blue-600 font-semibold mt-0.5">
                      Statut : {selectedStudent.student_type === 'AFFECTE_ETAT' ? 'Affecté de l\'État' : 'Non-Affecté'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Reste total à payer</div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {fmt(acc.reste)} FCFA
                    </div>
                  </div>
                </div>

                {/* Ventilation des tranches FIFO */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Détail des 5 échéances officielles ({annee})
                  </h4>
                  <div className="space-y-2">
                    {acc.installments.map(inst => (
                      <div
                        key={inst.id}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between transition-colors',
                          inst.statut === 'PAYE'
                            ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20'
                            : inst.statut === 'EN_RETARD'
                            ? 'bg-rose-50/60 border-rose-200 dark:bg-rose-950/20'
                            : 'bg-white dark:bg-gray-800 border-gray-200'
                        )}
                      >
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <span>{inst.label}</span>
                            {inst.statut === 'PAYE' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">SOLDÉ</span>
                            )}
                            {inst.statut === 'EN_RETARD' && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                                EN RETARD ({inst.retard_jours} j)
                              </span>
                            )}
                            {inst.statut === 'PARTIEL' && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">PARTIEL</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Date limite : <span className="font-semibold text-gray-600 dark:text-gray-300">{inst.due_date}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-gray-400">Prévu : <span className="font-medium text-gray-700">{fmt(inst.montant_prevu)} F</span></div>
                          <div className="text-xs text-emerald-600 font-semibold">Payé : {fmt(inst.montant_paye)} F</div>
                          <div className="text-sm font-bold text-rose-600">Reste : {fmt(inst.reste)} F</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
                    Fermer
                  </Button>
                  {acc.reste > 0 && hasPerm('pay') && (
                    <Button
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                      onClick={() => {
                        handleOpenReminder(selectedStudent)
                        setSelectedStudent(null)
                      }}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Relancer le parent
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}
        </Modal>
      )}

      {/* ── MODAL 2: ENVOI DE RELANCE INDIVIDUELLE ── */}
      {reminderModalOpen && reminderStudent && (
        <Modal
          open={reminderModalOpen}
          onClose={() => setReminderModalOpen(false)}
          title={`Envoyer une relance — ${reminderStudent.nom} ${reminderStudent.prenoms}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Canal de notification
              </label>
              <select
                value={reminderChannel}
                onChange={e => setReminderChannel(e.target.value as ReminderChannel)}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
              >
                <option value="WHATSAPP">WhatsApp (Recommandé)</option>
                <option value="SMS">SMS Direct</option>
                <option value="APPEL">Appel Téléphonique (Journalisation)</option>
                <option value="IMPRESSION">Courrier imprimé officiel</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
              <div><strong>Destinataire :</strong> {reminderStudent.parent_nom || 'Parent / Tuteur'}</div>
              <div><strong>Téléphone :</strong> {reminderStudent.parent_tel || 'Non renseigné'}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Message personnalisé
              </label>
              <textarea
                rows={6}
                value={reminderMessage}
                onChange={e => setReminderMessage(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setReminderModalOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800 text-white font-bold"
                onClick={handleSendReminder}
                disabled={loadingAction}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {loadingAction ? 'Envoi...' : 'Confirmer et Envoyer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: RELANCES GROUPÉES ── */}
      {bulkReminderOpen && (
        <Modal
          open={bulkReminderOpen}
          onClose={() => setBulkReminderOpen(false)}
          title="Campagne de relance groupée des parents"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Génère automatiquement les relances officielles avec le montant réellement restant et les échéances échues pour chaque élève.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Canal de diffusion
              </label>
              <select
                value={bulkChannel}
                onChange={e => setBulkChannel(e.target.value as ReminderChannel)}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS Direct</option>
                <option value="IMPRESSION">Fiches d'avertissement à imprimer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Filtrer par classe
              </label>
              <select
                value={bulkClassFilter}
                onChange={e => setBulkClassFilter(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
              >
                <option value="ALL">Toutes les classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.nom}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="overdueOnly"
                checked={bulkOnlyOverdue}
                onChange={e => setBulkOnlyOverdue(e.target.checked)}
                className="rounded text-red-600"
              />
              <label htmlFor="overdueOnly" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Uniquement les élèves ayant au moins une échéance dépassée
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" onClick={() => setBulkReminderOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800 text-white font-bold"
                onClick={handleSendBulkReminders}
                disabled={loadingAction}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {loadingAction ? 'Traitement en cours...' : 'Lancer la campagne'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
