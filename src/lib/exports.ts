import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { fmt, todayKey } from './utils'
import type { Settings, Student } from '@/types'

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

// ---- Export Excel des élèves d'une classe ----
export function exportClassStudentsXLSX(
  classeNom: string,
  students: Student[],
  anneeScolaire?: string
) {
  const safeName = (classeNom || 'classe').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `eleves_${safeName}_${anneeScolaire || todayKey()}.xlsx`
  const headers = [
    'N°',
    'Matricule',
    'Nom',
    'Prénoms',
    'Sexe',
    'Classe',
    'Date de Naissance',
    'Parent / Tuteur',
    'Téléphone Parent',
    'Total Dû (FCFA)',
    'Total Payé (FCFA)',
    'Reste à Payer (FCFA)',
    'Statut',
  ]
  const rows = students.map((s, idx) => [
    idx + 1,
    s.matricule,
    s.nom,
    s.prenoms,
    s.sexe,
    s.classe_nom || classeNom,
    s.date_naissance || '',
    s.parent_nom || '',
    s.parent_tel || '',
    s.total_du,
    s.total_paye,
    s.total_du - s.total_paye,
    s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé',
  ])
  exportToXLSX(filename, `Classe ${classeNom}`.slice(0, 31), headers, rows)
}

// ---- Export PDF officiel des élèves d'une classe ----
export function exportClassStudentsPDF(
  classeNom: string,
  students: Student[],
  settings?: Partial<Settings>
) {
  const safeName = (classeNom || 'classe').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `eleves_${safeName}_${settings?.annee_scolaire || todayKey()}.pdf`
  const doc = new jsPDF({ orientation: 'landscape' })

  const school = settings?.school_name ?? 'CSE DIVO'
  const sigle = settings?.sigle ?? 'CSE DIVO'
  const annee = settings?.annee_scolaire ?? ''

  // En-tête
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(school.toUpperCase(), 14, 14)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Établissement : ${sigle} | Année Scolaire : ${annee}`, 14, 20)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 81, 50)
  doc.text(`LISTE OFFICIELLE DES ÉLÈVES INSCRITS — CLASSE : ${classeNom.toUpperCase()}`, 14, 28)
  doc.setTextColor(0)

  const nbGarcons = students.filter(s => s.sexe === 'M').length
  const nbFilles = students.filter(s => s.sexe === 'F').length
  const totalAttendu = students.reduce((a, s) => a + s.total_du, 0)
  const totalPaye = students.reduce((a, s) => a + s.total_paye, 0)
  const totalReste = totalAttendu - totalPaye

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Effectif total : ${students.length} élève(s) (${nbGarcons} Garçon(s), ${nbFilles} Fille(s)) — Total attendu : ${fmt(totalAttendu)} — Encaissé : ${fmt(totalPaye)} — Reste : ${fmt(totalReste)}`,
    14,
    34
  )

  const headers = ['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Né(e) le', 'Parent / Tuteur', 'Contact Parent', 'Total Dû', 'Payé', 'Reste', 'Statut']
  const rows = students.map((s, idx) => [
    idx + 1,
    s.matricule,
    `${s.nom} ${s.prenoms}`,
    s.sexe,
    s.date_naissance ? s.date_naissance : '—',
    s.parent_nom || '—',
    s.parent_tel || '—',
    fmt(s.total_du),
    fmt(s.total_paye),
    fmt(s.total_du - s.total_paye),
    s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé',
  ])

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 38,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 81, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, font: 'courier' },
      2: { cellWidth: 50 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 22 },
      5: { cellWidth: 35 },
      6: { cellWidth: 26 },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { cellWidth: 22, halign: 'center' },
    },
  })

  // Pied de page
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(130)
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — Page ${i} / ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    )
  }

  doc.save(filename)
}

// ---- Impression élégante de la liste des élèves d'une classe ----
export function printClassStudents(
  classeNom: string,
  students: Student[],
  settings?: Partial<Settings>
) {
  const school = settings?.school_name ?? 'CSE DIVO'
  const sigle = settings?.sigle ?? 'CSE DIVO'
  const ville = settings?.ville ?? 'Divo'
  const annee = settings?.annee_scolaire ?? ''
  const tel = settings?.telephone ?? ''
  const nbGarcons = students.filter(s => s.sexe === 'M').length
  const nbFilles = students.filter(s => s.sexe === 'F').length
  const totalAttendu = students.reduce((a, s) => a + s.total_du, 0)
  const totalPaye = students.reduce((a, s) => a + s.total_paye, 0)
  const totalReste = totalAttendu - totalPaye

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Liste des Élèves — ${classeNom}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 15px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f5132; padding-bottom: 8px; margin-bottom: 12px; }
    .school-name { font-size: 16px; font-weight: bold; color: #0f5132; }
    .school-sub { font-size: 10px; color: #555; }
    .title { text-align: center; margin: 12px 0 8px 0; }
    .title h1 { font-size: 15px; margin: 0; text-transform: uppercase; color: #0f5132; }
    .title p { margin: 3px 0 0 0; font-size: 11px; color: #444; }
    .stats-bar { display: flex; justify-content: space-between; background: #f0f7f2; border: 1px solid #d1e7dd; padding: 6px 12px; border-radius: 4px; font-size: 11px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5px; }
    th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; }
    th { background: #0f5132; color: #fff; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    tr:nth-child(even) { background-color: #f9fbf9; }
    .center { text-align: center; }
    .right { text-align: right; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; }
    .badge-solde { background: #d1e7dd; color: #0f5132; }
    .badge-non { background: #f8d7da; color: #842029; }
    .badge-credit { background: #cff4fc; color: #055160; }
    .footer { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 10px; font-size: 10px; page-break-inside: avoid; }
    .sign { width: 220px; text-align: center; padding-top: 45px; border-top: 1px dashed #777; font-weight: 500; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="school-name">${school} (${sigle})</div>
      <div class="school-sub">${ville} ${tel ? '• Tél: ' + tel : ''}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div class="school-sub">Année Scolaire : ${annee}</div>
    </div>
  </div>

  <div class="title">
    <h1>Liste Officielle des Élèves Inscrits</h1>
    <p><strong>Classe : ${classeNom}</strong> — Date d'édition : ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>

  <div class="stats-bar">
    <span><strong>Effectif :</strong> ${students.length} (${nbGarcons} Garçon(s), ${nbFilles} Fille(s))</span>
    <span><strong>Attendu :</strong> ${fmt(totalAttendu)}</span>
    <span><strong>Payé :</strong> ${fmt(totalPaye)}</span>
    <span><strong>Reste :</strong> ${fmt(totalReste)}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 25px;">N°</th>
        <th style="width: 85px;">Matricule</th>
        <th>Nom & Prénoms</th>
        <th class="center" style="width: 35px;">Sexe</th>
        <th>Né(e) le</th>
        <th>Parent / Tuteur</th>
        <th>Contact</th>
        <th class="right">Total Dû</th>
        <th class="right">Payé</th>
        <th class="center">Statut</th>
        <th class="center" style="width: 80px;">Émargement</th>
      </tr>
    </thead>
    <tbody>
      ${students.length === 0 ? '<tr><td colspan="11" class="center" style="padding: 20px;">Aucun élève inscrit dans cette classe</td></tr>' : ''}
      ${students.map((s, idx) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold;">${s.matricule}</td>
          <td><strong>${s.nom}</strong> ${s.prenoms}</td>
          <td class="center">${s.sexe}</td>
          <td>${s.date_naissance || '—'}</td>
          <td>${s.parent_nom || '—'}</td>
          <td>${s.parent_tel || '—'}</td>
          <td class="right">${fmt(s.total_du)}</td>
          <td class="right">${fmt(s.total_paye)}</td>
          <td class="center">
            <span class="badge ${s.statut === 'SOLDE' ? 'badge-solde' : s.statut === 'CREDIT' ? 'badge-credit' : 'badge-non'}">
              ${s.statut === 'SOLDE' ? 'Soldé' : s.statut === 'CREDIT' ? 'Crédit' : 'Non soldé'}
            </span>
          </td>
          <td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Fait à ${ville}, le ${new Date().toLocaleDateString('fr-FR')}</div>
    <div class="sign">
      La Direction / Le Chef d'Établissement
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
