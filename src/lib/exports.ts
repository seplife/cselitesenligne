import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { fmt, todayKey } from './utils'
import type { Settings } from '@/types'

// ---- CSV / Excel ----
export function exportToXLSX(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((_, i) => {
    const maxLen = Math.max(
      headers[i].length,
      ...rows.map((r) => String(r[i] ?? '').length)
    )
    return { wch: Math.min(Math.max(maxLen + 2, 10), 45) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}

// ---- PDF ----
export function exportToPDF(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  settings?: Partial<Settings>
) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(13)
  doc.text(settings?.school_name ?? 'CSE DIVO', 14, 15)
  doc.setFontSize(10)
  doc.text(title, 14, 22)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    'Généré le ' + new Date().toLocaleString('fr-FR') + ' — Année scolaire ' + (settings?.annee_scolaire ?? ''),
    14,
    28
  )
  doc.setTextColor(0)

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ''))),
    startY: 34,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 81, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
  })

  doc.save(filename)
}

// ---- Rapport mensuel PDF ----
export interface MonthlyReportData {
  settings: Partial<Settings>
  totalDu: number
  totalPaye: number
  reste: number
  taux: number
  impayes: number
  recettesMois: number
  depensesMois: number
  salairesMois: number
  vacatairesMois: number
  lastClosure?: { date: string; solde: number }
  ecartsCount: number
}

export function exportMonthlyReportPDF(data: MonthlyReportData) {
  const { jsPDF: PDF } = { jsPDF }
  const doc = new PDF()
  const s = data.settings
  const month = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })

  doc.setFontSize(14)
  doc.text(s.school_name ?? 'CSE DIVO', 14, 16)
  doc.setFontSize(11)
  doc.text('RAPPORT FINANCIER MENSUEL', 14, 24)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Mois : ' + month + ' — Généré le ' + new Date().toLocaleString('fr-FR'), 14, 30)
  doc.setTextColor(0)

  let y = 42
  const line = (label: string, val: string | number) => {
    doc.setFontSize(10)
    doc.text(String(label), 14, y)
    doc.text(String(val), 140, y)
    y += 7
  }

  doc.setFontSize(11)
  doc.text('1. Scolarité', 14, y)
  y += 7
  line('Total attendu (année)', fmt(data.totalDu))
  line('Total encaissé (année)', fmt(data.totalPaye))
  line('Reste à encaisser', fmt(data.reste))
  line('Taux de recouvrement', data.taux.toFixed(1) + ' %')
  line('Élèves non soldés', data.impayes)

  y += 3
  doc.setFontSize(11)
  doc.text('2. Recettes & Dépenses (mois en cours)', 14, y)
  y += 7
  line('Recettes du mois', fmt(data.recettesMois))
  line('Dépenses payées du mois', fmt(data.depensesMois))

  y += 3
  doc.setFontSize(11)
  doc.text('3. Masse salariale (mois en cours)', 14, y)
  y += 7
  line('Personnel permanent payé', fmt(data.salairesMois))
  line('Vacataires payés', fmt(data.vacatairesMois))
  line('Total masse salariale', fmt(data.salairesMois + data.vacatairesMois))

  y += 3
  doc.setFontSize(11)
  doc.text('4. Caisse', 14, y)
  y += 7
  line(
    'Dernière clôture',
    data.lastClosure ? data.lastClosure.date + ' — ' + fmt(data.lastClosure.solde) : 'Aucune clôture'
  )
  line('Clôtures avec écart', data.ecartsCount)

  doc.save('rapport_financier_' + todayKey().slice(0, 7) + '.pdf')
}
